import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function Finale({ title, action }: { title: string; action: string }) {
  return (
    <section className="finale">
      <div className="finale__glow" aria-hidden="true" />
      <p className="finale__line reveal">{title}</p>
      <div className="finale__logo reveal"><Image src="/media/dropz%20logo%20vektor%20OKVIR-01.webp" alt="Dropz Tattoo" fill sizes="80vw" /></div>
      <Link className="finale__cta reveal" href="/booking"><span>{action}</span><ArrowUpRight /></Link>
      <footer>
        <span>Dropz Tattoo / Niš</span>
        <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
        <a href="mailto:studio@dropz.tattoo">studio@dropz.tattoo</a>
        <span>2026</span>
      </footer>
    </section>
  );
}
