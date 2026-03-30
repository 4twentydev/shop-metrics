import type { Metadata } from "next";

import { ExtractionReviewView } from "@/features/extraction/components/extraction-review-view";
import { getExtractionReviewPageData } from "@/features/extraction/queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Release Extraction Review",
};

export default async function ReleaseExtractionPage() {
  await requireOpsRole();
  const data = await getExtractionReviewPageData();

  return <ExtractionReviewView data={data} />;
}
