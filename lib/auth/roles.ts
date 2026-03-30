export const ROLE_SLUGS = {
  platformAdmin: "platform_admin",
  opsLead: "ops_lead",
  departmentLead: "department_lead",
  employee: "employee",
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const ROLE_LABELS: Record<RoleSlug, string> = {
  platform_admin: "Platform Admin",
  ops_lead: "Ops Lead",
  department_lead: "Department Lead",
  employee: "Employee",
};

export const OPS_ROLES: RoleSlug[] = [
  ROLE_SLUGS.platformAdmin,
  ROLE_SLUGS.opsLead,
  ROLE_SLUGS.departmentLead,
];
