# CHERMO admin memory lifecycle

Local implementation, 4 November 2026. Not deployed or migrated. Production data and SMTP were not used for testing.

## Operator workflow

Open Admin → Orders → an order. Edit recipient, title, subtitle, date, occasion, personal/closing messages, song details, timeline and template. Preview opens the CHERMO shared memory renderer with current form content. Save changes without email persists the existing order's memory. Published CHERMO pages read the same order when refreshed. Template changes select the shared renderer's accent/label; they do not reproduce independent external template designs or change the original order amount.

Photos: select files and use Preview Memory before Upload selected files. Caption edits are included in preview; Save caption persists each caption. Add a replacement before removing the old media. Removal requires confirmation and retains the physical file, but removes its metadata/reference from the memory. There is no automatic physical-file purge.

Publication: set the CHERMO slug, save the public link, then Publish / Republish without email. Verified payment remains required. Unpublish requires typing UNPUBLISH followed by the exact order ID. Re-publish uses the same order and link.

Links: use 1–80 lowercase letters/numbers and single hyphens. Previously used CHERMO slugs remain reserved and resolve to the same order. A collision with any existing current slug or alias is rejected. An optional complete HTTPS destination overrides the slug and allows external links; existing CHERMO aliases then open that destination. An external site's original URLs cannot be redirected or disabled by CHERMO.

Migration: for an external memory, leave the external destination field empty, enter a CHERMO slug and choose Migrate to CHERMO link. Confirm after previewing the stored content. This changes the saved destination, not the order ID. It uses the content already in CHERMO; external HTML, photos or interactions are not imported. The external site remains independently accessible until its owner disables it separately.

Email: Save and notify customer saves the editor and explicitly requests one publication email. Send / Resend publication email sends the currently stored published URL. Both require confirmation. A durable request ID deduplicates retries; attempts are limited to one per order per minute. Statuses are pending, accepted_by_smtp, not_sent or unknown. SMTP acceptance is not confirmed inbox delivery. Investigate pending/unknown attempts before intentionally requesting another email. A database commit precedes email submission; email failure does not undo content or publication.

Deletion: Archive memory is the approved recoverable deletion action. Type ARCHIVE plus the exact order ID. CHERMO public access is removed while the order, payment records, content and media remain. Restore archive makes the record available for explicit republishing; it does not automatically send email or publish. An external independently hosted page cannot be unpublished through this action.

## Files changed

Frontend root: `C:\Users\Vansh kashyap\OneDrive\Desktop\momently-stage1`

- admin/orders.html
- js/admin.js
- js/admin-lifecycle.js (new)
- js/memory.js
- css/style.css
- tests/memory-link.test.js
- docs/admin-memory-lifecycle.md (this file)

Real backend root: `C:\Users\Vansh kashyap\OneDrive\Desktop\server`

- routes/admin.routes.js — delegates memory operations to the new guarded module; exposes captions
- routes/adminMemory.routes.js (new) — lifecycle, saves, admin media, explicit email and activity history
- routes/memory.routes.js — alias resolution, archive filtering, captions/messages and external destination response
- routes/media.routes.js — no-store response header
- lib/adminMemoryValidation.js (new)
- lib/adminMemory.test.js (new)
- lib/mailer.js — checks SMTP accepted recipients rather than treating every returned response as successful
- lib/memoryPublication.test.js — retained URL/email template tests; replaced obsolete automatic-email route tests with lifecycle tests
- db/migrations/admin-memory-lifecycle.sql (new)

The nested frontend/server files and unrelated untracked backend recovery/database scripts were not changed.

## Migration and rollout gate

Review and apply `db/migrations/admin-memory-lifecycle.sql` to a staging copy first. It adds orders.memory_archived_at, orders.memory_occasion, media.caption; tables memory_slug_aliases, memory_admin_events, memory_email_attempts; and backfills existing slugs as aliases. It does not drop tables or rewrite existing orders. Existing memory_url support from the previous migration is required. The new runtime requires this migration before backend deployment. The fresh-install schema alone does not include these additions; run the migration after it too.

No migration was executed here. Before deployment, test the migration against actual PostgreSQL with a backup and verify constraints, rollback behavior, concurrent slug changes and retained media. Authorize migration and each repository's deployment separately. Frontend/backend should be released together: old clients no longer receive an automatic email from `/publish`; explicit `/email` is required.

## API summary

All listed admin routes reuse the existing requireAdmin middleware and admin identity. Customer authentication and payment verification are unchanged.

- PUT /api/admin/orders/:id/memory — validated partial field update and optional timeline replacement; no email
- GET /api/admin/orders/:id/lifecycle — archive state, occasion, recent email attempts/admin activity
- POST /api/admin/orders/:id/lifecycle — link, publish, unpublish, archive, restore
- POST /api/admin/orders/:id/publish — preserved publication endpoint; no implicit email
- POST /api/admin/orders/:id/email — explicit idempotent send
- POST /api/admin/orders/:id/media — existing storage/signature detection, bounded admin upload
- PATCH /api/admin/orders/:id/media/:mediaId — caption or confirmed removal, scoped to the order

Public memory lookup remains published-only; aliases resolve through the original order. Admin edits are transactional and record action, timestamp and admin ID. Email attempts independently record admin identity and timestamp. Frontend preview is not authentication.

## Verification and limitations

Backend: 20 isolated tests passed, covering draft/published updates, validation, same order references, aliases/collisions, migration confirmation, archive/unpublish/restore/republish, payment guard, email retry deduplication, rollback, public lookup filters and rejection of customer-only authentication. Tests use database and SMTP doubles; they do not prove real PostgreSQL integration or delivery. Syntax checks passed for the changed route modules.

Frontend: existing integrity/SEO checks plus updated lifecycle checks passed (9 tests). These validate scripts, resource/navigation targets and indexing, not full browser interactions.

Desktop/mobile screenshot attempts using the browser tool and headless Edge stalled or produced no image. Screenshots and interactive mobile/desktop verification remain outstanding; no screenshot is claimed. A temporary local test fixture uses only fictional data. Core workflows still require a staging end-to-end run: file signature rejection, successful upload/cleanup on transaction failure, public content refresh, caption rendering, aliases, email failure/retry and recovery. No production verification is claimed.
