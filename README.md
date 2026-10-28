# ASCENDO.LOL · Founder Profiles

A curated GitHub Pages site with a private, invite-only profile studio. There is no public signup, directory, or profile-creation form.

## Pages

- `/`: the real Ascendo logo, Client 26.3 Discord link, founder cards, and decorative floating phrases on black.
- `/plugins/`: AscendOSit and AscendOEnchants experimental builds for Paper 26.3, with direct JAR downloads.
- `/internalcheats/`: InternalCheats; Discord `internalcheats`; Minecraft IGN `InternalCheat`.
- `/k3rlsen/`: k3rlsen; TikTok `@ferenckop`; Instagram `@_shewantss.csxngi`; Discord `27ia`.
- `/nagyorru/`: compatibility redirect to `/internalcheats/`, with a visible fallback link.
- `/404.html`: minimal custom 404 preview. GitHub Pages serves the same hero for unknown routes while retaining HTTP 404.

Profiles open immediately. The existing video attempts playback with audio, falls back to muted playback when required by the browser, and has an accessible sound control. Hover or focus the sound button to expand the slider; tap/click to pin it open or close it. Escape or an outside tap closes it. Adjusting the slider is a user interaction that can enable audio. Content remains visible if JavaScript or media is unavailable.

## Design and motion

The private studio's **Style → Profile color theme → Black & White** option gives that profile's card, text effects, soundtrack controls, decorative overlays, back button and volume control a monochrome finish. The avatar and background music video, including their poster fallbacks, retain their original colors and existing brightness treatment; the theme adds no darkening or grayscale filter to them or their ancestors. Original accent/effect colors and media remain stored unchanged, so switching to **Original colors** restores them. It previews privately, participates in draft/discard/reset/previous-version handling, and becomes public only on Save changes. Missing `colorTheme` defaults to `original`; the backend accepts only `original` / `monochrome` and preserves the saved value when an older client omits it. It never changes the homepage or another profile. No database migration is needed. The refined visual stylesheet uses cache version `20261025-8`.

Frosted profile cards, white name glow, and restrained glass highlights share `styles.css`. Homepage entrance animations and 2.5-second floating phrases (0.5-second fade in, 1.5-second drift, 0.5-second fade out) respect reduced-motion preferences. Phrases are decorative, avoid the central controls, are limited to four on desktop and two on mobile, and stop spawning in hidden tabs.

Same-origin navigation uses native cross-document view transitions where available, with a short fade fallback for marked links. Modified clicks and external new-tab links keep standard browser behavior.

`motion.js` coordinates 500ms entrance reveals, desktop pointer lighting, and critically damped artwork movement. Hit targets and text stay stationary. Artwork displacement is limited to 4px (2px for icons), tilt to 1 degree, and velocity blur to 1.5px. One on-demand animation loop stops when settled, hidden, scrolled, or resized; touch and reduced-motion preferences disable pointer effects. Eight consecutive frames exceeding 24ms disable pointer effects for the current page. These effects target the display's native refresh rate, not a guaranteed FPS on every device.

Plugin descriptions reveal on desktop hover/focus or via the Details button. Phones use tap-to-expand. Escape returns focus to Details; an outside tap closes the panel. Desktop description space is reserved so download buttons do not move. Without JavaScript, all descriptions and normal download links remain visible. No plugin binaries are fetched until a download is requested.

InternalCheats's bio links to Ascendo and javitointezet, and the GitHub row links to `https://github.com/internalcheat`; each opens a new tab.

## Assets and deployment

