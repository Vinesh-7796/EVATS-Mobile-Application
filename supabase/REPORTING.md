# Training progress reporting

The reporting layer contains two manager-facing views. They are kept in the
private `reporting` schema so the Expo app cannot query them through the public
Supabase Data API.

| View | Use |
| --- | --- |
| `reporting.training_user_overview` | One executive-summary row per trainee: role, one combined streak field, all eight modules and their grade/status, total score, and average grade. |
| `reporting.training_module_detail` | One row per trainee/module, intended for Excel filters and pivot tables. |

## Dashboard setup

1. Apply the reporting migration with `npm run supabase:push`.
2. Connect Metabase to the Supabase database using a protected server-side
   database credential; do not use the Expo anon key or expose a database
   password in a browser/mobile app.
3. Create an **EVATS Training Progress** dashboard with:
   - a table based on `training_user_overview`;
   - filters for user, role, and last-active date;
   - a detail table based on `training_module_detail` for module, status, and
     grade filtering.
4. Give managers Metabase accounts and use its XLSX/CSV download option for
   Excel analysis. Do not publish the dashboard as a public link because it
   contains trainee performance data.

The overview's `modules_grade_progress` value is formatted with line breaks for
easy reading. Use the detail view—not the formatted overview cell—for pivot
tables and module-level analysis.
