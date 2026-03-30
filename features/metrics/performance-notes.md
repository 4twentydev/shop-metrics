# Metrics Engine Performance Notes

- Snapshot-first reporting keeps dashboard queries off of raw `work_entries` joins once scheduled runs are in place.
- The heaviest raw aggregation path is the snapshot job query joining `work_entries`, `shift_submissions`, `employees`, `departments`, `job_releases`, and `jobs`; it is bounded by `business_date` and supported by the new snapshot/target indexes.
- Completion percentages use approved `job_releases.panel_baseline` values so snapshot reads do not need to parse extraction payload JSON.
- Reopen counts are deduplicated per submission during aggregation to avoid multiplying reopen events by entry count.
- Missing mapping detection is intentionally cheap: it flags absent/zero `panels_per_native_unit` or native-unit mismatches, which can later be extended to station-level normalization maps without rewriting the snapshot model.
- For larger installations, schedule the daily snapshot shortly after each shift closes and roll weekly/monthly/annual snapshots from the same business date anchor.
- If reporting volume grows, the next practical optimization is partitioning `metric_snapshots` by `window_type` or month and adding covering indexes on `work_entries(business_date, job_release_id, department_id)`.
