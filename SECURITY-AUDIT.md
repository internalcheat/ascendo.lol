# Interface and security review — 1 November 2026

This review covers the source based on `19bff1488463303a09b3f9a3d1aeb899ff9a180c`, the public Pages deployment and the connected Supabase project. It is a bounded review, not a guarantee that every vulnerability or browser-specific issue has been eliminated.

## Confirmed issue and fix

**Low severity: malformed profile API JSON was reported as an outage.** Posting JSON `null` to `/session` or `/session/refresh` caused an unhandled property access and HTTP 503. The response did not disclose a stack, credentials or profile data, and authentication was not bypassed.

The shared JSON reader now requires an object, validates the JSON MIME type and UTF-8, and enforces the existing 80,000-byte streaming limit. Invalid roots return 400; unsupported types return 415; excess bytes return 413 and cancel the input stream. It changes no authentication, ownership, upload, profile or database rules. Deployed as `profile-api` version 32; the live non-object requests now return 400.

## Checks

- Public HTTP audit: 13 routes, including shallow/nested missing URLs; 49 referenced assets and original JAR downloads; 16 read-only/unauthenticated API probes. Post-fix report has no findings. Private routes reject absent and forged sessions; foreign origins and the closed bootstrap reject requests. Public responses contain only published configuration and revision data.
- Browser audit: homepage, plugins, login, chess, custom 404, a generated profile and all six studio categories at 1440, 1024, 768, 390 and 320px. Checks cover overflow, duplicate IDs, named buttons, safe new-tab links, all 15 overlay selectors and their independent settings, EN/HU, guide dismissal, expanded preview and reduced motion.
- Existing isolated browser suites cover profile layouts, long content, constellation labels, flipping/stickers, social/electric borders, typography, presets, cursors, sharing captures and volume motion. Chess checks exercise friend/bot games, premoves, annotations, recovery, history, touch and keyboard behavior.
- Backend fixtures test forged owner/capability data, cross-owner media, badge authorization, invitation reservations, revisions and private screenshot exports. Stored markup, script terminators, event handlers and unsafe protocols are tested through the actual profile document renderer.
- Live database catalog checks: all 11 application tables have RLS enabled and no `anon` or `authenticated` table privileges. Public command functions are service-only. The private storage helper has a fixed empty search path; draft access requires the authenticated owner of a reserved upload. Draft/export buckets remain private. The preset ownership/version/media-reference test passed in a transaction that rolled back every fixture.
- `npm audit`: zero known advisories in the pinned dependency tree at review time. Source credential-pattern scan: no committed private keys, service-role JWTs, secret Supabase keys or GitHub tokens found in 552 tracked files.
- Supabase security/performance advisors: no exposed-table, unsafe-function or performance findings. Informational deny-all private-table notices are intentional. The Auth leaked-password warning remains: the site accepts private invitation codes and derives strong server-side HMAC passwords rather than accepting user-selected Auth passwords. No paid feature was enabled.

## Remaining hosting hardening

GitHub Pages responses do not provide `Content-Security-Policy: frame-ancestors` or `X-Frame-Options` for the login/editor. Their existing meta CSP does not provide frame-ancestor protection. This leaves a UI-redressing/clickjacking hardening gap; no account-access bypass was demonstrated. These directives must be HTTP response headers, not an ineffective meta tag. Configure them through a header-capable host/proxy when available. DNS, hosting, billing and Cloudflare sign-in were not changed.

## Limits and reproduction

The audit did not use real private codes, complete a human login, alter a production profile, open the owner's existing editor tab, upload hostile files, run a load test or contact visitors. Real browser runs use disposable CI contexts and intercepted test APIs. Account passcodes, sessions and unpublished drafts were not read or changed. Third-party service availability and every browser/GPU combination cannot be guaranteed by these checks.

- `npm test` runs the unit/regression and request-security checks.
- `node scripts/audit-site-http.mjs` runs bounded public/unauthenticated HTTP checks and writes `test-results/site-audit/http.json`.
- The **Site interface and security audit** Actions workflow runs native browser checks. It keeps screenshot/JSON evidence for seven days; it does not export production credentials or log in to a real studio.

See the focused audit PR for exact workflow runs and publication evidence.
