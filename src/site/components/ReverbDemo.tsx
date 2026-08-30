import demoHtml from '../demos/reverb-home.html?raw';

export function ReverbDemo() {
  return <section class="detail-copy reverb-demo-section" aria-labelledby="reverb-ui-demo-title">
    <div class="reverb-demo-head">
      <div>
        <h2 id="reverb-ui-demo-title">UI demo</h2>
        <p>Interactive mock of Reverb's current Android interface.</p>
      </div>
      <span>Interactive</span>
    </div>
    <iframe
      class="reverb-demo-frame"
      title="Interactive Reverb UI demo"
      sandbox="allow-scripts"
      loading="lazy"
      srcdoc={demoHtml}
    />
  </section>;
}
