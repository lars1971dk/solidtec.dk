# SOLIDTEC site statistics

Independent statistics service for solidtec.dk, consults.dk and preview.solidtec.dk.
The mobile dashboard is served by GitHub Pages at https://solidtec.dk/dashboard/.
This service must use its own Vercel project and private Blob store. It does not import
or depend on the preview application, Supabase project, sales database, or dashboard.

## Deployment

1. Import lars1971dk/solidtec.dk as a NEW Vercel project named solidtec-site-statistics.
   Framework: Other. Root Directory: statistics-service. Node.js: 22 or 24.
   Use npm install, leave Build Command empty. Do not change the website's DNS.
2. Create a PRIVATE Vercel Blob store in Frankfurt and connect it only to this project.
   Confirm BLOB_READ_WRITE_TOKEN is present for production.
3. In project environment variables set DASHBOARD_ACCESS_KEY to a randomly generated
   password of at least 24 characters (32 or more recommended), and CRON_SECRET to a
   separate randomly generated value of at least 24 characters. Keep both private.
   Enter them directly in Vercel; never commit them. The first key is the dashboard login.
4. Redeploy production. Ensure the production /api/view endpoint is publicly reachable;
   protect reports with the application key, not Vercel's deployment login.
5. Set the statistics-api meta tag in dashboard/index.html to the actual production
   URL (https://PROJECT.vercel.app, no trailing slash).
6. Add one static, non-identifying image counter to each public page only:
   <img src="https://ACTUAL-SERVICE-HOST/api/view?site=solidtec&amp;page=da"
     width="1" height="1" alt="" aria-hidden="true" crossorigin="anonymous"
     referrerpolicy="no-referrer" style="position:absolute;pointer-events:none">
   Allowed categories: solidtec/da, solidtec/en, consults/da, consults/en, preview/home.
   The endpoint must be verified before enabling these tags.
   For preview, include the counter only when search_public is true in page().
   Do not instrument private claims, uploads, payment pages, dashboards or form input.
7. Open solidtec.dk/dashboard/, enter the key and verify all three totals using controlled
   page loads. Save the dashboard to your phone's home screen.

The dashboard is intentionally disabled until its service URL is configured. There
are no sample or fabricated live counts. Existing first-party preview analytics
remain in place. Google Analytics and its consent banner are removed separately.

## Measurement and privacy

Each successful public-page image load increments a count. Refreshes count again.
These are pageviews, NOT unique people or sessions. Browser image blocking, DNT/GPC,
known bots and network outages affect totals. No historical visits are reconstructed.
Request parameters are fixed allowlisted site/page categories; no browser script,
device fingerprint, URL query, referrer, IP, user agent or visitor identifier is saved.
A server-generated random key is only an internal storage object name, never a
visitor identifier. Private objects contain only {"views":1} and day/site/page categories.
Dates use Europe/Copenhagen. Daily cron deletes counts older than 90 calendar days.
Hosting providers may keep operational logs separately; review hosting privacy
settings and update the public privacy notice before activating collection.

## Cost and limits

This is intended for low-traffic sites. Each counted view creates one small private
object and one storage write; reports list objects. Existing hosting and storage
quotas and charges apply. Reports stop rather than silently truncate beyond 100,000
selected entries. Bots and deliberate fake requests can distort public counters.
For substantial traffic migrate to atomic database aggregates.

## Validation

Run npm test. Browser QA confirms the mobile dashboard's setup state. After deployment
verify storage access, public image response, denied unauthorized reports, authenticated
reports, real counts and cron retention. Do not claim collection is live until then.