All original media remains in `assets/`. InternalCheats uses `assets/mypfp-animated.webp`, generated from all 113 original MP4 frames at 20 fps (5.65 seconds), with a still-poster source for reduced motion and an image-error fallback. k3rlsen uses a face-and-shoulders crop in `assets/k3rlsen-mbappe.webp`; the supplied original is preserved in `assets/k3rlsen-mbappe-original.png`. The Ascendo PNG/ICO favicons are derived from the supplied purple mark. The local white GitHub mark comes from [Primer Octicons](https://github.com/primer/octicons/blob/main/icons/mark-github-16.svg). The white Discord symbol in `assets/discord.svg` comes from [Discord's brand page](https://discord.com/branding), specifically [the white symbol asset](https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d7f4ef6498ac018f2c55_Symbol.svg). `assets/minecraft-creeper.svg` is the recognizable pixel Creeper-face treatment used beside the Minecraft IGN.

Keep `CNAME` set to `ascendo.lol`. GitHub Pages deploys from `main`; verify the Pages workflow and live domain after merging. Version stylesheet/script references together when changing shared assets.

The custom 404 uses root-absolute resources, the Ascendo logo, decorative 404 artwork, three short text blocks, and Home/Plugins links. No lower recovery panels, path-copy UI, previous-page action, or footer remain. Artwork pauses offscreen/in hidden tabs and respects reduced motion. Links and all essential content work without JavaScript. There is no automatic redirect; verify an actual missing URL, including a nested route, when checking HTTP status.

## Unlisted profile maintenance

The manually authored `bal4zs/index.html` profile is intentionally absent from all site navigation and founder listings. It has `noindex, nofollow` metadata, a canonical trailing-slash URL, and no bio element. Unlisted does not mean private: the page and its assets remain publicly accessible.

The supplied 705 × 710 photograph is preserved as `assets/bal4zs-original.png`; `assets/bal4zs-avatar.webp` is a centered 512 × 512 crop (21,822 bytes). The local YouTube SVG joins the existing platform icons. External social links open new tabs with `noopener noreferrer`; Discord copies the displayed username with the shared accessible confirmation.

The shared video player accepts a hand-authored `data-background-src` value. Only this unlisted profile overrides it; existing founder profiles continue using `assets/music-background.mp4`. Its `poster` remains visible if playback fails or JavaScript is disabled. The usual instant entry, expanding volume disclosure, and muted-autoplay fallback are unchanged.

`assets/bal4zs-background.mp4` retains the full 265.00-second (4:25) source duration, 23.98 fps timing, and original AAC-LC stereo audio without re-encoding. Video is 1280 × 720 H.264/yuv420p (CRF 28, 900 kb/s VBV cap), with fast-start metadata. The derivative is **31,984,760 bytes (30.5 MiB)**; SHA-256: `141c5bc7b62d14199a5c6490bd6c53f5135a33ea331f134d60785be8b39a30b3`. The source and derivative AAC packet hashes match: `24b8edc25a9f1d038a5552ef6dc38fb4d5874445d75d37652ef6cbd0008c30a0`.

The original 106,339,817-byte download is preserved untouched outside this repository (SHA-256: `59032664573c25f6a3c110f88c0135cf369c0eff95862a7aeb64f835eb61a0f4`); it exceeds GitHub's regular-file limit and is not committed. `assets/bal4zs-background-poster.jpg` is a clean frame at 15 seconds (24,928 bytes). No other profile's media or plugin download is replaced.

## Plugin downloads

The owner-supplied JARs are hosted unchanged under `/downloads/`. Their metadata declares API version `26.3`; this website does not execute, modify, or certify the plugins. Browser download/security prompts may still appear. Keep versioned filenames immutable when publishing future builds.

| Filename | Bytes | SHA-256 |
| --- | ---: | --- |
| `AscendOSit-26.3-v0.4.2-RIGHTCLICK-HOTFIX.jar` | 35,871 | `b9899302d5533089fb168886b11c895304d833e1c7a159e0154fe1fc843a26fd` |
| `AscendOEnchants-v1.0.0-EXPERIMENTAL.jar` | 40,472 | `8cf1f5f06a4aa056db826080f7fd399247cc8b53a77254b9b2a1c7f2daa5348f` |

To add a curated profile, copy an existing profile directory and edit the identity, optional bio, links, and canonical URL. Add a founder card only for profiles intended to be listed publicly. Provision its owner privately; never embed access codes in HTML, scripts, seed files, or Git history. The studio remains invite-only, with no public signup form. `/Szikraaaa/` is an additional curated profile with a case-preserving canonical route. Its ordinary account has no reserved-badge privileges and is absent from the homepage founder list.

### Flux Lines background preset

**Backgrounds & soundtrack → Flux Lines** previews the actual React Bits Flux Lines component before Save changes publishes it for that profile. Existing background types, site defaults and saved profiles are unchanged. The owner explicitly selected Flux Lines as Szikraaaa's starting background. Its regular profile template is `supabase/szikraaaa-profile.json`, with a local S monogram, no invented bio or socials, and other optional effects OFF.

The original JSX, CSS, demo settings, license and source hashes are kept in `vendor/react-bits/`, pinned to React Bits commit `e12c22192ac7b4b452c5e2feb9b586d74765d696`. Its MIT + Commons Clause notice permits application use; this site does not provide a component or background export service. `npm ci --ignore-scripts && npm run build:flux` rebuilds the isolated React/React DOM 19.3.1 production island. The build adds readiness/error/context-loss reporting without changing the original shaders, demo motion parameters, pointer magnet or click swirl. React's license notices are preserved in the linked bundle notice.

Only a selected Flux Lines background loads its local island and component stylesheet. The canvas fills the preview/profile background behind the card, has no focus or hit targets, and uses the original passive window pointer interaction. Upstream visibility/intersection observers pause hidden/offscreen drawing; switching away, navigation and cached-history suspension unmount the island and release graphics resources. Desktop DPR is capped at 2 and mobile at 1.25. Reduced motion and data saving use the official still preview; missing WebGL 2, shader/bundle failures and context loss retain that fallback. The preset is silent; video backgrounds retain their existing music and volume behavior. There are no React Bits/Google network requests at runtime. Changed entries, shared dependencies and visual styles use cache version `20261025-9`.

## Private profile studio

The studio organizes the existing editor into **Profile**, **Appearance**, **Backgrounds**, **Effects**, and **Media**. A settings-only search (Ctrl/Cmd+K) opens matching sections across categories and highlights matching field labels; clearing it restores the previous accordion state. Search, category changes, collapsing panels and save-status inspection never create a profile draft or publish changes. Enabled effects expand their controls; turning them off collapses the panel without resetting their stored values. Invalid required fields reveal their category before focus moves there. Desktop uses a category rail, settings column and sticky private preview; tablet uses a horizontal category rail, while phones retain Edit/Preview tabs. The same preview DOM and media are reused.

Three independently floating glass icons replace the wide bottom save bar: **Save status**, **Discard**, and **Save**. Labels expand on desktop hover or keyboard focus, with touch focus support and stable slots that keep neighboring targets stationary. Save status opens the existing previous-version/reset/conflict recovery actions; Escape and outside taps close it. Current saved/unsaved/publishing/conflict state has an accessible label and a small visual indicator. Publishing, ownership, draft recovery, file uploads and backend validation retain their existing behavior. The new editor presentation uses cache version `20261025-10` and adds no animation dependency or continuous rendering loop. Reduced motion disables expansion transitions and popover entrance motion.

- `/login/` accepts a profile's private numeric access code after a Cloudflare Turnstile check.
- `/customize/` edits only the profile assigned to the authenticated account. Both pages are unlisted and marked `noindex, nofollow`.
- The studio includes identity, optional linked bio and cosmetic badge, avatar crop/still fallback, accent, card opacity, glow, nine name-effect choices, social-row ordering and link/copy actions, black/image/video backgrounds, and soundtrack title/artist.
- Changes appear in a private live preview first. **Save changes** publishes one validated settings revision. Discard, original defaults, and the previous saved version are available. A stale revision returns a conflict rather than overwriting another tab. Same-tab unpublished drafts survive a reload in session storage and are cleared on save, discard, or logout.
- Avatar and background settings accept direct public HTTPS URLs, or the upload controls. Only MP4's embedded audio is played: there is no separate audio-upload system.
- Public profiles remain immediately readable from their static HTML if JavaScript, the backend, or media is unavailable. Last fetched public settings are cached locally; credentials and editing sessions are never placed in that public cache. Search metadata/static fallback stays hand-authored.
- The homepage still lists only its original two founders. Unlisted profiles are not automatically added anywhere.

### Display-name effects

Style offers **None**, **Steady glow**, **Glitch**, **Shimmer**, **Typewriter**, **Neon pulse**, **Aurora**, **Letter wave**, and **Float**. Glitch uses aligned, clipped cyan/purple text layers rather than an almost imperceptible one-pixel nudge. Shimmer and Aurora clip their gradients to the text without the old heavy white shadow masking the colors. Unsupported gradient clipping falls back to readable white text.

Animation speed ranges from **0.5× to 2.0×**; effect strength ranges from **0–100%**. These are independent of the existing name-glow setting. Static choices disable animation-only controls, and Typewriter disables strength because it has no motion amplitude. **Replay effect** restarts only the name, not the background video or the rest of the card. Typewriter reveals once; the other animated choices loop.

The editor retains the heading node during unrelated edits so changing a bio or color does not keep restarting the animation. Letter wave uses grapheme-aware character spans where supported and a single accessible heading label. Animations pause in hidden tabs. Reduced-motion users receive a readable still name, with the reason shown in the editor; their preference is not silently overridden.

Existing saved profiles, previous versions, and drafts receive default speed `100` and strength `65` during validation. The shared server/client validator restricts effect names and numeric ranges. No stored profile content or existing selected effect is rewritten by this release. Entry modules, their changed dependencies, and affected styles use cache version `20261025-3`.

### Optional profile effects

**Custom Cursors**, **Interactive Cards**, and **Animated Entrances** are independent studio sections. Their `cursorEffects`, `cardEffects`, and `entranceEffects` JSON groups normalize to disabled defaults when absent. No migration, bulk update, or profile rewrite is needed. The same strict validator runs in the editor and the API. New settings participate in private drafts, discard/reset, previous versions, and revision-conflict protection; only Save changes publishes them. Existing public profiles remain unchanged until their owners choose otherwise.

- Cursors: fixed local Arrow/Dot/Ring/Crosshair SVG templates, accent-colored initially, 12–40px (24px default). Optional trails use 4–12 points (8 default), 0–100% smoothness (55% default); click decorations are None/Ripple/Sparks. Native pointer/text/resize/disabled affordances remain available. No submitted SVG, CSS, or cursor URL is accepted.
- Cards: independent tilt/parallax/glow presets behind the OFF master, intensity 0–100% (35% default), response 0.5–2× (1× default), capped at 6° tilt and 8px avatar displacement. Geometry comes from a stable outer boundary. Enabled cards suppress the older inner pointer lighting.
- Entrances: Fade/Slide/Zoom/Stagger, four slide directions, 250–1,200ms (600ms default), 0–32px travel (16px), 0–8% zoom (4%), and 0–120ms stagger (60ms), capped at 600ms total delay. Replay entrance affects only the private preview. Unrelated edits retain the entrance state and effects-only edits do not rebuild the avatar. The profile card no longer receives a second legacy reveal. Cached early preferences allow the full entrance; late preferences only settle already-visible content without hiding it.

Only the preview surface and that saved public profile initialize these effects; the homepage never does. Card, entrance, avatar and name animations have separate layers. Cursor/card interaction shares one on-demand frame loop, cached geometry, and bounded reusable decorations (12 trail points, 24 click particles), allocated only when needed. It stops when settled, offscreen, hidden or after sustained slow frames. Touch keeps native cursors and no hover motion. Reduced motion suppresses trails, bursts, card movement and entrances without changing saved values. Page navigation retains its existing behavior.

Pointer trails dissolve on leaving the preview instead of disappearing abruptly. Name replay skips entrance-owned animations, including a stagger on the heading. Normal navigation tears down the effect listeners and decorations; back/forward-cache navigation keeps the suspended controller for restoration. These lifecycle/replay refinements use entry/runtime/view cache version `20261025-5`; unchanged schema, policy and styles remain at `20261025-4`.

### Reserved cosmetic badges

`badge-policy.mjs` centralizes every reserved term, grouped into leadership, staff, status, Ascendo identity and authority. Update those arrays to change policy. Matching is intentionally **strict substring matching**, including the accepted false positives `Hope` (`OP`) and `Dog lover` (`OG`). It normalizes case, compatibility forms, marks, punctuation, spaces and invisible separators; bounded trie states detect ambiguous leetspeak without exponential spelling expansion. Bidi controls are rejected even for privileged owners. Ordinary Unicode and emoji remain valid when they do not match a reserved term.

The pinned local `vendor/unicode-confusables-18.mjs` contains all **6,712 mappings** derived from [Unicode 18.0 confusables](https://www.unicode.org/Public/18.0.0/security/confusables.txt), following the [Unicode security guidance](https://www.unicode.org/reports/tr39/tr39-34.html). Upstream source SHA-256: `6ed3ee967c9dfdf6677d563c9985182fbc50a2efb7d6059cd57b2e2ce18f5b92`. Its required notice is in `vendor/UNICODE-LICENSE.txt`. No remote lookup is needed to validate a badge.

Authorization is separate in the backend-only `supabase/functions/profile-api/badge-authority.mjs`: only the authenticated owners of the canonical `internalcheats` and `k3rlsen` records are authorized. The record comes from the private owner mapping, never submitted names/slugs, editable metadata, badge contents, or client capability flags. All other profiles, including bal4zs, remain regular accounts. Explicitly review this allowlist before authorizing any future profile.

Authenticated GET `/me` exposes `capabilities.canUseReservedBadges` solely for editor feedback. Every save recalculates authority from the trusted record and validates the badge **before copying media or storing settings**. Rejected badges return HTTP 400 with exactly `This badge contains a reserved word.`; the editor shows the same inline accessible message and blocks submission. Public rendering intentionally does not apply an unauthenticated badge blacklist, so legitimate stored founder/administrator badges remain visible.

This release uses cache version `20261025-4` for changed entry modules, their dependencies, and affected styles. Verification uses isolated fixtures for enabled-effect save/restore/conflict checks, not automatic production-profile changes. Deploy the backward-compatible Edge Function with the shared schema, badge policy, Unicode module and authority module before updating Pages. Keep the existing native-Auth/session checks and disabled gateway JWT setting intact.

## Typography, layouts and atmosphere

The studio has separate **Fonts**, **Text Sizes**, **Card Layout**, **Electric Border** and **Overlays** sections. All changes remain private until Save changes. Missing JSON groups normalize to the original DM Sans / Auto sizes / Classic card / disabled electric border / disabled overlays. Existing saved effects and profiles are not rewritten. The server preserves omitted visual/effect groups for older clients while still validating explicitly submitted values.

### Self-hosted typography

`fonts.css` defines DM Sans, Inter, Space Grotesk, Sora, Outfit, Playfair Display, Cinzel and JetBrains Mono. Display and body pickers are independent; only faces actually used by the page are fetched. The base interface still uses local DM Sans. Every page, including login, legacy redirect, plugins and 404, uses local font delivery with no Google Fonts stylesheet or preconnection. Editor/login font CSP is restricted to self. The original eight families have Latin and Latin Extended variable WOFF2 subsets, normal weights 400–700, `font-display: swap`, and system-script/emoji fallbacks. Font loading refreshes effect geometry without replaying names or entrances.

Font binaries come from the pinned official `@fontsource-variable/*@5.3.0` npm packages. Each archive's published SHA-512 integrity was checked before extraction. `assets/fonts/SOURCES.json` records package URLs, byte counts and SHA-256 hashes; individual OFL notices accompany the files. No arbitrary font URL, uploaded font, SVG or CSS is accepted.

Text sizes have an Auto state preserving the original responsive rules and explicit pixel controls: name 24–72; badge 10–20; bio 12–24; social label 10–20; social handle/link 12–26; soundtrack title 12–24; artist 10–20; soundtrack labels/status/time 9–16. Long text wraps; selected custom sizes are not silently shrunk. No separate profile-handle or location field is introduced.

### Four compositions

Classic keeps the original 460px centered glass card. Crest overlaps the circular avatar over its upper edge. Portrait allows 720px and places the existing avatar in a tall rounded frame beside the identity at container widths of 560px or more. Bento allows 960px, placing the identity beside existing social/soundtrack tiles at 760px or more. Tiles use one column below 480px. Container-aware rules work in both the public page and the private pane; unsupported container queries fall back to the stacked layout.

Expand preview moves the existing preview DOM/video into an accessible wide dialog, without creating a second soundtrack or discarding the draft. Escape/Close returns it and restores focus. Avatar and heading nodes survive typography/layout edits. The existing card interaction uses separate stable boundaries for Bento's sibling cards rather than tilting the entire wide grid or stacking nested tilts.

### Electric outlines and layered overlays

Electric Border defaults OFF, with independently selectable main card, social/soundtrack panels and avatar targets. Its initial color matches the accent; intensity defaults to 35% and speed to 1×, adjustable from 0.5–2×. Cached rounded contours receive bounded irregular path movement, not an animated turbulence filter. Reduced motion uses a steady outline. Decorations never intercept input and exclude navigation/volume controls.

The overlay library contains exactly Snow, Rain, Petals, Embers, Stars, Fireflies, Dust, Bubbles, Confetti, Sparkles, Meteors, Matrix, Aurora, Ripples and Fireworks. Up to three distinct, reorderable presets can combine with one uploaded media layer. Each preset retains independent enabled state, opacity, density, speed, and original/accent/custom color. New presets default to 35% opacity/density and 1× speed. The stack defaults OFF. All layers stay above the background but behind the cards; custom media is drawn beneath preset layers.

Custom overlays accept uploaded JPEG/PNG/WebP/GIF up to 5 MB or H.264 MP4 up to 50 MB, within the existing 250 MB owner allowance. They do not accept external URLs, SVG or WebM. Image transparency and generated still-fallback transparency are retained. Contain/Cover, opacity, green key color, tolerance and edge softness are independent. Overlay videos always loop muted and do not bind to the background soundtrack or volume control. The API checks actual AVC sample descriptions for overlay videos rather than treating every MP4 codec as H.264.

Green-screen removal uses a fixed WebGL shader and decoded-video-frame callbacks where available; it performs no CPU pixel reads. Unsupported graphics, lost context, bad media or blocked playback hides the custom layer rather than showing an opaque green rectangle, with an editor status message. Reduced motion disables procedural/video animation and crackling; uploaded still images remain, and animated images use their generated still. Data-saving visitors do not automatically load overlay videos.

Pointer effects, electric borders and procedural overlays share one per-profile frame scheduler. Procedural particles are pooled and capped at 384 desktop / 128 mobile across the whole stack. Rendering reduces resolution, density and frequency on sustained slow draws, and can suspend keying or low-priority layers without changing saved values. Hidden/offscreen pages pause; navigation tears down resources while cached history restoration resumes the suspended controller. The homepage never initializes profile-specific effects.

### Upload compatibility and release checks

The additive upload-kind constraint permits `overlayImage` and `overlayVideo`; existing buckets, MIME restrictions, quotas, RLS, credentials and owner bindings remain unchanged. The same signed/resumable upload flow is reused, but overlay uploads never change avatar/background fields. All selected uploads are ownership-validated before any copy to public storage. Overlay media and stills remain protected in current/previous-version references even when disabled. Unused files retain the existing cleanup rules.

Changed entry modules and styles use cache version `20261025-6`. Deploy the compatible upload constraint and Edge Function before Pages. Validation fixtures cover all four layouts/eight fonts/max text sizes/sixteen socials, legacy-group preservation, format and ownership failures, private save/discard/previous/conflict behavior, overlay caps, and unchanged badge authorization. Also check real desktop/tablet/320–390px rendering, keyboard/focus/Escape, reduced motion, unavailable graphics/media, all fifteen presets, and the absence of Google font requests. These fixtures do not replace browser checks or promise a universal frame rate. Never enable new effects on production profiles for a test.

### Backend and security

The free Supabase project is `fstdttaxflayhtwhnbih` in Frankfurt. `customizer-config.mjs` contains only its public URL, publishable key, and the public Turnstile site key. Keep `TURNSTILE_SECRET_KEY` in Supabase function secrets, not this repository. Codes are transformed with a server-only Vault pepper into a private lookup digest and a separate native Auth password; plaintext codes are not persisted here. Signup and anonymous sign-in are disabled.

`supabase/functions/profile-api/index.ts` verifies Turnstile server-side, including hostname `ascendo.lol` and action `profile-login`. Login attempts are limited to five per IP and thirty globally in fifteen minutes. Native Auth sessions are verified against both Auth and the live session table on protected requests, with an eight-hour maximum. Tokens and drafts use same-tab session storage, not persistent local storage. Logging out revokes the server session.

The function's gateway JWT switch is intentionally off because it serves public reads and login; protected routes perform their own native token and session validation. Ownership is resolved server-side, never accepted from client profile IDs. Private tables have RLS, no client table grants, and no permissive policies. Only the service role may execute the command RPC. Storage inserts/selects require an authenticated owner and an exact, unexpired reserved path. There is no client write policy on the public bucket.

The security advisor's five `rls_enabled_no_policy` informational findings are intentional deny-all private tables ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). Its leaked-password-protection warning remains on the free project; native passwords here are HMAC-derived values rather than the human access codes. This is not a claim that short numeric codes are equivalent to strong passwords. Keep codes private and rotate them through a controlled server-side provisioning process if exposed. The unused upload timestamp index is retained for cleanup growth, not removed based on a new project's sample.

Schema and access-control migrations are recorded in `supabase/migrations/`; `supabase/seed-profiles.json` contains public default settings only. One-time provisioning is sealed. Do not reopen the bootstrap endpoint to recover an account.

### Upload storage and limits

Images are capped at **5,000,000 bytes**, MP4s at **50,000,000 bytes**, and each profile at **250,000,000 bytes** including reserved/draft/current/previous media. Three quotas total 750 MB, leaving room under the project's 1 GB free storage allowance. Existing GitHub-hosted assets do not consume these quotas. Free service limits, bandwidth, and project availability still apply; do not enable paid overages without the owner's approval.

The pinned, lazy-loaded `tus-js-client` bundle supports resumable uploads. Originals are uploaded unchanged to a private bucket; browser-generated still posters are separate files. Publishing validates ownership, size, MIME and file signature, copies selected media to the public bucket, then commits the settings revision. Private duplicates are removed. Current and previous saved media remain protected from deletion; unreferenced files expire after 24 hours. An authenticated cleanup job runs hourly at minute 27, and cleanup also runs during editor access. This job is maintenance, not a keepalive for a paused free project.

Saved profile settings and published media are public by design. Private draft previews use expiring signed URLs. Do not upload secrets or sensitive personal documents. A removed public file may remain in a browser or CDN cache temporarily.

To rebuild the upload dependency bundle, use `npm ci` then `npm run build:upload`. Versions and lockfile are pinned; no animation framework or public-page dependency is added. GitHub Pages serves the committed bundle directly and needs no Node build step.

## Soundtrack, Easter egg, and mobile

The optional Soundtrack Card starts OFF, including on profiles without the new setting. Owners can add or remove it in Widgets without disabling background audio. When enabled, video profiles show a compact soundtrack card below their socials. Playing, muted, loading, unavailable, and elapsed/duration values reflect the actual local background video, not Spotify or a live music service. The expanding volume control remains the only public playback control; the optional Enter Screen is independently controlled by its owner, and no pause button is added.

Five logo activations within three seconds reveal a short purple ripple/spark Easter egg. It is an actual keyboard-accessible button, does not overlap repeated bursts, cleans up after itself, and substitutes a stationary brief halo for reduced motion.

At widths up to 820px or on coarse-pointer devices, original Ascendo backgrounds use 480p derivatives; narrow screens also receive lighter blur. Full durations and the original AAC packets are retained. Reduced-motion and data-saving users initially see the poster without downloading video; adjusting the volume explicitly enables playback. Other direct media URLs are not silently transcoded or shortened.

| New asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `assets/music-background-mobile.mp4` | 10,009,799 | `4d49e521b298107e9408b8c0927ee7f409b91f6d5e45651cb5b608617dc4f0bc` |
| `assets/bal4zs-mobile.mp4` | 19,211,490 | `b884a7d3708beaa2a4b599a1695cd5fc64c2bf134b0b7b7251f550f73db974ce` |

Both are fast-start H.264, 854 × 480, with the unchanged 136.97-second and 265.00-second durations respectively. AAC packet SHA-256 values match their sources: `592a3ea907b6c018b2dfee32dc20ccd6e75f52c1870b901c4706dfd330583973` and `24b8edc25a9f1d038a5552ef6dc38fb4d5874445d75d37652ef6cbd0008c30a0`. The founder poster is a separate 34,654-byte JPEG. All original media, JARs, and `CNAME` remain byte-identical.

### Release verification

Local schema/DOM simulation checks cover safe rendering, exact default content, original asset preservation, dynamic clipboard rows, soundtrack states, poster/video selection, Easter egg cleanup, private preview, revision conflicts, drafts and restore/discard behavior. These are not a substitute for browser testing.

Backend checks cover all three owner assignments, anonymous/cross-owner denial, signed/resumable MP4 upload (including interrupted resume), media publishing/restoration, quota and file-signature rejection, sealed provisioning, session refresh and logout revocation, and scheduled cleanup. Check real Turnstile login, desktop/mobile editor layout, save/discard, public playback/volume, reduced motion, navigation, minimal HTTP 404, and live JAR hashes after deployment. Never mark a release published based only on a successful Git commit.

## Optional introductions, widgets and expanded typography (20261025-11)

The editor has 38 local display/body faces, grouped into Sans serif, Serif, Monospace, Gothic and Bubbly. The 30 additional families are Manrope, Plus Jakarta Sans, Poppins, Montserrat, Rubik, Raleway, Lato, Open Sans, Oswald, Bebas Neue, Anton, Barlow Condensed, Libre Baskerville, Cormorant Garamond, Bodoni Moda, Abril Fatface, DM Serif Display, Space Mono, IBM Plex Mono, Fira Code, UnifrakturCook, UnifrakturMaguntia, Pirata One, Grenze Gotisch, Nunito, Quicksand, Bowlby One SC, Baloo 2, Fredoka and Lilita One. Official pinned @fontsource archives were SHA-512 verified; assets/fonts/SOURCES-EXPANSION.json records exact versions, WOFF2 sizes and SHA-256 hashes. Latin Extended is included where shipped, with native script/emoji fallbacks. Families with a single published weight use that face with normal browser weight synthesis. Nothing requests Google Fonts.

Card Layout now offers 12 compositions: Classic, Crest, Portrait, Bento, Magazine, Deck, Stack, Wall, Spine, Collage, Flow and Numbers. Magazine has an editorial identity column, Deck a layered frame, Stack independent vertical panels, Wall a responsive tile wall, Spine a connected sequence, Collage an asymmetric grid, Flow rounded social pills and Numbers indexed panels. Container queries stack narrow layouts; interactive boundaries remain independent for tiled styles. Every composition retains semantic reading order and existing avatar crop settings.

**Backgrounds → Enter Screen** is optional and starts OFF. Set its text, a second line and an optional sound; the private preview has replay and audition controls. Six original short oscillator/noise sounds are included: Soft Chime, Glass Bell, Deep Pulse, Digital Spark, Air Sweep and Soft Click. They load only after interaction. Run npm run build:entry-sounds to reproduce the deterministic mono PCM files; assets/entry-sounds/SOURCES.json records durations, sizes and hashes. An enabled gate makes the profile controls inert until entry, pauses its media/players, supports keyboard entry and quietly exits on Escape. It is a visual introduction, never authentication. Existing instant-entry profiles stay instant unless their owner enables it. Reduced motion removes exit movement. Settings fetched after static HTML can reveal the introduction after initial content; the gate is not a privacy barrier.

**Widgets** contains separate OFF switches for Soundtrack Card, Game Settings, Hardware, About Me and Embed Widgets. Game/hardware/about support up to 12 labeled fields, optional copy actions, game name or multiline about text. Empty fields do not render. The soundtrack card reads the existing title/artist/video; hiding it leaves the background player and volume control intact. Up to six embeds use allowlisted, canonical HTTPS links: Spotify track/album/playlist, Apple Music song/album/playlist, YouTube video/playlist and Twitch channel/video. No iframe HTML, scripts or arbitrary player hosts are accepted. Native album/playlist embeds provide their service’s song list inside the profile glass wrapper; provider chrome itself is not recolored or scraped. Iframes are lazy and retained during unrelated edits. Full playback and availability follow provider, account, region and browser restrictions. Twitch requires a 400×300 minimum player, so it opens in an in-page desktop dialog and uses its external link on narrow phones. Players may play independently of background music; no background-volume binding is added. The editor’s frame CSP lists only these providers and Turnstile.

**Effects → Animated Page Titles** accepts up to eight 80-character lines with Typewriter, Scroll or Time on page. Its private chip previews the title without changing the editor’s own tab. Public titles begin only on the selected profile, pause scheduling in hidden tabs, restore on history navigation and remain static for reduced motion. Off restores the ordinary profile title.

New optional JSON groups are soundtrackCard, enterScreen, pageTitle and widgets. Shared feature-schema.mjs validates client and server values, bounds, booleans and URL providers. Missing groups normalize OFF and old clients omitting them preserve their saved settings. No database migration, profile bulk rewrite, auth or badge authority change is required. Drafts, discard, reset, previous versions and revision conflicts use the existing complete profile flow. Never save enabled effects to a production profile merely to test them.

Overlays now sit above the background and below the card; an explicitly enabled empty preset stack starts with Snow rather than doing nothing. Turning the last preset off/removing it in the editor preserves an explicit OFF state. Reduced motion paints a stationary preset frame without an animation loop. Sustained slow rendering retains at least one reduced-quality procedural layer rather than silently dropping every preset. Custom-media ownership, GPU keying and failure hiding are unchanged.

Run npm ci and npm test on Node 24+. The committed isolated tests cover 456 font/layout combinations with long content, maximum sizes and 16 socials; feature defaults and independent persistence; approved/hostile embed URLs; retained iframe nodes; enter focus/inert/media cleanup; reduced-motion titles and overlay renderers; original sound/font integrity; legacy Auth/ownership/badge protections; and private editor save/draft/discard/previous/conflict behavior. DOM simulations do not establish actual viewport geometry, provider playback rights or an FPS guarantee. Preserve an owner’s open studio draft and perform public-browser verification without reloading that draft. Deploy the compatible shared-validator backend before publishing the cache-versioned Pages files.

The 20261025-12 stylesheet refinement removes the legacy 320px body minimum on profiles and the studio, so a vertical scrollbar cannot clip the card at a 320px viewport. Other page styles and saved settings remain unchanged.

## Private invitations and first-login handles (20261025-13)

Invited access codes first pass the existing Turnstile check and login rate limits. An unclaimed invitation opens /welcome/: a minimal two-line welcome, a single ascendo.lol/yourhandle pill and Reserve button. Only relevant validation/availability text appears while choosing. The layout supports 320px screens, keyboard submission, screen-reader status and reduced motion. Signed-out visits return to login; existing completed accounts go straight to the studio. Until a handle is reserved, subsequent sign-ins return to welcome. The same code continues to sign in to its one account after claiming. No credentials are included in this repository or frontend.

Ten invitations were provisioned privately; their values are deliberately absent from migrations, source and documentation. private.profile_invitations stores only HMAC lookup digests using the existing Vault pepper, random invitation IDs, generated internal Auth addresses and lifecycle timestamps. Native Auth users are created lazily on the first successful verified-code login, with deterministic private IDs, confirmed internal addresses and independently HMAC-derived Auth passwords. No confirmation email is sent. Concurrent first logins converge on one native user; profile records are not created publicly until reservation. Bootstrap stays sealed, signup stays disabled, and no provisioning endpoint is added.

Handles use 3–24 ASCII letters/numbers/hyphens, start and end alphanumeric and canonicalize to lowercase. invitation-policy.mjs and the private SQL validator reserve infrastructure routes and existing identity handles. Availability feedback is advisory; reservation locks both the invitation and selected handle and enforces unique ownership/slug/code constraints in one transaction. Submitted owner IDs, profile configs and capability flags never determine ownership or initial content. Repeated reservation returns the original handle, without renaming it. Newly claimed profiles have the ordinary default avatar, black background, no badge/bio/socials and optional features OFF. Owners then customize normally. They are never automatically added to founder/homepage navigation.

The additive migration creates an RLS-protected private table and SECURITY INVOKER RPC executable only by service_role; clients cannot list/modify invitations or reserve through direct database calls. Protected API calls still verify native Auth and the live eight-hour session mapping. GET /invitation, POST /invitation/check and POST /invitation/claim use the verified owner. GET /me redirects pending accounts through an onboarding flag; pending users have no upload/edit access or reserved-badge capability. Native user ID/email are checked before activation. Existing owner assignments and settings remain untouched. Every profile retains the current 250 MB per-owner allowance; all profiles share the project's underlying free storage limit rather than reserving that capacity in advance.

GitHub Pages cannot create static folders or server rewrites at the moment a visitor chooses a handle. New /handle/ links therefore resolve through an authenticated-write/public-read client router loaded by 404.html. Only an existing published record replaces the missing-page artwork with the normal profile/player/effects shell, using root-absolute resources; unknown and nested missing URLs keep the minimal 404. This is standard Pages fallback routing: newly claimed routes still receive an HTTP 404 from Pages on their initial document response, and require JavaScript; they are public but unlisted and noindex. Existing static founder/friend routes keep their HTTP 200 responses. Moving dynamic routes to server-generated HTTP 200 responses would require a routing-capable host or edge proxy, outside this change. CNAME and hosting are preserved.

Cache version 20261025-13 covers changed login/editor/app/404 entries and the new invitation modules; unchanged profile feature assets retain their prior versions. npm test includes isolated backend and welcome-form fixtures. Database verification uses rollback-only native-user/invitation/profile fixtures and checks unavailable handles, duplicate claims, immutable reservations, credential binding, privilege denial and cleanup. Never activate or claim a real invitation just for a test, reload an owner's open draft, or publish access-code material.

## Custom palettes and studio controls (20261025-14)

Style → Profile color theme now offers Original colors, Black & White and Custom colors. Custom unlocks Main color and Secondary color. Every studio color field has a compact native color swatch plus an editable hex value; three-digit shorthand and values without # expand to canonical six-digit hex. Invalid or incomplete input remains visible with an accessible error and cannot publish; Discard/Reset/previous-version fills restore the saved value. Switching modes preserves both custom colors and the separate original Accent color.

Custom colors tint the card surface, social/soundtrack/widget panels, name-effect highlights, dividers and public volume/back controls. Independently selected electric/cursor/overlay custom colors keep their own settings; overlays using Profile accent follow the custom Main color. Original mode retains its existing rendering. Photos, avatars, music videos and embed artwork receive no new color or brightness filter. Text stays neutral and readable.

The studio itself previews the account's theme immediately: Custom tints panels, navigation, buttons, switches, sliders and floating actions; Black & White uses neutral controls; Original retains Ascendo's purple studio. Focus colors are lightened when needed for contrast on the dark interface. This is scoped to the signed-in profile, with no homepage or other-account theme change. Public settings still change only on Save changes.

Optional themeColors JSON stores primary/secondary, defaulting to the existing accent and #8b5cf6. Shared client/server validation accepts only six-digit hex and the three allowed modes, rejects extra color keys and preserves omitted groups from older clients. No schema migration, bulk settings rewrite or authorization change is needed. Deploy the compatible shared-validator backend before the frontend cache update.

Dropdowns are enhanced from native selects into dark, rounded select-only comboboxes with grouped font headings, selected checks, soft entrance/exit, thin scrollbars and viewport-aware placement. Arrow/Home/End/Page keys, type-to-jump, Enter/Space/Tab commitment, Escape cancellation, outside dismissal, disabled options and dynamic editor rows are supported. Native values remain the form's source of truth. Only one popup exists, rapid reversals cancel prior motion, and no idle rendering loop is added. Reduced motion removes transitions. Font menus do not request all 38 families merely to display the list.

The additional isolated tests cover palette validation, old-client preservation, every card layout, media identity, studio scoping, dark-color focus contrast, keyboard/pointer/typeahead interactions, invalid hex on blur/save, reset behavior and dynamic-control cleanup without observer loops. Existing isolated editor fixtures also verify private palette drafts, save/previous/discard and invalid backend submissions. The owner's open studio draft is preserved; these fixtures do not claim a live authenticated browser test or alter production profile settings.

## Background library, music and bilingual studio (20261025-15)

Background type adds Antigravity, Ballpit, Beams, Dither, CRT Warp, Grid Distortion, Grid Scan, Lightfall, Line Waves, Plasma Wave and Topography alongside Flux Lines, video, image and black. Existing defaults and saved selections are unchanged. Components, shaders, physics and pointer handlers are imported from React Bits commit `e12c22192ac7b4b452c5e2feb9b586d74765d696`; original JSX/CSS, file hashes, original demo stills and the full MIT + Commons Clause condition are in `vendor/react-bits/backgrounds/`. These are embedded website backgrounds, not an exported component service. Grid Distortion's original demo image is local. Webcam/gyro controls are explicitly disabled for Grid Scan; no camera permission or face-model download is requested.

`npm run build:backgrounds` creates eleven independently loaded entries and a shared pinned React/ReactDOM runtime. Only the selected entry is imported, with the original demo's settings. The wrapper caps pixel ratio at 1.25 on mobile and 2 on desktop where supported; original Grid Distortion retains its own 2x cap. Reduced motion and Save Data use the matching original still without loading an effect. Missing WebGL2, initialization errors or graphics-context loss fall back to that still. Selection changes, hidden tabs and navigation release the previous renderer. Flux Lines retains its existing source and adapter.

The optional `music` JSON group stores `{source:'video'|'mp3',url,volume}`. Omission defaults to existing video audio and 65%; volume is validated within 0–70%. MP3 works with any background. When selected, background video remains visual and muted; the separate audio element owns soundtrack timing and volume. No duplicate soundtrack plays. Private previews start silent, saved starting volume applies publicly, zero mutes, and normal browser autoplay restrictions still apply. Reduced motion avoids background-video loading until visitor interaction. Entry screens, background selection, mobile variants, visibility and back/forward restoration share one player. Turning the optional soundtrack card off does not stop playback.

MP3 uploads are limited to 50 MB and use the existing private upload/quota/publication workflow. The backend checks MIME, size, consecutive MPEG Layer III frames (including ID3 offsets), signed ownership and upload kind before publication. MP3 references remain protected in current/previous saved versions even when video audio is selected. Older clients omitting `music` preserve the saved group. The compatible migration adds `audio` to the upload constraint and `audio/mpeg` to both existing buckets without changing their privacy or limits.

The compact header language button switches the complete studio between EN and natural HU without rerendering form values, preview media or drafts. User-authored names, bios, labels and widget content remain unchanged. `GET/PUT /preferences` stores only `language` in private, RLS-protected `editor_preferences`; its service-only invoker function receives the authenticated owner, never a submitted account ID. Language changes do not increment profile revisions or publish drafts. Local per-account storage provides a fallback. UI labels, options, accessible names, dynamic summaries, validation and notifications share the translation catalog. Shorter descriptions and background-specific fields reduce clutter.

Overlays now have a direct fifteen-preset picker instead of a select-and-add sequence. Up to three distinct layers retain their own enable switch, opacity, density, speed and palette; selected tiles reopen their controls, and removing/reordering preserves the remaining layers. All presets are tested independently, including custom colors and disabled saved layers. Fireworks get a complete minimum burst and sparse meteor/ripple/matrix effects remain visible. Existing one-canvas scheduling, particle budgets, media keying and the behind-card placement remain intact.

Quick Guide is strictly opt-in. Its six steps reveal real settings, highlight the relevant section and explain identity, appearance, backgrounds/music, overlays, preview and saving. Back, Next, Skip, Finish, close and Escape never write settings or trigger Save. The accessible dialog traps focus natively and returns it to the trigger. Highlight geometry updates only during interaction/scroll/resize; reduced motion removes animated scrolling and panel motion.

Validation includes the existing profile/auth/badge/invitation/layout/font/media suite plus background provenance and opt-in persistence, MP3 signatures and ownership, volume/gating/visibility, all overlay presets, English/Hungarian switching, independent language requests, guide dismissal, and actual editor draft/save/previous/discard paths using isolated fixtures. The owner's live studio and unpublished draft are deliberately untouched; automated DOM checks are not a claim of authenticated live-browser or universal GPU/FPS testing. Deploy the compatible migration/API before the frontend; confirm Pages and live asset hashes afterward. No credentials, original media, plugin downloads or CNAME are changed.

### Background compositing correction (20261026-1)

The fallback still and live renderer now occupy separate, mutually exclusive visual layers. Previously, an inline poster background overrode the ready-state CSS, leaving a static image behind transparent animation pixels and producing a doubled scene. The poster is hidden when the renderer is ready and restored only while loading, suspended, reduced-motion or unavailable. The canvas stays measurable while preparing, using visibility rather than display:none so responsive renderers can initialize normally. An opaque black base prevents old video/image content showing through; the preset stage also suppresses its legacy media and shade without affecting separate MP3 audio or intentionally selected overlays.

One controller owns each stage. Rapid selection changes and stale callbacks cannot re-enable an old scene, and even synchronous renderer failures dispose immediately. Regression fixtures check all twelve presets in public and editor stages, fallback visibility, media suppression/restoration, duplicate initialization, rapid switching and cleanup. Original component source, effects, saved choices, media, accounts and database are unchanged. Updated module/stylesheet versions reach the editor, static profiles and dynamic profile routes.

## MP4 recovery and text colors (20261026-3)

Profile playback now resumes after tab visibility, focus and back/forward restoration, including reduced-motion and Save Data sessions that visitors explicitly started. A decoded video frame remains visible while temporarily paused or buffering. Resume preserves the playhead and visitor volume; unrelated preview edits do not reload the video. One shared player owns editor playback and bounded recovery. Separate MP3 playback does not wait for the visual video to load. Existing autoplay restrictions, muted fallback, entry screens and the 70% limit remain in effect.

The Accent color picker stays enabled in every theme. In Custom colors it updates Main color; editing it in Black & White switches to Custom colors with the selected accent and neutral secondary. The studio reflects the actual accent. Optional textColors stores independent bio/socialLabel hex colors; null retains automatic styling. Auto toggles, private preview, save/discard/previous versions and old-client preservation use the existing settings workflow. Both bio paragraphs and links share the selected bio color; social platform captions use the label color. Media stays unchanged. Strict shared validation rejects extra fields or CSS. No production profile settings are rewritten.

Verification covers repeated hide/restore and focus cycles, quiet-mode activation, preserved volume/playhead and source load counts, independent MP3 playback, accent editing in all themes, text-color validation/persistence and the full existing regression suite. CNAME, credentials, media and plugin binaries are unchanged.

## Owner sharing and profile metadata (20261026-5)

The owner-only Share dialog copies the canonical link, downloads a local 1024px
QR code and queues a full desktop profile PNG. Everything uses a separate saved
snapshot: opening Share never saves, clears or exports an editor draft. EN/HU,
keyboard focus, Escape and reduced motion are supported.

GitHub Actions renders cards with native Chrome and refreshes static profile HTML.
No Cloudflare account, Worker, Browser Run, DNS change or additional sign-in is
required. The existing GitHub Pages source, domain and login protection remain.
A scheduled workflow checks roughly every five minutes; GitHub can delay it.
Cards therefore show a clear queued state. Saved names, bios and avatars appear
in initial HTML after the next successful refresh/build; already-posted Discord
previews can remain cached independently.

The existing authenticated API resolves ownership, validates the saved revision
and queues only that profile. Short-lived GitHub OIDC authorizes the exact main
workflow; no new long-lived secret is stored. The capture browser receives no
owner session or workflow credentials. Link and QR downloads do not wait for
the queue. Captures are silent, 1920px wide and full-height, with an address footer,
provider fallbacks and strict 16,000px/20 MiB limits. One derived private export per
owner lasts 24 hours; signed links last five minutes, with a 100 MiB cache ceiling
and twelve generations per UTC day across the site.

See [SHARING.md](SHARING.md) for deployment, limits, verification and rollback.
The suite covers QR decoding, safe metadata and static content, signed OIDC,
owner/revision enforcement, queue isolation, draft preservation, output bounds
and silent capture preparation. Database tests roll back all fixtures. Native
screenshot tests run only on GitHub's runner, across twelve layouts and a long
profile; they do not reload the owner's studio.


## Profile expression controls (20261026-6)

Six optional, profile-specific groups extend the existing saved JSON without a
schema migration or rewriting current profiles: socialStyle, detailColors,
richBio, holographic, musicReactive and signature. All default OFF. Omitted groups
from older clients retain saved values. Save, draft recovery, discard, reset,
previous-version restore and revision-conflict handling share the existing editor
workflow. Both EN and HU are supported; only Save changes publishes a preview.

Social buttons offer rows, pills or icons, with glass/outline/solid surfaces,
spacing, icon sizes and applicable corner settings. Existing link destinations,
clipboard values and accessible names remain. Icon-only controls retain tooltips
and complete accessible names. Precise colors add independent name, handle, icon,
badge text/background, card border/background, social background and bio-link
colors. Each has Auto. Existing bio/platform-label colors remain available; card
fill honors opacity and media is never recolored.

Richer bios support bounded emphasis, underline, HTTPS links, quotes, line spacing
and alignment through a small toolbar. Existing plain bios keep their previous
rendering until this option is enabled. Formatting builds text and allowed DOM
nodes, never user-authored HTML or CSS. Metadata strips formatting from the bio.

Holographic foil, pearl and brushed-metal finishes use profile colors and an
on-demand pointer response on untransformed card boundaries. Surface layers sit
behind crisp text, never over input targets. Existing tilt/entrance transforms
remain independent. Reduced motion and touch retain a still finish.

Music visuals offer waveform, equalizer and avatar halo with intensity, smoothing
and optional color. They analyze actual captured media audio after visitor
interaction, without rerouting the player's sound, requesting a microphone,
changing volume or restarting the soundtrack. Trusted public uploads use
anonymous CORS when first assigned. Unsupported browsers, audio-less files or
blocked stream capture retain normal playback and a still visual; the editor
explains that fallback. The implementation follows the media capture and
[Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream)
interfaces. A bounded canvas uses the same on-demand loop as the reflection,
reduces drawing frequency on slow frames and stops when hidden or offscreen.

Signatures can be drawn (at most twelve strokes and 1,200 numeric points) or typed
using existing local fonts. Width, stroke, color and writing duration are
adjustable, with undo, clear and replay. Typed text is the keyboard-accessible
alternative. Settings accept no uploaded SVG or arbitrary markup. Drawn strokes
reveal once; reduced motion/capture mode shows the completed signature. Unrelated
edits do not replay it.

Verification includes strict shared validation, omission/default compatibility,
safe formatting and URLs, per-profile preview isolation, actual editor
save/restore/conflict fixtures, exact colors, signature identity retention,
non-rerouting audio analysis, idle/hidden/reduced-motion cleanup and translations.
GitHub-native checks inspect narrow profiles, three finish/button/layout
combinations and real decoded audio from an original local test sound. No
production effects are enabled for testing. Existing credentials, badge policy,
media, plugin downloads, CNAME, draft and login remain unchanged.


## Saved profile presets and owner media allowance (20261026-8)

The studio's Presets dialog saves up to ten named snapshots per account, including
the current unpublished preview, content, styles and media references. Loading
confirms replacement and fills the private preview; only Save changes publishes.
Presets can be loaded or deleted, support EN/HU, keyboard focus, Escape, reduced
motion and narrow screens. Names are limited to 40 characters and unique within
an account. Snapshots never include login credentials or change profile addresses.

Native authenticated owner mapping protects every preset operation. Configurations
receive the same normalization, badge authority and media ownership checks before
storage. Private RLS-protected rows and service-only RPCs prevent cross-account
reads/deletes. Uploaded files referenced by a preset remain protected from cleanup
and manual deletion; deleting the preset releases that reference. Snapshots reuse
media rather than duplicating files or publishing uploads.

InternalCheats alone has a 500 MB total media allowance, resolved from its canonical
private ownership record. Other accounts retain 250 MB. The database reservation
transaction enforces this distinction, and the editor displays the actual allowance.
Individual files remain capped at 50 MB, as explicitly chosen to keep hosting free.
No paid upgrade, bucket privacy change, credential change or profile rewrite occurs.

Verification covers API ownership/badge/media checks, private UI save/load behavior,
rolled-back database fixtures for limits and media protection, exact owner quota
boundary checks, and GitHub-native modal checks at 1280px, 390px and 320px.

### Social styles and electric borders across layouts (20261026-9)

Tiled layouts retain individual grid cells for row buttons. Pill and icon styles
use a full-span compact group, with explicitly sized interaction wrappers instead
of stretched tiles. Chosen radii, padding and hover lighting match the actual
button shape. Numbers keeps numbering off compact social controls; Spine uses
one timeline marker per compact group. Widget placement remains layout-specific.

Electric SVGs now have an explicit positioned target and border-box dimensions,
rather than inheriting a wrapper's size. Contours follow all four actual corner
radii, including asymmetrical Magazine/Collage cards, pill shapes and portrait
avatars. Avatar images retain their own clipping while the outline can extend
outside it. Per-target resize observation refreshes geometry; disabling or
switching layouts removes decorations and restores original clipping. Settings,
media, destinations, clipboard values and saved profiles are unchanged.

The browser regression matrix checks all twelve layouts, default/row/pill/icon
styles and desktop/tablet/320px widths, including electric alignment, dimensions,
interaction wrappers, cleanup and live crackling. Isolated fixtures never publish
settings to a real profile.


### Profile appearance and complete presets (20261027-1)

Background Appearance adds optional blur (0–24px), darkness (0–80%), saturation
(0–150%), tint, vignette and a two-axis focal point. It affects only the backdrop;
avatars and audio keep their original colors, brightness and playback. Card Glass
adds independent blur, corner, shadow and edge controls; existing card opacity
remains available. Avatar Frame offers rotating dashes, two-color rings and a soft
halo following the picture's actual shape. All new groups default OFF and old
records are not rewritten. Additional controls live under Advanced.

Electric Border retains its original Lightning default, adding Plasma, Orbit,
Dual-tone and Circuit styles, thickness, glow, second color and optional music
reaction. Border and avatar decoration share the existing on-demand scheduler,
stop when hidden/offscreen, and remain steady with reduced motion. Music reaction
observes captured audio without rerouting it or altering volume/playback.

Presets store the full normalized configuration, including canonical media URLs,
posters, crop positions, MP3 selection and volume, every style group, widgets and
social actions. Saving reads the record back and compares every normalized setting
before confirming success. Loading refreshes private upload preview links, rebuilds
the avatar and refreshes the video/audio source, including retry state. Mobile
loading opens Preview. Loading stays private until Save changes; neither opening
nor closing Presets saves, publishes or resets playback. Confirmation is inside
the glass dialog so it works where browser-native confirmation dialogs are blocked.

The gallery shows quiet miniature previews from the stored configurations, fetched
only while open with at most two concurrent requests. Preview media is resolved
through the current account's upload library. No players are created for gallery
embeds. Observers are released when the gallery closes. Existing preset records,
media references, quotas, authentication, badge authority and CNAME are preserved.

Checks include full-field round trips, forced media refresh, every border style,
all layout surfaces, old-client preservation, bounded input validation, independent
audio analysis, Hungarian labels, responsive rendering, reduced motion and native
browser save/load cycles with deliberately expired private media links. Real owner
sessions and unpublished drafts are never used by the test fixtures.

### Rename and update private presets

In Customize, open Presets and use the three-dot menu on a saved card. Rename changes only its label (up to 40 characters). Update replaces that preset with the current preview, retaining its name and slot. Both require confirmation, leave the editor draft untouched, and never publish the profile. Save changes remains the only publish action.

Preset versions reject conflicting edits from another tab. Updating revalidates badge authority and uploaded-media ownership, atomically replaces media references, and reads back the full snapshot before reporting success. Existing presets receive version 1; no profile settings are rewritten. The private service-only RPC and 10-preset limit remain unchanged.

Verification: npm test; rolled-back tests/profile-presets.sql; isolated Chrome editor fixtures at 1280, 390 and 320 pixels, including rename, update, retained avatar/video/settings, keyboard menus and no public saves.

### Studio navigation and motion

The editor keeps category navigation and mobile Edit/Preview controls in reach while scrolling. All six categories fit on phones. Jump to section uses the existing accessible selector to open a specific panel without changing settings. Search includes translated section names, has a clear action, and Ctrl/Cmd+K respects open dialogs.

Category/view reveals are short, interruptible transform/opacity animations. Accordion motion reverses naturally; reduced motion skips it. There is no idle animation loop. Geometry updates on navigation resize, and effects cancel when hidden or leaving the page. Navigation never remounts the preview or writes a draft/profile. No backend or stored profile changes.

Validation includes the full automated suite and isolated native Chrome checks at 1280, 390 and 320 pixels: keyboard section jumping, sticky-header clearance, all category targets visible, rapid navigation, reduced motion, modal shortcuts, unchanged draft/media DOM and existing private preset workflows.

### Refined custom cursors

Custom Cursors keeps the existing Arrow, Dot, Ring and Crosshair identifiers and all saved settings. Shapes now have light/dark contrast outlines, exact native hotspots and a matching link pointer. The arrow uses pinned Lucide artwork (ISC); original source, full license and SHA-256 provenance are in vendor/lucide-cursors/. No remote cursor or font requests are made.

The editor has keyboard-accessible visual choices and a private test area for movement, clicking and text selection. Colors, size, trail length/smoothing and click choices remain independently saved through the current settings/preset system. Existing profiles remain off unless their owner enables cursors; publication still requires Save changes.

The tapered trail reuses at most 12 transform-only segments. Primary-click rings use two staggered outlines; sparks use a capped 24-particle pool. The shared on-demand scheduler stops at rest, when hidden or offscreen, and on navigation. Reduced motion suppresses decorations; touch uses native cursors. Text, disabled controls and resize affordances remain native.

Validation covers normalized settings, hotspots and contrast at 12/24/40px, source provenance, editor selection and draft preservation, desktop/tablet/mobile layouts, reduced motion, touch, primary clicks, bounded animation cleanup and light/dark native artwork screenshots on isolated GitHub Actions fixtures.

### Sweezy all-time top 30 cursors

The cursor picker includes the first 24 all-time results plus the next six from Sweezy, snapshotted on 2026-10-27. The owner explicitly confirmed written redistribution permission. Original PNG cursor/pointer pairs, source pages, ranks, dimensions, hotspots and SHA-256 hashes are recorded in vendor/sweezy-cursors/. Artwork remains credited to Sweezy and its rights holders.

Search and keyboard navigation cover all 34 choices. Search never changes a draft. Artwork preserves original colors and proportions; native cursors resize to the selected 12-40px size with scaled hotspots. Animated source packs use the supplied static PNG pair for browser compatibility, as explained in the picker. Personal cursor colors remain available for the four basic designs.

Only the selected enabled cursor pair is decoded for native use. Thumbnails load as their gallery rows enter view. Native image and size caches are bounded, stale asynchronous completions cannot overwrite a newer selection, unavailable artwork falls back to Arrow, and touch/reduced-motion cleanup is retained. Settings remain private until Save changes; saved presets retain the pack choice.

The compatible backend adds an allowlisted cursor ID catalog to existing JSON validation. No database migration, profile rewrite, permission or authentication change is required. Tests cover all 60 original hashes and 30 stored IDs, backend private-preset persistence, invalid IDs, search isolation, 90 native size/pointer pairs, desktop/mobile gallery layouts, touch and reduced motion.

### Volume control motion

The expanding sound control reveals a fixed-width slider so its track and thumb do not resize during the disclosure animation. Rapid reversals continue from the current width. Native pointer input retains fractional precision; the track fill and actual volume update together without a trailing CSS transition. Percent labels remain rounded, arrows adjust one percent, Page Up/Down adjust ten, and Home/End select mute/70%. Unchanged playback notifications do not rewrite slider values or labels.

Native browser checks cover desktop/tablet/390px/320px, stable geometry during expansion, rapid reversals, fractional dragging, immediate audio/fill synchronization, keyboard limits, mute, Escape focus, touch dismissal, reduced motion and unchanged media elements/sources. Profile settings and saved volume defaults remain unchanged.

### Creative profile features

Appearance includes three independent, opt-in sections: Double-Sided Card, Constellation Socials and Glass Stickers. Missing settings normalize OFF; existing profiles are not rewritten or enabled. Changes preview privately and use the existing save, draft, discard, previous-version, conflict and named-preset system. Older clients omitting these groups retain saved values. EN/HU labels are included.

Double-Sided Card adds a reversible flip button with separate reverse artwork/still, title, text, accent and up to six HTTPS links. The public control is fixed to the screen's top-right corner, clear of social tiles in every layout; the editor keeps it in the preview toolbar, including expanded previews. Flip timing is adjustable. The inactive face is inert and hidden from assistive technology; Escape returns to the front and focuses Flip. Reduced motion switches faces immediately. Avatar and background media are retained, and screenshot exports show the front.

Constellation Socials reuses existing social controls and their normal links/copy values around the avatar. Up to sixteen nodes use one or two bounded rings, adjustable spread, connection opacity and node size. Hover/focus reveals handles; small identity containers show compact readable buttons. No automatic orbit or idle rendering loop is added. Constellation buttons are not nested independent tilt targets inside an interactive identity card.

Glass Stickers supports up to eight emoji, handwritten notes or uploaded images with independent edge, position, inset, size, rotation, opacity, color and optional hover movement. Decorative layers never intercept clicks, focus, selection or scrolling. Original image colors and transparent pixels are preserved; image uploads receive still fallbacks. Artwork and stickers use the existing private image upload ownership, size and quota checks. Their current/previous/preset media references remain protected even when a section is disabled.

Shared schema validation rejects unsupported identifiers, unsafe URLs, arbitrary markup fields, nonfinite/out-of-range values, duplicate sticker IDs and excessive arrays. The existing authenticated backend deploys the shared validator without a database migration or authorization change. Isolated tests cover old-client preservation, backend cross-owner rejection, full preset round trips, repeated toggles, all twelve layouts, keyboard access, narrow containers, reduced motion, no-JavaScript front content and media continuity.
