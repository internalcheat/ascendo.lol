# Profile sharing rollout

GitHub Pages remains the website source. Neither Worker changes profile settings,
credentials, original media, downloads, or `CNAME`. This rollout requires the
owner's Cloudflare account authorization. Never put account tokens, access codes,
the capture secret, or a DNS export in this repository.

## Staging first

1. Run `npm ci`, `npm run build:qr`, and `npm test`. The QR dependency is pinned
   to `qrcode@1.5.4`; its MIT notice is in `vendor/qr.LICENSE`.
2. Apply the additive `profile_share_exports` migration and deploy the compatible
   `profile-api` bundle. The new API stays disabled until all capture secrets
   and the explicit free-plan confirmation are present. Existing clients work.
3. Publish the reviewed `profile-sharing` branch. Authorize official Wrangler
   using device login, with OS-keyring storage on Windows. This does not activate
   a domain route or change nameservers.
4. Deploy `worker/wrangler.jsonc` with environment `staging`. Its origin is the
   reviewed branch on raw GitHub, so unpublished frontend assets can be tested.
   The Worker supplies JavaScript/CSS content types for those staging assets.
5. Confirm in the Cloudflare account that Workers and Browser Run are on the
   **Free** plan. Do not subscribe to a paid plan or attach paid usage. Leave
   `FREE_PLAN_CONFIRMED=false` if this cannot be verified.
6. Generate a random 32-byte capture key with a trusted local secret generator.
   Set `SHARE_CAPTURE_KEY` as a Worker secret and the corresponding Supabase
   secret using protected input; never put its value in a command argument,
   screenshot, chat message, configuration file, or Git history.
7. Deploy `worker/wrangler.capture.jsonc` with environment `staging`, setting
   `CAPTURE_ORIGIN` to the metadata staging Worker's HTTPS origin. Once Free is
   verified, explicitly set `FREE_PLAN_CONFIRMED=true`. The BROWSER binding calls
   native Browser Run snapshot actions, with no owner token or API credential in
   the browser. Only the private Worker request carries the shared capture key.
8. Test SSR metadata, canonical redirects, new handles and unknown URLs on the
   metadata staging host. Test real captures through the protected capture Worker
   and an isolated authenticated fixture, without enabling any production effects.
   Check native 1280px viewport / 1.5x scale, long layouts, footer space, muted
   media, selected fonts, loading failures, provider tiles, timeout and quota paths.
   Do not reload an owner's open studio draft for these checks.

The capture origin is an operator-controlled setting, never user input. Capture
network access is restricted to public Ascendo/Supabase assets and the explicit
provider host allowlist in `share-capture-policy.mjs`. Media requests are blocked;
the profile uses posters/stills and never starts audio in capture mode.

## Production activation

Only continue after staging passes and the focused PR is reviewed and merged.

1. Export the **complete current DNS zone** privately from the existing provider.
   Include A/AAAA/CNAME, MX, TXT, SPF, DKIM, DMARC, CAA, verification records,
   subdomains, TTLs and DNSSEC status. Reconcile every record against Cloudflare's
   import; a DNS scan alone is not sufficient. Do not guess mail records.
2. Add the domain to Cloudflare on its free plan. Preserve the existing GitHub
   Pages targets and `CNAME`. Proxy only the website hosts needed for the Worker;
   keep mail records and unrelated services in their appropriate DNS-only state.
   Set valid origin TLS (Full strict when the GitHub Pages certificate is ready).
3. Give the owner a concrete record comparison, exact proposed nameservers and
   rollback instructions. The owner completes any registrar sign-in or nameserver
   change. Coordinate existing DNSSEC/DS with the provider to avoid a validation
   outage. Do not remove or replace unrelated records.
4. Deploy the production metadata Worker with **no ORIGIN_URL**. Its `fetch`
   subrequests use the original GitHub Pages origin. Add a Workers **route** for
   `ascendo.lol/*` on the existing zone; do not replace it with a Workers custom
   domain. Configure `request_limit_fail_open=true` ("fail open" on route limit)
   through the route API/dashboard. Confirm the deployed route's actual setting;
   a comment in source is not activation.
5. Deploy the production capture Worker with `CAPTURE_ORIGIN=https://ascendo.lol`
   and a protected capture key. Set Supabase secrets `SHARE_CAPTURE_URL` to its
   `/capture` URL, `SHARE_CAPTURE_KEY` to the same key and
   `SHARE_BROWSER_FREE_CONFIRMED=true` only after verifying the Free plan.
6. Confirm the Pages commit, normal profile HTML metadata without JavaScript,
   `/nagyorru/`, `/Szikraaaa/`, newly claimed handles, real 404s, login, media and
   both original JAR hashes. Verify the owner Share dialog and real PNG download
   while preserving any dirty draft. Test QR decoding independently and on the
   owner's phones where available; automated decoding does not claim phone tests.
7. Inspect Discord's current preview-debugging tools if available. A real Discord
   message is sent by the owner or only after their explicit authorization.
   Already-posted Discord embeds may remain cached despite the 30-second metadata
   cache; changing profile metadata does not force Discord to refresh old messages.

## Limits and cache

`POST /share/card` accepts **only** `{revision}`. Auth/session verification resolves
the owner's canonical record; no URL, owner, slug, draft or capability is accepted.
`GET /share/card` exposes only that owner's status and a 5-minute private signed
download link. Captures use the saved revision, then recheck it before publishing
the derived PNG and again in the database transaction.

There is one active job and at most one completed export per owner. Completed
exports are keyed by owner/revision/`SHARE_RENDERER`, expire after 24 hours, and
are stored in private bucket `profile-shares`. Jobs have a 60-second lease, a
45-second request deadline, a 30-second generation cooldown, a 10-per-owner daily
ceiling, a conservative global 12-per-UTC-day ceiling and at most two active jobs.
The real provider can reject earlier when its shared free allowance is consumed.
No fallback enables paid billing. Link copying and QR exports work independently.

The cache reserves 20 MiB per pending job, accounts for actual bucket objects as
well as completed rows, and evicts only derived exports to stay within 100 MiB.
PNGs must be 1920px wide, at most 16,000px tall and at most 20 MiB. Larger profiles
receive an error instead of cropping. Cleanup runs through the existing protected
scheduled cleanup route and status/generation requests. It can remove only
validated UUID/UUID.png paths from the dedicated export bucket, never profile media.

## Rollback

Disable/remove the metadata Worker route to return website traffic directly to
GitHub Pages. Set `SHARE_BROWSER_FREE_CONFIRMED=false` and
`FREE_PLAN_CONFIRMED=false` to stop new captures while retaining link and QR use.
Keep the additive private cache migration in place; it is harmless to old clients.
Do not delete original media or alter profile records to roll back sharing.

If the DNS migration itself must be reverted, restore the privately recorded
original registrar nameservers and coordinate DNSSEC/DS with the original provider.
Keep the original zone operational during propagation. Existing recorded mail
records and website records must remain intact on both sides during the change.

Official references:
- https://developers.cloudflare.com/browser-run/quick-actions/snapshot/
- https://developers.cloudflare.com/browser-run/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/routing/routes/
