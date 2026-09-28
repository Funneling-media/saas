# Client sheet import plan (next slice, not built)

Source: the "AI Business 2026 Client List" Google Sheet (owner's Drive). **No values from the sheet are stored in this repository.** This page lists tab and column names only.

## Tabs seen on 2026-09-28
Start Here · Active Clients List · Paused Clients · Old Clients · Team Task List · Call Log Archive · Status Guide · three dated archive tabs.

## Proposed mapping
| Sheet column(s) | Destination | Rule |
|---|---|---|
| Project # / Source Client ID | new `client_external_ids` (source = sheet) | Stable key for re-imports; never the only identity |
| Client Name, Business / Company, Email, Contact Number | `clients` | "TBD" or blank → null. No merge on name alone |
| Lifecycle (Active / Paused / Cancelled / Reactivation) | proposed `account_stage` | Human confirms each; Paused → `inactive` + reason |
| Status (Green / Red / Blue / Black / Paused) | new health field | Meanings from the Status Guide tab; separate from stage |
| Contract Value, Cash Collected, Pending Balance, Payment Plan, First/Last Verified Payment, Payment Evidence, Subscription Status | new `payment_evidence` rows | Marked **self-reported** unless a provider record confirms it. Never treated as entitlement |
| Agreement, Agreement Date | proposed contract reference | "No" or "TBD" means fulfillment stays inactive |
| Project / Service, Original Program | proposed scope template | Human selects; never inferred from price |
| Business Context, Risks / Notes, Call Notes / Meeting Memory | Client Brain source documents | Imported as unverified notes with the sheet as source |
| Client Next Step / Client Accountability, CSM Next Action, CSM Task Due | commitments/tasks | Only explicit dated items become tasks; "Immediate", "Daily", "TBD" become CSM clarifications |
| WhatsApp Group, Announcement Channel, Course / CRM Access, Coaching Attendance, Playbooks Uploaded, Resource Access Confirmed | access checklist | "TBD" stays unknown |
| Recording Folder / Link, Main Drive Folder | source links | Stored as links, not verified provisioning |
| Team Task List, Call Log Archive | tasks / meeting sources | Same rules as above |

## Import behaviour
1. Owner exports or connects the sheet. Rows go into a staging table, never straight into `clients`.
2. Each row shows its proposed mapping and conflicts. A human accepts, edits or rejects it.
3. Accepted rows create clients at their confirmed stage. Import never activates fulfillment, sends messages or treats payment as collected.
4. Re-running the import matches on the external ID and shows differences instead of duplicating.
