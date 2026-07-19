import { LandingV3 } from "@/components/landing/v3/LandingV3";
import { getMergedCopy } from "@/lib/content";

// Re-render at most once a minute so CMS edits go live without a redeploy.
export const revalidate = 60;

export default async function HomePage() {
  const copyData = await getMergedCopy();
  return <LandingV3 copyData={copyData} />;
}
