# Work-Entry Extension Notes

The current slice is designed so future departments can be added with configuration instead of route rewrites.

## Add a future department

1. Insert the department with:
   - `code`
   - `name`
   - `nativeUnitLabel`
   - `panelsPerNativeUnit`
2. Add one or more stations for the department.
3. Assign employees to those stations and shifts.

## Why this scales

- The employee form does not hard-code department fields. Station, department, shift, native unit type, and panel normalization all derive from the employee assignment plus department configuration.
- Rework attribution is department-based rather than station-name-based, so new departments fit without changing the workflow model.
- Lead metrics aggregate by department and business date from the current work-entry tables, so new departments appear automatically after setup.

## If a future department needs special rules

Add them in feature logic, not page files:

- custom validation: `features/work-entries/schemas.ts`
- quantity normalization: `features/metrics/formulas.ts`
- business-date overrides: `features/work-entries/business.ts`
- permission or verification rules: `lib/auth/permissions.ts` and `features/work-entries/actions.ts`
