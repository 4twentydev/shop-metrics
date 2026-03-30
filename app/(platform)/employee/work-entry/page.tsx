import type { Metadata } from "next";

import { EmployeeWorkEntryView } from "@/features/work-entries/components/employee-work-entry-view";
import { getEmployeeWorkEntryPageData } from "@/features/work-entries/queries";
import { requireSession } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Employee Work Entry",
};

export default async function EmployeeWorkEntryPage() {
  const session = await requireSession();
  const data = await getEmployeeWorkEntryPageData(session.user.id);

  return <EmployeeWorkEntryView data={data} />;
}
