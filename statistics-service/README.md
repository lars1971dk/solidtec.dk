# SOLIDTEC site statistics

Public dashboard shell: https://solidtec.dk/dashboard/
Independent counter and private reports: https://solidtecdk-statistics-service.vercel.app
Vercel project: solidtec.dk-statistics-service. Root directory: statistics-service.
Storage: separate private Blob store in Frankfurt. No dependency on preview application,
its Supabase project, sales records, hosting lifecycle or private dashboard.

## Dashboard

The dashboard always starts with solidtec.dk. Select consults.dk or preview.solidtec.dk
to inspect that site independently; there is no combined view. Reports cover 7, 30 or 90
Danish calendar days and show pageviews, today's views, daily average, countries,
device categories, page/language distribution, a daily chart and selected-site CSV export.

Login uses DASHBOARD_ACCESS_KEY, supplied only through Vercel's production Secret.
Never commit the key, tokens, login files or browser sessions. The key stays in memory
while viewing the dashboard; logging out clears it. The minimum supported length is
12 characters. Prefer a long randomly generated key when setting up a new installation.

## Collection and privacy

The existing static image counters use fixed allowlisted categories:
solidtec/da, solidtec/en, consults/da, consults/en, preview/home.
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
public; report requests require the dashboard key and an approved dashboard origin.
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
