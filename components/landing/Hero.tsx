export function Hero({ line, subline, scroll }: { line: string; subline: string; scroll: string }) {
  return (
    <section className="hero hero-v2" id="top">
      <div className="hero-v2__plate" />
      <div className="hero-v2__scan" />
      <div className="hero__meta">
        <span>Niš / Serbia</span>
        <span>Dropz tattoo studio</span>
      </div>
      <h1 className="hero-v2__title"><span>INK IS</span><span>ENERGY.</span></h1>
      <p className="hero__statement">{subline}</p>
      <div className="hero__scroll" aria-hidden="true"><span>{scroll}</span><i /></div>
      <div className="hero-v2__depth-label">SCROLL / ENTER THE SKIN</div>
    </section>
  );
}
