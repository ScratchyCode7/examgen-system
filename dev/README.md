# Development scripts and SQL checks

This folder contains development-only utilities for testing and diagnosing the Databank application.

- `test-options-endpoints.sh` — A curl-based script that exercises the Options CRUD endpoints. Requires `jq` and a running local backend. Do not run against production.
- `check_topics.sql` — A set of diagnostic SQL queries to inspect Courses, Subjects, Topics, and Questions. Intended for use with `psql` against dev databases.

Usage examples:

```bash
# Run the options test (ensure backend running and update BASE_URL if needed)
bash dev/test-options-endpoints.sh

# Run SQL diagnostics (example):
PGPASSWORD=password psql -h localhost -p 5432 -U postgres -d databank_refactored -f dev/check_topics.sql
```

If you want these files removed from the release artifact, keep them in this folder and exclude `dev/` from deployment.

## Print-Request Workflow Notes (Mar 2026)

- Added auto-hydration when admins load a print request in Test Generation: department/program/subject/topic lists and per-topic question pools are fetched in parallel so the exam can be reviewed immediately.
- Persisted the active request context by locking navigation and clearing state when an admin cancels or completes a review, preventing accidental tab switches mid-edit.
- Extended the status pipeline so printing automatically marks a request `ReadyForPickup`, and teachers can acknowledge receipt to move it to `Completed`.
- Implemented a teacher-facing “My Print Requests” tracker (refreshable table with inline “Mark as Received”) to surface request states without needing admin access.
- See `client/src/pages/TestGeneration.jsx` for UI logic and `client/src/services/api.js` for the supporting endpoints.
