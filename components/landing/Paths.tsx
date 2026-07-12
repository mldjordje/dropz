import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type PathsProps = {
  index: string;
  title: string;
  consult: string;
  consultMeta: string;
  consultAction: string;
  inquiry: string;
  inquiryMeta: string;
  inquiryAction: string;
};

export function Paths(props: PathsProps) {
  return (
    <section className="paths-v2" id="booking">
      <div className="paths-v2__stage">
      <div className="paths-v2__plate" />
      <div className="paths-v2__label">{props.index}</div>
      <div className="paths-v2__choices">
        <Link href="/booking" className="branch branch--left">
          <strong>{props.consult}</strong><small>{props.consultMeta}</small>
          <span>{props.consultAction}<ArrowUpRight /></span>
        </Link>
        <Link href="/upit" className="branch branch--right">
          <strong>{props.inquiry}</strong><small>{props.inquiryMeta}</small>
          <span>{props.inquiryAction}<ArrowUpRight /></span>
        </Link>
      </div>
      <div className="paths-v2__city">NIS / SERBIA</div>
      </div>
    </section>
  );
}
