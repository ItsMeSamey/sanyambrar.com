# Chain Reaction model export

`export.py` reproduces the full policy/value ONNX artifact from the sealed CRT release, then compares Torch and ONNX Runtime CPU inference across 72 cases: all nine configured board sizes (2x2 through 64x36), players 2 through 9, and varying batches. It writes the full parity report and five full board/input/output fixtures. The committed `export-parity.json` records the original CPU qualification; browser/WASM qualification is a separate integration check.

## Reproduce

Run from this website checkout with the existing CRT Python 3.13 environment (Torch 2.10.0+cu128, NumPy and safetensors already installed). Install export-only packages into an isolated target; the production environment remains unchanged:

```sh
mkdir -p .tmp/chain-model-deps
uv pip install --python /home/a/python/crt/.venv/bin/python \
  --target .tmp/chain-model-deps --no-deps \
  onnx==1.23.1 onnxruntime==1.30.0 onnxscript==0.7.2 onnx-ir==1.0.0 \
  flatbuffers==25.12.19 protobuf==7.36.2 ml-dtypes==0.6.0 \
  packaging==26.3 typing-extensions==4.16.0 sympy==1.14.0
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 \
  /home/a/python/crt/.venv/bin/python scripts/chain-model/export.py \
  --crt-root /home/a/python/crt --release f787b23 \
  --deps .tmp/chain-model-deps --output .tmp/chain-model-export
```

An interpreter with pip can use `python -m pip install --target ... --no-deps` with the same pins. The CRT environment itself has no pip module, so the example uses `uv pip`. `--deps` is optional when these packages are already available to the chosen interpreter. The output directory must be new. Choose a different `--output` for subsequent runs. The default is this website project's `.tmp/chain-model-export`; the script never replaces the shipped asset automatically.

Review `parity-report.json`, `fixtures.json`, and `chain-model-v7-epoch134-fp32.onnx` in the output directory before promoting an artifact. Exporter versions can affect serialized ONNX bytes; the numerical comparison and source/weight identity checks must pass even if bytes differ.

## Accepted identity and contract

- Release commit: `f787b238970c5802b4716deaa5b47aad9b5cfbff`, epoch 134, local ConvNeXt v7, 3,350,248 checkpoint parameters.
- Checkpoint SHA256: `abfa59f791d261febb5ed4917e87d0c427b8467a38940a4ea68b297d9b540a7a`.
- Source archive SHA256: `3efb0997303d44846273787d8ebeae970e1765bdacb992a25bd9dfe51ff0d004`.
- FP32 safetensors SHA256: `247629ae5ac509ef4177cce76df2109c1e7d31d8d4d93b92abe5d68ff79a01b3`.
- Original ONNX SHA256: `691f5a176b9835efee8f0760582f3f5f34f6d284582bb9839fa1d625f032e86e`, 13,762,454 bytes.

The script validates release files against `SEALED.json`, pins the accepted checkpoint and source archive independently, loads model/encoder code from that archive, and verifies exact checkpoint-to-safetensors tensor equality. Export uses unchanged FP32 weights, opset 18, no quantization, and embedded weights. Training-only auxiliary heads are omitted from inference outputs.

| Tensor | Type | Shape |
| --- | --- | --- |
| `features` | float32 | `[B,16,H,W]` |
| `player_meta` | float32 | `[B,9,3]` |
| `player_mask` | bool | `[B,9]` |
| `policy_logits` | float32 | `[B,H,W]` |
| `value_logits` | float32 | `[B,9]` |

Export shape bounds are B=1..64, H=2..64, W=2..36. Value outputs are raw logits in current-turn-relative player order. CPU assertions use absolute and relative tolerance 5e-4; original maximum absolute differences were 6.3181e-6 for policy and 4.7684e-6 for value. Full fixtures include 2x2/2p, 3x5/9p, 5x7/3p, 7x11/4p and 64x36/9p. The website's compact test fixture is maintained separately.

## Browser integration checks

`bun run check` includes the Python-derived rules/search unit fixtures and the actual browser inference and game-lifecycle tests. The browser WASM check uses four compact Torch golden batches; observed maximum absolute differences were 5.2452e-6 for policy and 3.3379e-6 for value.

`bun scripts/chain-model/check-browser.mjs` runs a separate seeded gameplay check using the site's normal model, search, and transition APIs. It owns port 4540 and a headless Brave browser, then closes both. Run it after other browser checks finish. The saved `browser-gameplay.json` records all moves: the model won 12 of 12 games against uniform random legal moves, with both player assignments on 4x4, 5x7, and 9x6 boards. Full four-candidate probes also passed on 30x30/6-player and transposed 6x9/2-player boards.

The recorded browser used WASM after WebGPU reported no available adapter. It verifies that fallback and the actual browser predictions; it does not qualify hardware WebGPU numerical behavior. These twelve games are an integration check, not a broad strength estimate. Elapsed times were collected on a busy shared host and are diagnostic only.
