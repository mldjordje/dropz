import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export default function InquiryPage() {
  return <main className="route-shell"><Link className="route-back" href="/"><ArrowLeft /> Nazad</Link><div className="route-index">02 / Upit</div><h1>Ideja je<br />dovoljan pocetak.</h1><p>Posalji referencu, poziciju i okvirnu velicinu. Odgovaramo sa predlogom i sledecim slobodnim terminima.</p><a className="route-contact" href="mailto:studio@dropz.tattoo?subject=Tattoo%20upit">Posalji ideju <ArrowUpRight /></a></main>;
}
