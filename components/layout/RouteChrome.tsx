import { copy } from "@/components/landing/content";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { AmbientBackground } from "@/components/layout/AmbientBackground";

// Every route-shell page (booking, nalog, portfolio, edukacija, upit) was
// otherwise nav-less on mobile and visually flat (just a static CSS
// gradient). Drop this once at the top of the page for the same full-screen
// menu as the homepage plus the lightweight ambient WebGL background.
export function RouteChrome() {
  return (
    <>
      <AmbientBackground />
      <MobileMenu labels={copy.sr.nav} variant="route" />
    </>
  );
}
