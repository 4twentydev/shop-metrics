import type { Metadata } from "next";

import { getUserAdminPageData } from "@/features/users/admin-queries";
import { UserAdminView } from "@/features/users/components/user-admin-view";
import { requireRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Users",
};

export default async function UsersAdminPage() {
  await requireRole(["platform_admin"]);
  const data = await getUserAdminPageData();

  return <UserAdminView data={data} />;
}
