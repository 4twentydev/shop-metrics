import type { Metadata } from "next";

import { ExtractionReviewView } from "@/features/extraction/components/extraction-review-view";
import { getExtractionReviewPageData } from "@/features/extraction/queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Release Extraction Review",
};

type PageProps = {
  searchParams: Promise<{
    queue?: string;
  }>;
};

export default async function ReleaseExtractionPage({ searchParams }: PageProps) {
  await requireOpsRole();
  const resolvedSearchParams = await searchParams;
  const data = await getExtractionReviewPageData({
    queue: resolvedSearchParams.queue,
  });

  return <ExtractionReviewView data={data} />;
}
