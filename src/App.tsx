import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { GameScene } from "./game/GameScene";
import AuthPanel from "./components/AuthPanel";

type HudState = {
  inventory: Record<string, number>;
  gold: number;
  xp: number;
  harvested: number;
  questStarted: boolean;
  questComplete: boolean;
  plots: { id: number; plantedAt: number | null }[];
  health: number;
  panel: "none" | "inventory" | "skills" | "quest";
  message: string;
  playerLevel: number;
  farmingLevel: number;
  slimeKills: number;
};

const initialState: HudState = {
  inventory: { turnip_seed: 3, turnip: 0, slime_gel: 0 },
  gold: 15, xp: 0, harvested: 0, questStarted: false, questComplete: false,
  plots: [], health: 100, panel: "none", message: "Loading Fernhollow…",
  playerLevel: 1, farmingLevel: 1, slimeKills: 0
};

function sendAction(action: string) {
  window.dispatchEvent(new CustomEvent("ero:action", { detail: action }));
}

function Panel({ state }: { state: HudState }) {
  if (state.panel === "none") return null;
  const title = state.panel === "inventory" ? "Satchel" : state.panel === "skills" ? "Skills" : "Quest Journal";
  return (
    <section className="game-panel" aria-label={title}>
      <header className="panel-heading">
        <div><span className="eyebrow">ADVENTURER'S LOG</span><h2>{title}</h2></div>
        <button className="icon-button" onClick={() => sendAction("close")} aria-label="Close panel">×</button>
      </header>
      {state.panel === "inventory" && (
        <>
          <div className="inventory-grid">
            {Object.entries(state.inventory).map(([id, count]) => (
              <div className="inventory-item" key={id}>
                <span className={`item-glyph ${id}`}>{id === "turnip_seed" ? "✦" : id === "turnip" ? "♣" : "●"}</span>
                <span className="item-name">{id.replaceAll("_", " ")}</span><b>{count}</b>
              </div>
            ))}
          </div>
          <p className="panel-note">Items and gold are stored in this browser prototype only.</p>
        </>
      )}
      {state.panel === "skills" && (
        <div className="skill-list">
          <Skill name="Adventuring" level={state.playerLevel} xp={state.xp} />
          <Skill name="Farming" level={state.farmingLevel} xp={state.harvested * 15} />
          <Skill name="Combat" level={1 + Math.floor(state.slimeKills / 3)} xp={state.slimeKills * 20} />
          <div className="skill-row"><span>Woodcutting</span><b>Coming soon</b></div>
          <div className="skill-row"><span>Fishing</span><b>Coming soon</b></div>
          <div className="skill-row"><span>Mining</span><b>Coming soon</b></div>
        </div>
      )}
      {state.panel === "quest" && (
        <div className="quest-card">
          <div className="quest-status">{state.questComplete ? "COMPLETED" : state.questStarted ? "IN PROGRESS" : "AVAILABLE"}</div>
          <h3>A New Beginning</h3>
          <p>Mira needs fresh produce for Fernhollow's village pantry. Plant a turnip seed on your farm, wait for it to grow, harvest it, then return to Mira.</p>
          <ol>
            <li className={state.questStarted ? "done" : ""}>Speak with Mira</li>
            <li className={state.harvested > 0 ? "done" : ""}>Harvest a turnip ({state.harvested}/1+)</li>
            <li className={state.questComplete ? "done" : ""}>Return to Mira for your reward</li>
          </ol>
          <div className="reward">Reward · 25 gold · 50 XP</div>
        </div>
      )}
    </section>
  );
}

