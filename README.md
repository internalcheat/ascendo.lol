# ASCENDO.LOL · Founder Profiles

A curated static GitHub Pages site. There are no public accounts or profile-creation forms.

## Pages

- `/`: the real Ascendo logo, Client 26.3 Discord link, founder cards, and decorative floating phrases on black.
- `/plugins/`: AscendOSit and AscendOEnchants experimental builds for Paper 26.3, with direct JAR downloads.
- `/internalcheats/`: InternalCheats; Discord `internalcheats`; Minecraft IGN `InternalCheat`.
- `/k3rlsen/`: k3rlsen; TikTok `@ferenckop`; Instagram `@_shewantss.csxngi`; Discord `27ia`.
- `/nagyorru/`: compatibility redirect to `/internalcheats/`, with a visible fallback link.
- `/404.html`: minimal custom 404 preview. GitHub Pages serves the same hero for unknown routes while retaining HTTP 404.

Profiles open immediately. The existing video attempts playback with audio, falls back to muted playback when required by the browser, and has an accessible sound control. Hover or focus the sound button to expand the slider; tap/click to pin it open or close it. Escape or an outside tap closes it. Adjusting the slider is a user interaction that can enable audio. Content remains visible if JavaScript or media is unavailable.

## Design and motion

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

To add a curated profile, copy an existing profile directory and edit the identity, optional bio, links, and canonical URL. Add a founder card only for profiles intended to be listed publicly. No framework or package installation is needed.
