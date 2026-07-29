import { permanentRedirect } from "next/navigation";

export default function RetiredMyWorksPage() {
  permanentRedirect("/admin/portfolio");
}
