# Contact production verification — 2026-10-26

Status: backend and production SMTP acceptance verified; received mail/header and interactive mail-client checks remain pending.

Baseline deployed commit: fe6775bc768c1c01f22af8a2160469f0a1080c35.
Production deployment: dpl_DdEqjFE1qqAfWkTF5DjheLoosnLR (READY).
CONSULTS_SMTP_PASSWORD metadata: sensitive, production only; created before this deployment. No secret values retrieved or displayed.

Live POST tests against https://solidtecdk-statistics-service.vercel.app/api/contact:
- CONSULTS, no copy: HTTP 200, {"ok":true,"copyRequested":false,"copySent":false}.
- CONSULTS, explicit copy: HTTP 200, {"ok":true,"copyRequested":true,"copySent":true}.
- SOLIDTEC, explicit copy: HTTP 200, {"ok":true,"copySent":true}.
Test messages explicitly identified as SYSTEMTEST; visitor/copy destination lt@solidtec.dk. These results prove server-side completion of SMTP send calls, not final inbox placement.

Live CONSULTS Danish HTML inspected: copyToSender checkbox and boolean payload correct; partial success text states owner enquiry sent and copy failed; no automatic retry. Actual UI interaction, English/mobile rendering and received mail headers were not verified.

Local validation with installed dependencies: npm test, 34 passed, zero failed. Contact subset: 16 passed. Tests exercise sendContact owner-first ordering, no-copy, copy success, copy rejection returning partial success, owner failure stopping copy, missing dedicated credential suppressing copy, sender/Reply-To isolation and invalid SMTP user rejection. SMTP transport is mocked; no credentials or external mail used by local tests.

Remaining closure evidence: received owner/copy messages, actual From and Reply-To headers and reply actions, SPF/DKIM/DMARC results, inbox/spam placement, Danish/English desktop/mobile appearance, SOLIDTEC no-copy live test. No mailbox connector is available in this session; do not mark these checks complete from SMTP acceptance alone.

