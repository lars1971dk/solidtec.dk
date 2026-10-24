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


## Separate CONSULTS sender identity (24 October 2026)

Both websites use the existing `/api/contact` endpoint, but **From** must match
the authenticated SMTP account to avoid sender mismatch or spam rejection.

- SOLIDTEC remains unchanged: `DASHBOARD_SMTP_USER` + `DASHBOARD_SMTP_PASSWORD`,
  sender `lt@solidtec.dk`.
- CONSULTS sends as `CONSULTS <info@consults.dk>` only after its OWN active
  mailbox credentials are configured on the Vercel **production** environment.
- On the same one.com provider, create `CONSULTS_SMTP_PASSWORD` (Sensitive),
  the password of the mailbox `info@consults.dk`; username defaults to
  `info@consults.dk` and host/port inherit `send.one.com:465` from the existing
  SMTP configuration.
- If CONSULTS email is hosted elsewhere, additionally set
  `CONSULTS_SMTP_HOST`, `CONSULTS_SMTP_PORT` and optionally
  `CONSULTS_SMTP_USER` (which must equal `info@consults.dk`).
- **Never** copy these credentials to GitHub, client JavaScript or chat.
  Redeploy the Vercel production project after updating the environment.
- Until the dedicated SMTP password is configured, the existing functional
  SOLIDTEC sender is retained as a temporary fallback, so the CONSULTS contact
  form does not suddenly stop working. Do not declare the sender corrected
  until an actual test email visibly has the proper From address.

The server continues to select the recipient by validated browser Origin.
`Reply-To` continues to be the visitor's email for direct replies.


## Branded CONSULTS enquiry email and visitor copy (24 October 2026)

The CONSULTS contact endpoint now returns optional `copyRequested` / `copySent`
flags. The browser sends `copyToSender: true` only when the visitor explicitly
checks the new opt-in checkbox; SOLIDTEC continues its previous behaviour.

The CONSULTS owner email is a responsive HTML layout with text fallback:
dark navy CONSULTS branding, orange accent, structured contact data,
plainly displayed message, and a direct reply link. All visitor content
is HTML-escaped and displayed as text. No remote tracking pixels.

A requested customer copy is sent **separately** to the visitor's own
validated email, never by adding a client-controlled recipient to the
main owner message. It has its own thank-you heading and a Reply-To of
`info@consults.dk`. Customer copies are only sent after the independent
`CONSULTS_SMTP_PASSWORD` has been set. If the owner message succeeds
and the copy fails, the API reports `{ok:true,copySent:false}` rather
than inviting an automatic resend that would duplicate the owner email.

Until the protected CONSULTS SMTP credential has been configured,
the existing SOLIDTEC-authenticated SMTP delivery remains the temporary
owner-mail fallback and the customer copy cannot be sent. This is not
a finished sender-identity configuration. Authenticate as
`info@consults.dk` before claiming that the visible sender has changed.
