# SOLIDTEC site statistics



Public dashboard shell: https://solidtec.dk/dashboard/

Independent counter and private reports: https://solidtecdk-statistics-service.vercel.app

Vercel project: solidtec.dk-statistics-service. Root directory: statistics-service.

Storage: separate private Blob store in Frankfurt. No dependency on preview application,

its Supabase project, sales records, hosting lifecycle or private dashboard.



## Dashboard



The dashboard always starts with solidtec.dk. Select consults.dk

to inspect that site independently; there is no combined view. Reports cover 7, 30 or 90

Danish calendar days and show pageviews, today's views, daily average, countries,

device categories, page/language distribution, a daily chart and selected-site CSV export.



Login uses an emailed, single-use link for lt@solidtec.dk. DASHBOARD_ACCESS_KEY is

the server-side signing secret and is never sent to the browser during mail login.

Never commit keys, tokens, login files or browser sessions. A short-lived session

stays in memory while viewing the dashboard; logging out clears it.



## Collection and privacy



The existing static image counters use fixed allowlisted categories:

solidtec/da, solidtec/en, consults/da, consults/en.

No changes to those website counters are required for country/device enrichment.

Preview's private pages and existing dashboard remain excluded from this counter.



Country is an approximate ISO country category from Vercel's x-vercel-ip-country

request header. VPNs, proxies and provider geolocation affect accuracy. Outside

Vercel or without a usable header, country is ZZ (unknown). City, postcode, latitude

and longitude are not read. Device is a coarse computer/mobile/tablet/unknown

category inferred server-side from the request's existing user-agent header.

No raw IP, referrer, full URL, full user-agent, cookie or visitor identifier is stored.

No browser fingerprinting, tracking script or analytics cookie is used.



Each counted image load writes an immutable private object containing only {"views":1}.

Keys: views/YYYY-MM-DD/site/page/COUNTRY/device/server-generated-random-id.json.

The random object key is not sent to the browser and cannot identify a returning visitor.

Legacy keys without country/device remain readable and contribute to totals as unknown.

Country and device information cannot be reconstructed for historic pageviews.



These are PAGEVIEWS, not unique people, sessions or real-time visitors. Reloads count

again. Known bots, DNT and GPC are excluded; unrecognised bots may still count. Failed

or blocked images do not count. Site availability never depends on a successful write.

Hosting operational logs are separate from this private statistics dataset.



## Period comparisons



Totals and charts can be compared with the immediately preceding equally long period.

Percentage changes are omitted when there is insufficient retained history or a zero

previous total. Historic absence is not presented as a measured percentage increase.

The current day is incomplete; calendar-day comparisons include that partial day.

Reports scan the retained dataset (maximum 100,000 selected objects) and preserve

site separation. Dates use Europe/Copenhagen. Daily cleanup deletes counts older

than 90 calendar days. A previous 90-day period lies outside retention and is incomplete.



## Deployment and operations



GitHub main updates deploy the dashboard through GitHub Pages and the API through

the separate Vercel project. Existing website DNS stays on GitHub Pages.

BLOB_READ_WRITE_TOKEN is supplied by the private store connection.

CRON_SECRET authenticates daily cleanup. Only the image counter is intentionally

public; report requests require an owner session and an approved dashboard origin.

Storage/hosting usage quotas and any applicable billing remain in effect.



## Validation



Run npm test for legacy/enriched aggregation, country and device categories, site

isolation, history limitations, Copenhagen dates, opt-outs and authorization.

Browser QA covers default site, no combined option, country/device rendering, chart

inspection, period changes, selected-site CSV, mobile/desktop layout and logout.

Deployment verification must confirm an actual public view writes an enriched record,

the authenticated report returns country/device totals, invalid login is denied, and

the live dashboard renders the new data. Local sample data are labeled and never

written to production storage.



## Exclude testing IPs



After logging in, open "Ekskluder testbesøg efter IP". "Ekskluder min IP" saves the

trusted current address immediately. Alternatively enter up to 50 exact IPv4/IPv6

addresses or CIDR networks and save. Removing a rule resumes future counting.

Rules apply across solidtec.dk and consults.dk, only to this image counter; they do not block

websites, login, reports, or preview's independent existing activity dashboard.



Only Vercel's x-vercel-forwarded-for is used in production. Generic forwarded

headers cannot override it. IPv4-mapped IPv6 and compressed IPv6 are handled by

Node's BlockList. The request IP is compared transiently and never added to a

pageview record. Owner-entered exclusions are saved separately in the PRIVATE

settings/ip-exclusions.json object, read without cache. Changes use ETag leases

