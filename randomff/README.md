# Random Family Friendly

`/randomff/` is a buildless, public page on the existing GitHub Pages site. It has no account, API key, runtime backend, framework, or third-party catalogue proxy. The player uses YouTube's official iframe API, loaded only after the first click. The page uses the existing local Inter font.

`catalogue.json` is generated from the **complete**, paginated `/videos` and `/shorts` tabs of `@FamilyFriendly` (`UCrR-9qug_zHoiBBGTXGP2Hw`) using yt-dlp's maintained YouTube extractor. The Shorts flag reflects actual tab membership, not duration or title. No video media is downloaded. The catalogue contains public metadata only. The initial crawl contained 115 regular videos and 129 Shorts.

The **Random Family Friendly videos** GitHub Actions workflow refreshes the catalogue every six hours and on relevant main-branch changes, and can be run manually. It tests the selector and importer first. The importer rejects incomplete or empty crawls and preserves the last successful catalogue on failure. The publisher rebases concurrent unrelated changes, never force-pushes, and explicitly requests the existing Pages build after a catalogue change. Failed refreshes appear as failed Actions runs; the last deployed catalogue stays playable. GitHub may delay scheduled runs.

Selection is uniform across the whole eligible catalogue. Shorts start excluded on every page load. The previous selection is excluded, including after a reload in the same tab when session storage is available. YouTube player errors for removed/private videos or disabled embedding skip that entry for this visit and retry another video, with a bounded retry limit. Network/player configuration errors remain retryable without wrongly removing videos. YouTube can still impose geographic, age, consent, or browser autoplay restrictions; its native player controls remain available.

Local verification:

```sh
node --test tests/randomff.mjs
python tests/randomff-catalogue.py
python -m pip install --upgrade yt-dlp
python scripts/update-randomff.py
python -m http.server 8080
```

Open `http://localhost:8080/randomff/`. Deployment remains `main` → existing GitHub Pages → `ascendo.lol`; `CNAME` and all existing pages are preserved.
