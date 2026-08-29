import { GameTopBarActions, TopBar, TopBarIconButton } from '../../shared/components/TopBar.tsx';
import { ChainBackMark, ChainLiveMark } from '../../shared/components/ChainLogo.tsx';
import { EngineBoundary } from '../../shared/components/EngineBoundary.tsx';
import Settings from 'lucide-solid/icons/settings';
import BarChart3 from 'lucide-solid/icons/chart-no-axes-column';
import { createChainRefs } from './dom.ts';

function Slider(props:{label:string;min:number;max:number;inputRef:(el:HTMLInputElement)=>void;outputRef:(el:HTMLOutputElement)=>void}) {
  return <label class="game-settings-slider">
    <span class="game-settings-slider-head"><span class="game-settings-slider-label">{props.label}</span><output ref={props.outputRef} class="game-settings-slider-value"/></span>
    <span class="game-range-shell"><span class="game-range-track" aria-hidden="true"><span class="game-range-fill"/></span><input ref={props.inputRef} type="range" min={props.min} max={props.max} step="1"/></span>
  </label>;
}

export function ChainPage() {
  const refs = createChainRefs();
  const statsButton = () => <TopBarIconButton ref={el => refs.statsButtons.push(el)} label="Statistics"><BarChart3 aria-hidden="true"/></TopBarIconButton>;
  const gameActions = (settings = false) => <GameTopBarActions ariaLabel="Chain Reaction">
    {statsButton()}
    {settings && <TopBarIconButton
      ref={el => refs.settingsButton = el}
      class="game-settings-trigger chain-settings-trigger"
      label="Settings"
      ariaControls="chain-settings"
      ariaExpanded={false}
    ><Settings aria-hidden="true"/></TopBarIconButton>}
  </GameTopBarActions>;

  return <EngineBoundary label="Chain Reaction" load={() => import('./chain.ts')} mount={module => module.mountChain(refs)}>
    <div class="chain-shell">
      <section ref={el => refs.openingView = el} class="chain-opening chain-view">
        <TopBar nav={gameActions()}/>
        <div class="chain-opening-inner">
          <ChainLiveMark class="chain-opening-logo"/>
          <div class="chain-mode-grid">
            <article ref={el => refs.resumeCard = el} class="chain-mode-card chain-mode-card-primary">
              <span ref={el => refs.resumeEyebrow = el} class="chain-mode-eyebrow">Current game</span>
              <h2 ref={el => refs.resumeTitle = el}>Continue</h2>
              <p ref={el => refs.resumeCopy = el}>Saved board</p>
              <div ref={el => refs.resumeSpec = el} class="chain-mode-spec"/>
              <button ref={el => refs.resumeButton = el} class="chain-mode-action" type="button">Continue game</button>
            </article>
            <article class="chain-mode-card">
              <span class="chain-mode-eyebrow">Quick match</span>
              <h2>Classic</h2>
              <div class="chain-mode-spec">9 × 6 board<br/>1 enemy</div>
              <button ref={el => refs.quickButton = el} class="chain-mode-action chain-mode-action-secondary" type="button">Start classic</button>
            </article>
            <article class="chain-mode-card">
              <span class="chain-mode-eyebrow">New board</span>
              <h2>Custom</h2>
              <div class="chain-preset-list">
                <button ref={el => refs.presets.push(el)} class="chain-preset" type="button" data-rows="7" data-cols="5" data-enemies="1">Compact · 7 × 5 · 1 enemy</button>
                <button ref={el => refs.presets.push(el)} class="chain-preset" type="button" data-rows="12" data-cols="8" data-enemies="2">Wide · 12 × 8 · 2 enemies</button>
                <button ref={el => refs.presets.push(el)} class="chain-preset" type="button" data-rows="16" data-cols="10" data-enemies="3">Large · 16 × 10 · 3 enemies</button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section ref={el => refs.statsView = el} class="chain-view chain-stats-view" hidden>
        <TopBar start={<button ref={el => refs.statsBackButton = el} class="chain-menu-button chain-pixel-back" type="button" role="link" aria-label="Back to Chain Reaction menu"><ChainBackMark/></button>} nav={gameActions()}/>
        <main class="chain-stats-page">
          <header><span class="chain-mode-eyebrow">All time</span><h1>Statistics</h1></header>
          <div class="chain-stats-grid">
            <div><span>Games</span><strong ref={el => refs.statGames = el}>0</strong></div>
            <div><span>Wins</span><strong ref={el => refs.statWins = el}>0</strong></div>
            <div><span>Win rate</span><strong ref={el => refs.statRate = el}>–</strong></div>
            <div><span>Largest board</span><strong ref={el => refs.statLargest = el}>–</strong></div>
          </div>
          <section class="chain-stats-history"><div class="chain-stats-heading"><h2>Recent matches</h2></div><div ref={el => refs.statRecent = el} class="chain-stat-recent"/></section>
          <section ref={el => refs.replayPanel = el} class="chain-replay" hidden>
            <div class="chain-replay-head">
              <div><span class="chain-mode-eyebrow">Replay</span><h2 ref={el => refs.replayTitle = el}>Match replay</h2><p ref={el => refs.replayCopy = el}/></div>
              <button ref={el => refs.replayClose = el} class="chain-replay-close" type="button">Close</button>
            </div>
            <div class="chain-replay-stage"><canvas ref={el => refs.replayCanvas = el} aria-label="Chain Reaction match replay"/></div>
            <div class="chain-replay-controls">
              <button ref={el => refs.replayPrev = el} type="button">Previous</button>
              <button ref={el => refs.replayPlay = el} type="button">Play</button>
              <button ref={el => refs.replayNext = el} type="button">Next</button>
              <button ref={el => refs.replayResume = el} class="chain-replay-resume" type="button">Resume from here</button>
              <output ref={el => refs.replayStatus = el}>Move 0 / 0</output>
            </div>
          </section>
        </main>
      </section>

      <section ref={el => refs.gameView = el} class="chain-view chain-game-view" hidden>
        <TopBar
          start={<button ref={el => refs.menuButton = el} class="chain-menu-button chain-pixel-back" type="button" role="link" aria-label="Back to Chain Reaction menu"><ChainBackMark/></button>}
          contextClass="chain-topbar-context"
          context={<div ref={el => refs.turnEl = el} class="chain-turn" aria-hidden="true">
            <span class="chain-turn-item"><span>YOU</span><span ref={el => refs.youSwatch = el} class="chain-turn-swatch"/></span>
            <span class="chain-turn-item"><span>TURN</span><span ref={el => refs.activeSwatch = el} class="chain-turn-swatch"/></span>
          </div>}
          nav={gameActions(true)}
        />
        <aside ref={el => refs.settingsPanel = el} id="chain-settings" class="game-settings-popover chain-settings" data-samey-overlay="" aria-hidden="true">
          <div class="game-settings-body">
            <div class="game-settings-section-title">BOARD</div>
            <Slider label="Rows" min={4} max={30} inputRef={el => refs.rowsInput = el} outputRef={el => refs.rowsValue = el}/>
            <Slider label="Columns" min={4} max={30} inputRef={el => refs.colsInput = el} outputRef={el => refs.colsValue = el}/>
            <Slider label="Enemies" min={1} max={5} inputRef={el => refs.enemiesInput = el} outputRef={el => refs.enemiesValue = el}/>
            <div class="game-settings-actions"><button ref={el => refs.newGameButton = el} class="game-settings-action" type="button">Start new game</button></div>
          </div>
        </aside>
        <main ref={el => refs.stage = el} class="chain-stage">
          <canvas ref={el => refs.canvas = el} role="grid" tabindex="0" aria-label="Chain Reaction board. Use arrow keys to move and Enter or Space to place an atom."/>
          <div ref={el => refs.statusEl = el} class="sr-only" aria-live="polite"/>
        </main>
        <section ref={el => refs.resultPanel = el} class="chain-result" data-samey-overlay="" hidden aria-live="polite">
          <span class="chain-result-eyebrow">Match complete</span>
          <h2 ref={el => refs.resultTitle = el}>You win</h2>
          <p ref={el => refs.resultCopy = el}/>
          <div class="chain-result-actions"><button ref={el => refs.playAgainButton = el} class="chain-result-primary" type="button">Play again</button><button ref={el => refs.resultMenuButton = el} class="chain-result-secondary" type="button">Game menu</button></div>
        </section>
      </section>
    </div>
  </EngineBoundary>;
}
