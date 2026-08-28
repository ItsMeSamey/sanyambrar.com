import { TopBar } from '../../shared/components/TopBar.tsx';
import { ChainBackMark, ChainLiveMark } from '../../shared/components/ChainLogo.tsx';
import { EngineBoundary } from '../../shared/components/EngineBoundary.tsx';
import { SettingsIcon } from '../../site/components/icons.tsx';

function Slider(props:{id:string;label:string;min:number;max:number}) {
  return <label class="game-settings-slider" for={props.id}>
    <span class="game-settings-slider-head"><span class="game-settings-slider-label">{props.label}</span><output id={`${props.id}-value`} class="game-settings-slider-value"/></span>
    <span class="game-range-shell"><span class="game-range-track" aria-hidden="true"><span class="game-range-fill"/></span><input id={props.id} type="range" min={props.min} max={props.max} step="1"/></span>
  </label>;
}

const ChainGameBack = () => <button id="chain-menu-button" class="chain-menu-button chain-pixel-back" type="button" role="link" aria-label="Back to Chain Reaction menu"><ChainBackMark/></button>;

export function ChainPage() {
  return <EngineBoundary label="Chain Reaction" load={() => import('./chain.ts')} mount={module => module.mountChain()}>
    <div class="chain-shell">
      <section id="chain-opening" class="chain-opening chain-view">
        <TopBar/>
        <div class="chain-opening-inner">
          <ChainLiveMark class="chain-opening-logo"/>
          <h1>Pick a board.</h1>
          <div class="chain-mode-grid">
            <article id="chain-resume-card" class="chain-mode-card chain-mode-card-primary">
              <span id="chain-resume-eyebrow" class="chain-mode-eyebrow">Current game</span>
              <h2 id="chain-resume-title">Continue</h2>
              <p id="chain-resume-copy">Saved board</p>
              <div id="chain-resume-spec" class="chain-mode-spec"/>
              <button id="chain-resume" class="chain-mode-action" type="button">Continue game</button>
            </article>
            <article class="chain-mode-card">
              <span class="chain-mode-eyebrow">Quick match</span>
              <h2>Classic</h2>
              <div class="chain-mode-spec">9 × 6 board<br/>1 enemy</div>
              <button id="chain-quick" class="chain-mode-action chain-mode-action-secondary" type="button">Start classic</button>
            </article>
            <article class="chain-mode-card">
              <span class="chain-mode-eyebrow">New board</span>
              <h2>Custom</h2>
              <div class="chain-preset-list">
                <button class="chain-preset" type="button" data-rows="7" data-cols="5" data-enemies="1">Compact · 7 × 5 · 1 enemy</button>
                <button class="chain-preset" type="button" data-rows="12" data-cols="8" data-enemies="2">Wide · 12 × 8 · 2 enemies</button>
                <button class="chain-preset" type="button" data-rows="16" data-cols="10" data-enemies="3">Large · 16 × 10 · 3 enemies</button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="chain-game" class="chain-view" hidden>
        <TopBar start={<ChainGameBack/>} contextClass="chain-topbar-context" context={<>
          <div id="chain-turn" class="chain-turn" aria-hidden="true">
            <span class="chain-turn-item"><span>YOU</span><span id="chain-you-swatch" class="chain-turn-swatch"/></span>
            <span class="chain-turn-item"><span>TURN</span><span id="chain-active-swatch" class="chain-turn-swatch"/></span>
          </div>
          <button id="chain-settings-button" class="game-settings-trigger chain-settings-trigger" type="button" aria-label="Settings" aria-expanded="false" aria-controls="chain-settings"><SettingsIcon/></button>
        </>}/>
        <aside id="chain-settings" class="game-settings-popover chain-settings" aria-hidden="true">
          <div class="game-settings-body">
            <div class="game-settings-section-title">BOARD</div>
            <Slider id="chain-rows" label="Rows" min={4} max={30}/>
            <Slider id="chain-cols" label="Columns" min={4} max={30}/>
            <Slider id="chain-enemies" label="Enemies" min={1} max={5}/>
            <div class="game-settings-actions"><button id="chain-new-game" class="game-settings-action" type="button">Start new game</button></div>
          </div>
        </aside>
        <main id="chain-stage" class="chain-stage">
          <canvas id="chain-canvas" role="grid" tabindex="0" aria-label="Chain Reaction board. Use arrow keys to move and Enter or Space to place an atom."/>
          <div id="chain-status" class="sr-only" aria-live="polite"/>
        </main>
        <section id="chain-result" class="chain-result" hidden aria-live="polite">
          <span class="chain-result-eyebrow">Match complete</span>
          <h2 id="chain-result-title">You win</h2>
          <p id="chain-result-copy"/>
          <div class="chain-result-actions"><button id="chain-play-again" class="chain-result-primary" type="button">Play again</button><button id="chain-result-menu" class="chain-result-secondary" type="button">Game menu</button></div>
        </section>
      </section>
    </div>
  </EngineBoundary>;
}
