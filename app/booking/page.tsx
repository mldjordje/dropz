import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export default function BookingPage() {
  return <main className="route-shell"><Link className="route-back" href="/"><ArrowLeft /> Nazad</Link><div className="route-index">01 / Konsultacija</div><h1>15 minuta.<br />Bez obaveze.</h1><p>Ispricaj nam ideju, mesto i velicinu. Zajedno biramo najbolji sledeci korak.</p><a className="route-contact" href="mailto:studio@dropz.tattoo">Zatrazi termin <ArrowUpRight /></a></main>;
}
