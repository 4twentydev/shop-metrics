import type { Metadata } from "next";

import { ReleaseAdminView } from "@/features/releases/components/release-admin-view";
import { getReleaseAdminPageData } from "@/features/releases/admin-queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Release Admin",
};

export default async function ReleaseAdminPage() {
  await requireOpsRole();
  const data = await getReleaseAdminPageData();

  return <ReleaseAdminView data={data} />;
}
