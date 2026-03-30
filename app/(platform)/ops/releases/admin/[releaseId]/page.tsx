import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReleaseAdminDetailView } from "@/features/releases/components/release-admin-detail-view";
import { getReleaseAdminDetail } from "@/features/releases/admin-queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Release Administration Detail",
};

type PageProps = {
  params: Promise<{
    releaseId: string;
  }>;
};

export default async function ReleaseAdminDetailPage({ params }: PageProps) {
  await requireOpsRole();
  const { releaseId } = await params;
  const data = await getReleaseAdminDetail(releaseId);

  if (!data) {
    notFound();
  }

  return <ReleaseAdminDetailView data={data} />;
}
