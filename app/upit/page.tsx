import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { RouteChrome } from "@/components/layout/RouteChrome";

export const metadata: Metadata = {
  title: "Upit za tattoo",
  description:
    "Pošalji ideju, referencu i poziciju za svoju tetovažu. Dropz Tattoo studio u Nišu odgovara predlogom i slobodnim terminima.",
  alternates: { canonical: "/upit" },
};

export default function InquiryPage() {
  return <main className="route-shell"><RouteChrome /><Link className="route-back" href="/"><ArrowLeft /> Nazad</Link><div className="route-index">02 / Upit</div><h1>Ideja je<br />dovoljan početak.</h1><p>Pošalji referencu, poziciju i okvirnu veličinu. Odgovaramo sa predlogom i sledećim slobodnim terminima.</p><a className="route-contact" href="mailto:studio@dropz.tattoo?subject=Tattoo%20upit">Pošalji ideju <ArrowUpRight /></a></main>;
}
