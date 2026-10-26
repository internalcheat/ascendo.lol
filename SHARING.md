# Sharing operation

GitHub Pages remains the host and deployment source. Keep the existing DNS records,
mail records and CNAME. Cloudflare setup is not used by this feature. The existing
Turnstile login check remains as it was.

## Release order

1. Apply the additive private export-cache and GitHub runner migrations.
2. Deploy profile-api with its deno.json/import map, jose 6.1.3 and existing native
   authentication. The gateway's existing verify_jwt:false setting is intentional:
   the handler checks native owner sessions or, only on runner routes, GitHub OIDC.
3. Review the profile-sharing branch workflow. Only its health check is authorized;
   it cannot claim jobs, read the export queue or publish files.
4. Merge the reviewed PR after unit, database and native capture checks pass.
5. The main workflow can claim jobs, render exports, commit updated per-profile
   HTML and explicitly request a Pages build. Verify that build and live HTML.

The official checkout, setup-node and upload-artifact actions are pinned to commits.
Standard public-repository runners are used. No paid runner, Browser Run or automatic
upgrade is configured. Repository Actions policies must permit contents:write,
pages:write and id-token:write for the production job. If a policy denies this,
the workflow fails visibly; copy-link/QR remain available.

## Queue and freshness

The schedule is approximately every five minutes, offset from the hour. GitHub may
delay scheduled runs, and may disable schedules after 60 days of repository
inactivity. Check the Actions tab if the queue stops. A queued job expires after
two hours; a claimed rendering lease lasts five minutes. A failed or timed-out
export can be retried. Each job has a 45-second capture deadline.

Metadata is generated from current saved profiles, including newly claimed handles,
not a public directory. Each profile gets its actual card content and escaped
Open Graph tags in initial HTML. Browsers and crawlers receive the same page.
Unlisted profiles retain noindex,nofollow and receive no navigation entry.
/nagyorru/ remains the existing redirect; /Szikraaaa/ keeps its capitalization.
Unclaimed and nested missing paths remain genuine Pages 404 responses.

Saved settings are still fetched normally by the public app. Initial metadata
refreshes only after a successful workflow and Pages build, not immediately on
Save. Discord can cache a previously posted preview longer. No Discord test
message is sent by automation.

## Credentials and access

Only the exact repository ID, owner ID, main ref, workflow path, allowed event and
RS256-signed GitHub OIDC identity may use production runner routes. Tokens have a
fixed audience, short expiration and trusted GitHub JWKS. Branch health checks
can verify identity but cannot access any other runner operation.

The editor submits only the expected saved revision. Owner IDs, slugs, URLs,
capabilities and draft settings are never accepted as capture selections. Native
owner session checks remain mandatory. Private RPCs are service-role-only, the
cache table has RLS with no client policies, and the PNG bucket is private.

The browser is a fresh isolated context with no login token. Chrome receives a
minimal environment without GITHUB_TOKEN or OIDC credentials. Requests are
restricted to approved public HTTPS assets and supported media providers;
private API/storage paths, media playback and arbitrary hosts are blocked.
The renderer serves checked-out public assets under their usual HTTPS addresses,
without a localhost server. Browser automation does not run on the owner's PC.

## Exports and storage

Render the saved profile at 1280 CSS pixels, DPR 1.5, to a 1920px-wide full-height
PNG. No content is cropped to meet limits: over 16,000px or 20 MiB is an error.
Navigation, volume controls, cursor decorations and entrance screens are excluded.
Finite reveals finish; looping effects are captured as a still. Background-video
posters avoid playback/audio. Unavailable provider frames become static tiles.
The address footer has reserved space and cannot cover a widget.

The cache retains at most one completed derived image per owner/revision/renderer
for 24 hours, uses five-minute signed downloads and reserves storage up to 100 MiB.
At most two jobs are active, ten starts per owner per UTC day and twelve starts
site-wide per UTC day, with a 30-second per-owner cooldown. Cleanup removes only
UUID-named derived PNGs from profile-shares, never profile media or downloads.
Limits are deliberate shared-service limits; no paid fallback is attempted.

## Verification and rollback

Run npm test and tests/profile-sharing.sql (the latter rolls back fixtures).
Native browser tests run in GitHub Actions and upload seven-day fixture screenshots,
without owner credentials, saving profiles or accessing private editor drafts.
Confirm runner health, PNG dimensions, metadata with JavaScript disabled, signed
download expiration, native Auth enforcement, CNAME and original download hashes.
Physical-phone QR checks and Discord message previews require the owner.

To pause sharing, disable only the Profile sharing workflow in GitHub Actions.
Existing public pages keep working; link copying and local QR creation remain.
To roll back the UI/API, restore their reviewed previous commit/function version.
The additive private tables and columns may remain; no profile data needs a rewrite.
No DNS rollback is needed because no DNS settings were changed.