function Skill({ name, level, xp }: { name: string; level: number; xp: number }) {
  return <div className="skill-card">
    <div className="skill-top"><span>{name}</span><b>Lv. {level}</b></div>
    <div className="xp-track"><span style={{ width: `${Math.min(100, xp % 100)}%` }} /></div>
    <small>{xp} XP · {100 - (xp % 100)} to next level</small>
  </div>;
}

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [state, setState] = useState<HudState>(initialState);
  const [showHelp, setShowHelp] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const handleHud = (event: Event) => setState((event as CustomEvent<HudState>).detail);
    window.addEventListener("ero:hud", handleHud);
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game-root",
        width: 1280,
        height: 760,
        backgroundColor: "#719b54",
        pixelArt: true,
        antialias: false,
        physics: { default: "arcade", arcade: { debug: false } },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [GameScene],
        render: { roundPixels: true }
      });
    }
    return () => {
      window.removeEventListener("ero:hud", handleHud);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const questLabel = state.questComplete ? "Quest complete" : state.questStarted ? "Quest active" : "Quest available";
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Elder Realms Online home">
          <span className="brand-mark">ER</span>
          <span><strong>ELDER REALMS</strong><small>ONLINE · EARLY ACCESS</small></span>
        </a>
        <div className="realm-status"><span className="status-dot" /> FERNHOLLOW <span className="status-divider">/</span> LOCAL REALM</div>
        <div className="header-actions"><button className="account-button" onClick={() => setShowAuth(true)}>Account ↗</button><button className="help-button" onClick={() => setShowHelp((value) => !value)}>How to play <span>?</span></button></div>
      </header>

      <section className="game-layout">
        <div className="world-column">
          <div className="game-frame">
            <div className="game-top-hud">
              <div className="player-badge"><span className="player-avatar">✦</span><span><b>Wayfarer</b><small>Level {state.playerLevel}</small></span></div>
              <div className="health-wrap"><span>HP</span><div className="health-track"><i style={{ width: `${state.health}%` }} /></div><b>{state.health}/100</b></div>
              <div className="gold-counter">◈ <b>{state.gold}</b> <small>GOLD</small></div>
            </div>
            <div id="game-root" className="game-root" aria-label="Playable game world" />
            <div className="game-bottom-hud">
              <div className="location-chip"><span>⌖</span> Fernhollow Village</div>
              <div className="controls-hint">WASD MOVE <i /> E INTERACT <i /> SPACE ATTACK</div>
            </div>
            {state.message && <div className="message-toast" role="status">{state.message}</div>}
            <div className="touch-actions">
              <button onClick={() => sendAction("interact")}>E <small>Interact</small></button>
              <button className="attack-action" onClick={() => sendAction("attack")}>⚔ <small>Attack</small></button>
              <button onClick={() => sendAction("plant")}>♣ <small>Farm</small></button>
            </div>
          </div>
          <div className="quickbar">
            <button onClick={() => sendAction("inventory")} className={state.panel === "inventory" ? "selected" : ""}><span>▦</span> Inventory <kbd>I</kbd></button>
            <button onClick={() => sendAction("skills")} className={state.panel === "skills" ? "selected" : ""}><span>✧</span> Skills <kbd>K</kbd></button>
            <button onClick={() => sendAction("quest")} className={state.panel === "quest" ? "selected" : ""}><span>⚑</span> Journal <kbd>J</kbd></button>
            <div className="quickbar-spacer" />
            <span className="save-indicator"><i /> Local save active</span>
          </div>
          <div className="tip-line"><span>✦</span> Tip: Talk to Mira, then plant and harvest a turnip in the farm plot just east of her.</div>
        </div>

        <aside className="side-column">
          <div className="side-card profile-card">
            <div className="card-heading"><span className="eyebrow">YOUR JOURNEY</span><span className="rank-pill">NOVICE</span></div>
            <h2>Welcome, Wayfarer.</h2>
            <p>Fernhollow is a quiet place to begin. The roads beyond the village hide new skills, strange creatures, and stories waiting to be found.</p>
            <div className="profile-stats">
              <div><span>COMBAT</span><b>{1 + Math.floor(state.slimeKills / 3)}</b></div>
              <div><span>FARMING</span><b>{state.farmingLevel}</b></div>
              <div><span>HARVESTS</span><b>{state.harvested}</b></div>
            </div>
          </div>
          <div className="side-card quest-summary">
            <div className="card-heading"><span className="eyebrow">ACTIVE QUEST</span><span className={state.questComplete ? "quest-check complete" : "quest-check"}>{state.questComplete ? "✓" : "!"}</span></div>
            <h3>A New Beginning</h3>
            <p>{state.questComplete ? "Mira is grateful for your help." : state.questStarted ? "Grow a turnip and bring your harvest back to Mira." : "A village request awaits. Find Mira near the cottages."}</p>
            <div className="quest-progress"><span style={{ width: state.questComplete ? "100%" : state.harvested > 0 ? "66%" : state.questStarted ? "33%" : "8%" }} /></div>
            <div className="quest-footer"><span>{questLabel}</span><button onClick={() => sendAction("quest")}>Details ↗</button></div>
          </div>
          <div className="side-card realm-card">
            <div className="card-heading"><span className="eyebrow">REALM ACTIVITY</span><span className="live-pill">● LIVE</span></div>
            <div className="activity-row"><span className="activity-icon">♧</span><span><b>Green slime</b><small>Eastern forest</small></span><span className="activity-state">Hostile</span></div>
            <div className="activity-row"><span className="activity-icon">⌂</span><span><b>General store</b><small>Village market</small></span><span className="activity-state safe">Safe</span></div>
            <div className="activity-row"><span className="activity-icon">♣</span><span><b>Your farm</b><small>4 growing plots</small></span><span className="activity-state safe">Yours</span></div>
          </div>
          <div className="side-actions"><button onClick={() => setShowHelp((value) => !value)}>⌘ Controls</button><button onClick={() => sendAction("reset")}>↻ Reset local save</button></div>
        </aside>
      </section>

      <Panel state={state} />
      {showAuth && <AuthPanel onClose={() => setShowAuth(false)} />}
      {showHelp && <div className="help-overlay" role="dialog" aria-modal="true" aria-label="How to play">
        <div className="help-card"><button className="icon-button close-help" onClick={() => setShowHelp(false)}>×</button>
          <span className="eyebrow">FIELD GUIDE</span><h2>Your first day in Fernhollow</h2>
          <div className="help-step"><b>01</b><span><strong>Move around</strong><small>Use WASD or arrow keys. On touch screens, drag the joystick in the lower-left.</small></span></div>
          <div className="help-step"><b>02</b><span><strong>Meet Mira</strong><small>Walk close to the villager near the cottages and press E or tap Interact.</small></span></div>
          <div className="help-step"><b>03</b><span><strong>Grow a turnip</strong><small>Go to the brown farm plots. Press E to plant, wait about 12 seconds, then interact again to harvest.</small></span></div>
          <div className="help-step"><b>04</b><span><strong>Defend the forest</strong><small>Find the green slime east of the village and press Space or tap Attack when nearby.</small></span></div>
          <p className="help-warning">Prototype note: progress saves in this browser only. Online accounts and multiplayer are not connected yet.</p>
        </div>
      </div>}
      <footer className="site-footer"><span>ELDER REALMS ONLINE</span><span>AN ORIGINAL PIXEL-ART ADVENTURE · PLAYABLE PROTOTYPE</span><span>BUILD 0.2.0</span></footer>
    </main>
  );
}