to prevent a stale session overwriting newer edits. On settings-read failure,

the pixel still loads but the visit is not counted.



IP exclusion affects future views only: historical pageviews contain no addresses

and cannot be retrospectively filtered. A tester may have different IPv4, IPv6,

Wi-Fi, mobile or VPN addresses; add each relevant address. The dashboard resets to

solidtec.dk on page restoration as well as initial load, and removes obsolete options.



## Independent mail login



The dashboard owner is lt@solidtec.dk. No preview service, Supabase or shared login is used. Configure these production values on solidtec.dk-statistics-service:

DASHBOARD_ADMIN_EMAIL=lt@solidtec.dk

DASHBOARD_SMTP_HOST=send.one.com (or your approved mail provider)

DASHBOARD_SMTP_PORT=465

DASHBOARD_SMTP_USER=lt@solidtec.dk

DASHBOARD_SMTP_PASSWORD=the mailbox password, saved only as a Vercel Secret.

DASHBOARD_ACCESS_KEY remains server-only as the signing secret.



Mail links expire after 15 minutes and can be used once; private Blob ETag writes prevent simultaneous redemption. At most two links can be requested per UTC hour. The resulting session expires after one hour and is kept in memory and sessionStorage for the current tab, so refreshing preserves login until expiry. Logout clears it. Once the SMTP sender is configured, the old password no longer authorizes reports or settings. Until then the old login remains available to avoid locking out the owner.



Preview counts are no longer collected or returned by this service. Existing retained preview objects are not deleted by this change and expire through the normal retention process. IP rules here apply only to solidtec.dk and consults.dk.




## CONSULTS contact production operations

The shared contact API is deployed in Vercel project `solidtec.dk-statistics-service`, root `statistics-service`. Production forms call `https://solidtecdk-statistics-service.vercel.app/api/contact`.

Configure `CONSULTS_SMTP_PASSWORD` as a Sensitive/Secret Production variable directly in Vercel. Never request, print, decrypt, commit or download the credential. `CONSULTS_SMTP_USER` defaults to and must equal `info@consults.dk`. Optional `CONSULTS_SMTP_HOST` and `CONSULTS_SMTP_PORT` inherit `DASHBOARD_SMTP_HOST` and `DASHBOARD_SMTP_PORT` (default 465). Port 465 uses implicit TLS; other ports require STARTTLS. `CONSULTS_CONTACT_RECIPIENT_EMAIL` defaults to `info@consults.dk`. Deploy after environment changes. Existing `DASHBOARD_SMTP_*` and optional `SOLIDTEC_FROM_EMAIL` remain SOLIDTEC settings.

Without the CONSULTS credential, owner mail falls back to the existing SOLIDTEC SMTP identity and CONSULTS customer copies are suppressed. This fallback is not completion of dedicated sender verification.

CONSULTS explicitly opts in with boolean `copyToSender:true`; SOLIDTEC uses `copy:true`. The server selects the brand from the allowlisted Origin, never a supplied recipient. Owner delivery happens first. CONSULTS owner mail replies to the visitor; its separate customer copy replies to `info@consults.dk`. If owner delivery fails, return 503 and do not send a copy. If only the copy fails, return 200 `{ok:true,copyRequested:true,copySent:false}`; show partial success and do not automatically resubmit. SMTP acceptance does not prove inbox delivery.

Run `npm test` (34 tests after the 2026-10-26 test corrections), including contact delivery tests that mock only SMTP transport and never use production credentials. PR #17 was closed without merging; the implementation already reached main through PR #16. Use the deployed commit, not PR #17's historical test count, for release evidence.

### Production acceptance record

Record deployment ID, commit, timestamp, environment metadata only, request/result and received mail evidence. Verify:

- CONSULTS without copy: one owner mail, no customer copy; API copyRequested=false/copySent=false.
- CONSULTS with copy: one owner mail and one separate customer mail; copyRequested=true/copySent=true.
- Actual received From is CONSULTS <info@consults.dk>; owner Reply-To targets visitor; customer Reply-To targets info@consults.dk. Verify Reply in the mail client and record redacted authentication headers (SPF/DKIM/DMARC).
- Danish and English HTML/plain text, mobile rendering, special characters and escaped HTML.
- Controlled transport rejection after owner acceptance: partial success, no automatic owner resend; first-send rejection: 503 and no copy. Automated transport tests cover these branches; production inbox/UI evidence is a separate acceptance item.
- SOLIDTEC with and without copy retains info@solidtec.dk recipient, approved existing sender, branding and Reply-To.

Do not mark received-message or mailbox-header checks passed from an API response alone. Keep missing evidence explicitly pending.
