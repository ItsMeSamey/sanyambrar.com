from pathlib import Path
import argparse, sys, json, hashlib, tarfile

CHECKPOINT_SHA256 = 'abfa59f791d261febb5ed4917e87d0c427b8467a38940a4ea68b297d9b540a7a'
SOURCE_SHA256 = '3efb0997303d44846273787d8ebeae970e1765bdacb992a25bd9dfe51ff0d004'
parser = argparse.ArgumentParser(description='Export the accepted epoch134 model and qualify CPU parity.')
parser.add_argument('--crt-root', type=Path, required=True)
parser.add_argument('--release', default='f787b23')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[2] / '.tmp/chain-model-export')
parser.add_argument('--deps', type=Path)
options = parser.parse_args()
release = options.crt_root.resolve() / '.exports' / options.release
OUT = options.output.resolve()
# A fresh directory prevents accidental replacement of shipped or reviewed artifacts.
OUT.mkdir(parents=True, exist_ok=False)
sealed = json.loads((release / 'SEALED.json').read_text())
def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()
for name in ['source.tar.gz', 'config.toml', 'model.json', 't4-checkpoint.pt', 'chain-model-fp32.safetensors']:
    if digest(release / name) != sealed['files'][name]:
        raise RuntimeError(f'Release hash mismatch: {name}')
if digest(release / 'source.tar.gz') != SOURCE_SHA256:
    raise RuntimeError('This exporter requires the accepted epoch134 source archive')
sys.path.insert(0, str(OUT / 'source/src'))
if options.deps:
    sys.path.insert(0, str(options.deps.resolve()))
with tarfile.open(release / 'source.tar.gz') as ar:
    ar.extractall(OUT/'source',filter='data')
import torch, numpy as np, onnx, onnxruntime as ort
from chainbot.config import load_config
from chainbot.model import build_model
from chainbot.features import encode_batch_tensors,degree_grid
from safetensors.torch import load_file
torch.set_num_threads(2)
torch.set_num_interop_threads(1)
cfg=load_config(release / 'config.toml')
model=build_model(cfg.model).eval()
checkpoint=release / 't4-checkpoint.pt'
if digest(checkpoint) != CHECKPOINT_SHA256:
    raise RuntimeError('Checkpoint is not the accepted epoch134 model')
state=load_file(str(release / 'chain-model-fp32.safetensors'))
payload=torch.load(checkpoint,map_location='cpu',weights_only=False)
if payload['epoch'] != 134 or state.keys() != payload['model'].keys() or not all(torch.equal(state[k],payload['model'][k].float()) for k in state):
    raise RuntimeError('Checkpoint and FP32 export tensors differ')
model.load_state_dict(state,strict=True)

def inputs(b,h,w,p,seed):
    rng=np.random.default_rng(seed)
    degree=degree_grid(h,w).reshape(1,-1)
    counts=rng.integers(0,4,size=(b,h*w),dtype=np.uint8)%degree
    owners=rng.integers(1,p+1,size=counts.shape,dtype=np.uint8)
    owners[counts==0]=0
    entered=np.ones((b,p),dtype=np.uint8)
    if seed%2: entered[:,-1]=0; owners[owners==p]=0; counts[owners==0]=0
    turns=np.arange(b,dtype=np.uint8)%p+1
    encoded=encode_batch_tensors(torch.from_numpy(counts),torch.from_numpy(owners),torch.from_numpy(entered),torch.from_numpy(turns),h,w,p)
    return (encoded.features,encoded.player_meta,encoded.player_mask),dict(counts=counts.tolist(),owners=owners.tolist(),entered=entered.tolist(),turns=turns.tolist(),rows=h,cols=w,players=p)
args,_=inputs(2,5,7,3,0)
B=torch.export.Dim('batch',min=1,max=64)
H=torch.export.Dim('rows',min=2,max=64)
W=torch.export.Dim('cols',min=2,max=36)
path=OUT/'chain-model-v7-epoch134-fp32.onnx'
torch.onnx.export(model,args,str(path),input_names=['features','player_meta','player_mask'],output_names=['policy_logits','value_logits'],dynamic_shapes=({0:B,2:H,3:W},{0:B},{0:B}),opset_version=18,dynamo=True,external_data=False,report=True,artifacts_dir=str(OUT))
graph=onnx.load(path)
onnx.checker.check_model(graph)
opts=ort.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
session=ort.InferenceSession(str(path),sess_options=opts,providers=['CPUExecutionProvider'])
cases=[];fixtures=[]
for h,w in [(2,2),(3,5),(5,7),(7,11),(11,17),(19,29),(31,35),(48,36),(64,36)]:
  for p in range(2,10):
    b=1 if h*w>400 else (1+(p%3))
    args,board=inputs(b,h,w,p,p+h)
    with torch.inference_mode(): expected=[x.numpy() for x in model(*args)]
    feeds={k:x.numpy() for k,x in zip(['features','player_meta','player_mask'],args)}
    actual=session.run(None,feeds)
    errors=[float(np.max(np.abs(x-y))) for x,y in zip(expected,actual)]
    for x,y in zip(expected,actual): np.testing.assert_allclose(x,y,atol=5e-4,rtol=5e-4)
    cases.append(dict(batch=b,rows=h,cols=w,players=p,policy_max_abs=errors[0],value_max_abs=errors[1]))
    if (h,w,p) in [(2,2,2),(3,5,9),(5,7,3),(7,11,4),(64,36,9)]:
      fixtures.append(dict(board=board,inputs={k:dict(shape=list(v.shape),dtype=str(v.dtype),data=v.reshape(-1).tolist()) for k,v in feeds.items()},outputs={k:dict(shape=list(v.shape),data=v.reshape(-1).tolist()) for k,v in zip(['policy_logits','value_logits'],expected)}))
report=dict(checkpoint_sha256=hashlib.sha256(checkpoint.read_bytes()).hexdigest(),onnx_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),onnx_bytes=path.stat().st_size,opset=18,torch=torch.__version__,onnx=onnx.__version__,onnxruntime=ort.__version__,exact_checkpoint_safetensors=True,atol=5e-4,rtol=5e-4,cases=cases,policy_max_abs=max(c['policy_max_abs'] for c in cases),value_max_abs=max(c['value_max_abs'] for c in cases),inputs=[dict(name=x.name,shape=x.shape,type=x.type) for x in session.get_inputs()],outputs=[dict(name=x.name,shape=x.shape,type=x.type) for x in session.get_outputs()],ops=sorted(set(x.op_type for x in graph.graph.node)))
report.update(release=options.release, production_commit=sealed['production_commit'], source_sha256=digest(release / 'source.tar.gz'), safetensors_sha256=digest(release / 'chain-model-fp32.safetensors'))
(OUT/'parity-report.json').write_text(json.dumps(report,indent=2)+'\n')
(OUT/'fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='cases'},indent=2))
