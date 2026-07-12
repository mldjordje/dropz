import Image from "next/image";
import { portfolio } from "./content";

type WorkProps = { index: string; title: string; body: string };

export function Work({ index, title, body }: WorkProps) {
  return (
    <section className="work-v2" id="work">
      <div className="work-v2__sticky">
        <div className="work-v2__plate" />
        <div className="work-v2__copy">
          <span>{index}</span><h2>{title}</h2><p>{body}</p>
        </div>
        <div className="tunnel" aria-label="Odabrani tattoo radovi">
          {portfolio.map((image) => (
          <figure className={image.className} key={image.src}>
            <Image src={image.src} alt={image.alt} fill sizes="34vw" />
            <figcaption>DROPZ / {image.number}</figcaption>
          </figure>
          ))}
        </div>
        <div className="work-v2__counter">{String(portfolio.length).padStart(2, "0")} / {String(portfolio.length).padStart(2, "0")}</div>
      </div>
    </section>
  );
}
