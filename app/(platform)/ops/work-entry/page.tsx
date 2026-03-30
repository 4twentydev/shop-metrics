import type { Metadata } from "next";

import { LeadWorkEntryView } from "@/features/work-entries/components/lead-work-entry-view";
import { getLeadWorkEntryPageData } from "@/features/work-entries/queries";
import { requireOpsRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Lead Work Entry",
};

export default async function OpsWorkEntryPage() {
  await requireOpsRole();
  const data = await getLeadWorkEntryPageData();

  return <LeadWorkEntryView data={data} />;
}
