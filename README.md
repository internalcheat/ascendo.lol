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

To add a curated profile, copy an existing profile directory and edit the identity, optional bio, links, and canonical URL. Add a founder card only for profiles intended to be listed publicly. Provision its owner privately; never embed access codes in HTML, scripts, seed files, or Git history. The current studio deliberately supports only the three provisioned profiles.

## Private profile studio

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

`fonts.css` defines DM Sans, Inter, Space Grotesk, Sora, Outfit, Playfair Display, Cinzel and JetBrains Mono. Display and body pickers are independent; only faces actually used by the page are fetched. The base interface still uses local DM Sans. Every page, including login, legacy redirect, plugins and 404, uses local font delivery with no Google Fonts stylesheet or preconnection. Editor/login font CSP is restricted to self. Each family has Latin and Latin Extended variable WOFF2 subsets, normal weights 400–700, `font-display: swap`, and system-script/emoji fallbacks. Font loading refreshes effect geometry without replaying names or entrances.

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

Every video profile includes a compact soundtrack card below its socials. Playing, muted, loading, unavailable, and elapsed/duration values reflect the actual local background video, not Spotify or a live music service. The expanding volume control remains the only public playback control; there is no entrance screen or pause button.

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
