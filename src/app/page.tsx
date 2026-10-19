const pillars = [
  { number: "01", title: "A world worth exploring", detail: "A seamless-feeling frontier built from original places, creatures, and lore." },
  { number: "02", title: "Progress your own way", detail: "A data-driven skill system designed for gathering, crafting, combat, and discovery." },
  { number: "03", title: "A living world together", detail: "A persistent server-authoritative world where trade and player actions matter." },
];

export default function HomePage() {
  return (
    <main className="realm-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Elder Realms Online home">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span className="brand-name">ELDER REALMS <i>ONLINE</i></span>
        </a>
        <span className="build-label"><span className="status-dot" /> WORLD IN DEVELOPMENT</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span /> AN ORIGINAL FANTASY MMORPG</p>
          <h1 id="hero-title">Your legend<br />is <em>unwritten.</em></h1>
          <p className="hero-description">
            Step into a world shaped by exploration, hard-earned skills, dangerous wilds,
            and the stories players create together.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#project-status">EXPLORE THE PROJECT <span aria-hidden="true">↗</span></a>
            <a className="secondary-action" href="https://github.com/kangrebahancuy-cmyk/gweb">VIEW DEVELOPMENT <span aria-hidden="true">↗</span></a>
          </div>
          <div className="hero-note"><span className="note-line" /> BUILT FOR DESKTOP & ANDROID BROWSERS</div>
        </div>
        <div className="sigil-stage" aria-label="Elder Realms emblem">
          <div className="sigil-orbit orbit-outer" />
          <div className="sigil-orbit orbit-inner" />
          <div className="sigil-star">✦</div>
          <div className="sigil">E</div>
          <div className="sigil-caption">THE REALMS AWAIT</div>
          <div className="sigil-coordinate">N 42° · E 07°</div>
        </div>
      </section>

      <section className="pillars" aria-label="Game design pillars">
        {pillars.map((pillar) => (
          <article className="pillar" key={pillar.number}>
            <span className="pillar-number">{pillar.number}</span>
            <div><h2>{pillar.title}</h2><p>{pillar.detail}</p></div>
            <span className="pillar-arrow" aria-hidden="true">↗</span>
          </article>
        ))}
      </section>

      <section className="project-status" id="project-status">
        <div><p className="eyebrow">DEVELOPMENT STATUS</p><h2>The foundations come first.</h2></div>
        <p className="status-copy">
          This project is in its foundation phase. The playable 3D world, authoritative
          multiplayer, persistence, and game systems will be delivered and tested in stages.
          This page does not claim those systems are already playable.
        </p>
        <a href="https://github.com/kangrebahancuy-cmyk/gweb" className="status-link">FOLLOW THE BUILD <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="/"><span className="brand-mark">E</span><span className="brand-name">ELDER REALMS <i>ONLINE</i></span></a>
        <span>AN ORIGINAL WORLD IN THE MAKING</span>
        <span>© {new Date().getFullYear()} ELDER REALMS ONLINE</span>
      </footer>
    </main>
  );
}
