import type { Metadata } from "next";

import { ReleaseIntakeAdminView } from "@/features/release-intake/components/release-intake-admin-view";
import { getReleaseIntakePageData } from "@/features/release-intake/queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Release Intake",
};

export default async function ReleaseIntakePage() {
  await requireOpsRole();
  const data = await getReleaseIntakePageData();

  return <ReleaseIntakeAdminView data={data} />;
}
