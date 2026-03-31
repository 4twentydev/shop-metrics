import { CheckCircle, XCircle } from "lucide-react";

import {
  createUserAction,
  setUserPinAction,
  updateUserRoleAction,
  updateUserStatusAction,
} from "@/features/users/admin-actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserAdminPageData } from "@/features/users/admin-queries";

const ROLE_OPTIONS = [
  { value: "platform_admin", label: "Platform Admin" },
  { value: "ops_lead", label: "Ops Lead" },
  { value: "department_lead", label: "Department Lead" },
  { value: "employee", label: "Employee" },
] as const;

const STATUS_OPTIONS = [
  { value: "INVITED", label: "Invited" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-green-400",
  INVITED: "text-yellow-400",
  SUSPENDED: "text-red-400",
};

export function UserAdminView({ data }: { data: UserAdminPageData }) {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Page header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          Platform Admin
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Users</h2>
        <p className="mt-2 text-sm text-muted">
          Manage user accounts, roles, and PIN authentication.
        </p>
      </div>

      {/* Create user form */}
      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong p-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
          New user
        </p>
        <h3 className="mt-3 text-xl font-semibold">Create account</h3>
        <form action={createUserAction} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-2 text-sm">
              <span className="text-muted">Full name</span>
              <input
                name="name"
                type="text"
                required
                placeholder="Jane Smith"
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 outline-none transition focus:border-accent"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-muted">Work email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="jane@company.com"
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 outline-none transition focus:border-accent"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-muted">Role</span>
              <select
                name="activeRole"
                required
                className="rounded-2xl border border-line bg-panel px-4 py-3 outline-none transition focus:border-accent"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-muted">Initial PIN (4 digits)</span>
              <input
                name="pin"
                type="text"
                inputMode="numeric"
                required
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="e.g. 1234"
                className="rounded-2xl border border-line bg-white/[0.03] px-4 py-3 outline-none transition focus:border-accent"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Create user
          </button>
        </form>
      </section>

      {/* Users list */}
      <section className="rounded-[1.75rem] border border-line/80 bg-panel-strong">
        <div className="border-b border-line/60 px-6 py-4">
          <p className="text-sm font-semibold">
            {data.users.length} user{data.users.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="divide-y divide-line/40">
          {data.users.map((user) => (
            <div key={user.id} className="grid gap-6 px-6 py-5 lg:grid-cols-[1fr_auto]">
              {/* User info */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">{user.name}</p>
                  <span
                    className={`font-mono text-xs uppercase tracking-wider ${STATUS_COLORS[user.status] ?? "text-muted"}`}
                  >
                    {user.status}
                  </span>
                  <span className="rounded-full border border-line/60 px-2 py-0.5 text-xs text-muted">
                    {ROLE_LABELS[user.activeRole as keyof typeof ROLE_LABELS] ?? user.activeRole}
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs text-muted"
                    title={user.hasPin ? "PIN is set" : "No PIN set"}
                  >
                    {user.hasPin ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    )}
                    {user.hasPin ? "PIN set" : "No PIN"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{user.email}</p>
              </div>

              {/* Inline action forms */}
              <div className="flex flex-wrap items-start gap-3">
                {/* Set PIN */}
                <form action={setUserPinAction} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    name="pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    placeholder="New PIN"
                    required
                    className="w-24 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-center text-sm outline-none transition focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-accent hover:text-white"
                  >
                    Set PIN
                  </button>
                </form>

                {/* Change role */}
                <form action={updateUserRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <select
                    name="activeRole"
                    defaultValue={user.activeRole}
                    className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs outline-none transition focus:border-accent"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-accent hover:text-white"
                  >
                    Save
                  </button>
                </form>

                {/* Change status */}
                <form action={updateUserStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <select
                    name="status"
                    defaultValue={user.status}
                    className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs outline-none transition focus:border-accent"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-accent hover:text-white"
                  >
                    Save
                  </button>
                </form>
              </div>
            </div>
          ))}

          {data.users.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted">
              No users yet. Create one above.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
