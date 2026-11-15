const ink = 'var(--site-fg)';
const line = 'var(--site-line)';
const muted = 'var(--site-muted)';
const accent = 'var(--site-accent-fg, var(--site-accent))';
const soft = 'var(--site-soft)';

const wave = [3, 5, 7, 4, 9, 16, 11, 6, 20, 32, 21, 15, 38, 48, 29, 19, 36, 24, 14, 8, 13, 24, 17, 8, 5, 10, 18, 11, 6, 3];
const bufferSamples = Array.from({ length: 48 }, (_, index) => {
  const angle = Math.PI + (index + 1) / 50 * Math.PI * 2;
  const amplitude = 5 + wave[index % wave.length] * .2;
  const inner = 58 - amplitude / 2;
  const outer = 58 + amplitude / 2;
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  return `M${(364 + x * inner).toFixed(1)} ${(90 + y * inner).toFixed(1)}L${(364 + x * outer).toFixed(1)} ${(90 + y * outer).toFixed(1)}`;
});
const recentBufferPath = bufferSamples.slice(0, 12).join('');
const retainedBufferPath = bufferSamples.slice(12).join('');

function ReverbVisual() {
  return <>
    <path d="M36 90h266" stroke={line}/>
    <g stroke={accent} stroke-width="3.5" stroke-linecap="round">
      {wave.map((height, index) => <path d={`M${40 + index * 8} ${90 - height}v${height * 2}`} opacity={index < 5 ? .3 : 1}/>)}
    </g>
    <path d="M284 90h17m-5-5 5 5-5 5" fill="none" stroke={accent}/>
    <circle cx="364" cy="90" r="58" fill="none" stroke={line}/>
    <g stroke-width="3.5">
      <path d={retainedBufferPath} stroke={ink} opacity=".38"/>
      <path d={recentBufferPath} stroke={accent}/>
    </g>
    <circle cx="306" cy="90" r="4" fill={accent}/>
    <path d="M364 50a40 40 0 1 1-40 40m-4 5 4-5 5 4" fill="none" stroke={line}/>
  </>;
}

const digitRows = [
  '00011222211000',
  '01233333333210',
  '02332111233320',
  '01210000233200',
  '00000002332000',
  '00000023320000',
  '00000233200000',
  '00002332000000',
  '00023320000000',
  '00233200000000',
  '01232000000000',
  '02321000000000',
  '01210000000000',
];
const digitPixels = digitRows.flatMap((row, y) => [...row].flatMap((value, x) => value === '0'
  ? []
  : [{ x: 48 + x * 10, y: 25 + y * 10, opacity: Number(value) / 3 }]));
const inferenceWidths = [11, 18, 10, 16, 8, 12, 9, 102, 15, 13];

function CnnVisual() {
  return <>
    <rect x="48" y="20" width="140" height="140" fill={soft}/>
    <g stroke={line} stroke-width=".5" opacity=".55">
      {Array.from({ length: 29 }, (_, index) => <path d={`M${48 + index * 5} 20v140M48 ${20 + index * 5}h140`}/>)}
    </g>
    <g fill={ink}>{digitPixels.map(pixel => <rect x={pixel.x} y={pixel.y} width="10" height="10" opacity={pixel.opacity}/>)}</g>
    <path d="M206 90h35m-5-5 5 5-5 5" fill="none" stroke={muted}/>
    <g fill="none" stroke={line}>
      <path d="M263 56v68m20-84v100m20-77v54"/>
      <path d="m263 56 20-16 20 23m-40 27 20-50m-20 84 20-34 20 27m-20-27 20-27m-40 27 20 50 20-23"/>
    </g>
    <g fill={ink}>
      {[56, 90, 124].map(y => <circle cx="263" cy={y} r="3"/>)}
      {[40, 90, 140].map(y => <circle cx="283" cy={y} r="3"/>)}
      {[63, 117].map(y => <circle cx="303" cy={y} r="3"/>)}
    </g>
    <g stroke-linecap="round" stroke-width="3">
      {inferenceWidths.map((width, index) => <path d={`M331 ${36 + index * 12}h${width}`} stroke={index === 7 ? accent : line}/>)}
    </g>
  </>;
}

function HtmlVisual() {
  return <>
    <g font-family="ui-monospace, monospace" font-size="19" fill={muted}>
      <text x="42" y="47">{'<article>'}</text>
      <text x="63" y="80" fill={ink}>{'<h1 />'}</text>
      <text x="63" y="113" fill={ink}>{'<p />'}</text>
      <text x="42" y="146">{'</article>'}</text>
    </g>
    <path d="M202 90h36m-5-5 5 5-5 5" fill="none" stroke={muted}/>
    <path d="M285 90h43V48h51m-51 42v42h51" fill="none" stroke={line} stroke-width="1.5"/>
    <rect x="266" y="71" width="38" height="38" rx="6" fill={soft} stroke={line}/>
    <path d="m282 82-7 8 7 8m6-16 7 8-7 8" fill="none" stroke={accent} stroke-width="2"/>
    <g fill="var(--site-bg)" stroke={line}>
      <rect x="379" y="32" width="60" height="32" rx="5"/>
      <rect x="379" y="116" width="60" height="32" rx="5"/>
    </g>
    <g fill={ink} font-family="ui-monospace, monospace" font-size="13" text-anchor="middle">
      <text x="409" y="53">h1</text>
      <text x="409" y="137">p</text>
    </g>
  </>;
}

function MemoryVisual() {
  return <>
    <path d="M48 45h384m-384-5v10m384-10v10M48 140h384" fill="none" stroke={line}/>
    <rect x="48" y="66" width="384" height="54" rx="5" fill={soft} stroke={line}/>
    <rect x="48" y="66" width="80" height="54" rx="5" fill={accent} opacity=".13"/>
    <g stroke={line}>
      <path d="M128 66v54m160-54v54"/>
      {Array.from({ length: 23 }, (_, index) => <path d={`M${64 + index * 16} 120v${index % 5 === 4 ? 9 : 5}`}/>)}
    </g>
    <g fill={ink} font-family="ui-monospace, monospace" font-size="15" text-anchor="middle">
      <text x="88" y="99">[0]</text>
      <text x="208" y="99">[1]</text>
      <text x="360" y="99">[2]</text>
    </g>
    <g fill={accent}>
      <circle cx="48" cy="45" r="3"/>
      <circle cx="128" cy="45" r="3"/>
      <circle cx="288" cy="45" r="3"/>
    </g>
  </>;
}

export function ProjectVisual(props: { href: string }) {
  return <svg class="project-visual-svg" width="480" height="180" viewBox="0 0 480 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    {props.href.includes('/reverb/') ? <ReverbVisual/>
      : props.href.includes('/cnn/') ? <CnnVisual/>
      : props.href.includes('/zhtml/') ? <HtmlVisual/>
      : <MemoryVisual/>}
  </svg>;
}
