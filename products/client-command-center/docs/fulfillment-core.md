# Fulfillment core: rules, roles and state

## State dimensions (built so far)
| Dimension | Where | Values |
|---|---|---|
| Account stage | `clients.account_stage` | payment_pending, paid, contract_signed, onboarding_booked, active, inactive (+ required reason), finished |
| Scope | `fulfillment_scopes` (one per client, immutable) | template code + version, snapshot, revision policy, contract reference |
| Package status | `deliverable_packages.status` | locked → queued → in_production → internal_qa → client_review → (revision_requested → internal_qa …) → approved |

Entitlement, onboarding and accountability statuses are later slices.

## Transitions and who may perform them
| Command | Allowed roles | Preconditions | Records |
|---|---|---|---|
| `create_client` | owner, admin, CSM | none | audit |
| `set_account_stage` | owner, admin | reason required; inactive needs inactive reason | audit (from/to) |
| `activate_fulfillment` | owner, admin | stage is contract_signed, onboarding_booked or active; contract reference; one scope per client; idempotency key | scope snapshot, packages, audit |
| `amend_revision_policy` | owner | contract reference and reason | amendment row, audit |
| `start_package` | owner, admin, CSM | package queued | audit |
| `submit_version` | owner, admin, CSM | package in_production or revision_requested; hash or provider asset ID | version row, audit |
| `add_source_evidence` | owner, admin, CSM | URL or source ID; provenance | evidence row, audit |
| `record_qa` | owner, admin, CSM (waive: owner, admin only) | checklist version; findings required to waive | evidence row, audit |
| `send_for_client_review` | owner, admin, CSM | internal_qa; current version has source evidence and latest QA is pass/waived | audit. **Sends nothing.** |
| `record_feedback` | owner, admin, CSM | current version in client_review | feedback row (round + allowance status), audit |
| `record_approval` | owner, admin, CSM | current version in client_review; hash/asset ID matches; evidence gate; evidence URL; idempotency key | approval row, dependent packages unlocked, audit |

Viewers can read their organization's data and nothing else. Nobody can write tables directly; all changes go through these functions.

## Revision policy
- Taken from the signed agreement at activation. Blank means `unknown_review_required`; there is no default.
- Scope changes never count as a revision and are flagged for owner review.
- Going over the allowance is flagged (`exceeds_allowance`) and never billed or blocked automatically.

## Open decisions this slice depends on
| Decision | Current safe default |
|---|---|
| Revision rounds and extra-revision price per client | Unknown per client until the owner records it from the contract |
| Scope for existing programs (monthly subscription, consulting, result-execution, historical programs) | Only webinar-engine v2 exists as a template; do not activate other programs on it. Add a template per program once its scope is written down |
| Who approves on the client side | Recorded by the team with an evidence URL; a client login comes later |
