#!/usr/bin/env python3
"""Refresh the complete public Family Friendly catalogue without downloading media.

yt-dlp follows every continuation of both real channel tabs. Keep the last good
catalogue if YouTube fails, changes its response, or yields suspiciously few rows.
Install/update yt-dlp before running; no YouTube API key or login is needed.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
import tempfile
import time


CHANNEL_ID = "UCrR-9qug_zHoiBBGTXGP2Hw"
CHANNEL_URL = "https://www.youtube.com/@FamilyFriendly"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "randomff" / "catalogue.json"
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
UNAVAILABLE_TITLES = {"[private video]", "[deleted video]", "private video", "deleted video"}


class CatalogueError(ValueError):
    """An incomplete or unexpected crawl must never replace the published data."""


class CrawlLogger:
    def __init__(self):
        self.problems = []

    def debug(self, message):
        pass

    def info(self, message):
        pass

    def warning(self, message):
        self.problems.append(str(message))

    def error(self, message):
        self.problems.append(str(message))


def extract_tab(tab):
    # Import here so offline validation/tests do not need the network dependency.
    from yt_dlp import YoutubeDL

    logger = CrawlLogger()
    options = {
        "extract_flat": "in_playlist",
        "skip_download": True,
        "quiet": True,
        "ignoreerrors": False,
        "lazy_playlist": False,
        "retries": 3,
        "extractor_retries": 3,
        "socket_timeout": 30,
        "logger": logger,
    }
    with YoutubeDL(options) as downloader:
        result = downloader.extract_info(f"{CHANNEL_URL}/{tab}", download=False)
        # Materialize inside the downloader context: lazy continuations can fail.
        if isinstance(result, dict) and result.get("entries") is not None:
            result["entries"] = list(result["entries"])
    if logger.problems:
        raise CatalogueError(f"{tab} crawl reported: {'; '.join(logger.problems)}")
    return result


def parse_tab(result, tab):
    if not isinstance(result, dict):
        raise CatalogueError(f"{tab}: no playlist returned")
    if result.get("channel_id") != CHANNEL_ID:
        raise CatalogueError(f"{tab}: unexpected channel")
    if result.get("extractor_key") != "YoutubeTab" or result.get("_type") != "playlist":
        raise CatalogueError(f"{tab}: unexpected extractor response")
    if result.get("webpage_url", "").rstrip("/") != f"{CHANNEL_URL}/{tab}":
        raise CatalogueError(f"{tab}: wrong channel tab returned")
    entries = result.get("entries")
    count = result.get("playlist_count")
    if not isinstance(entries, list) or not entries:
        raise CatalogueError(f"{tab}: empty or incomplete playlist")
    if type(count) is not int or count != len(entries):
        raise CatalogueError(f"{tab}: playlist count does not match completed crawl")

    videos = {}
    for entry in entries:
        if not isinstance(entry, dict) or not VIDEO_ID.fullmatch(str(entry.get("id", ""))):
            raise CatalogueError(f"{tab}: malformed video entry")
        if entry.get("channel_id") not in (None, CHANNEL_ID):
            raise CatalogueError(f"{tab}: video belongs to another channel")
        title = entry.get("title")
        if not isinstance(title, str) or not title.strip():
            raise CatalogueError(f"{tab}: missing video title")
        if title.strip().lower() in UNAVAILABLE_TITLES:
            continue
        if entry.get("availability") not in (None, "public", "unlisted"):
            continue
        if entry.get("live_status") in ("is_live", "is_upcoming", "post_live"):
            continue
        video_id = entry["id"]
        videos[video_id] = {"id": video_id, "title": title.strip(), "isShort": tab == "shorts"}
    if not videos:
        raise CatalogueError(f"{tab}: no available videos")
    return videos


def build_catalogue(results, previous=None, allow_large_removal=False):
    regular = parse_tab(results["videos"], "videos")
    shorts = parse_tab(results["shorts"], "shorts")
    # Shorts membership is decided by YouTube, not a duration approximation.
    merged = {**regular, **shorts}
    videos = sorted(merged.values(), key=lambda video: video["id"])
    counts = {
        "videos": sum(not video["isShort"] for video in videos),
        "shorts": sum(video["isShort"] for video in videos),
        "total": len(videos),
    }
    if previous is not None:
        if previous.get("schemaVersion") != 1 or previous.get("channelId") != CHANNEL_ID:
            raise CatalogueError("existing catalogue has an unexpected schema or channel")
        old_videos = previous.get("videos")
        if not isinstance(old_videos, list):
            raise CatalogueError("existing catalogue is malformed")
        for short, label in ((False, "videos"), (True, "shorts")):
            old_count = sum(video.get("isShort") is short for video in old_videos)
            if not allow_large_removal and counts[label] < old_count * 0.9:
                raise CatalogueError(f"{label}: more than 10% disappeared; retaining the last good catalogue")
    catalogue = {
        "schemaVersion": 1,
        "channelId": CHANNEL_ID,
        "channelUrl": CHANNEL_URL,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "Complete YouTube videos and shorts tabs via yt-dlp; no media downloaded",
        "counts": counts,
        "videos": videos,
    }
    # A successful check with unchanged contents needs no site redeployment.
    if previous and all(catalogue[key] == previous.get(key) for key in catalogue if key != "generatedAt"):
        return previous
    return catalogue


def refresh(output, extractor=extract_tab, attempts=3, sleep=time.sleep, allow_large_removal=False):
    output = Path(output)
    previous = json.loads(output.read_text(encoding="utf-8")) if output.exists() else None
    last_error = None
    for attempt in range(attempts):
        try:
            results = {tab: extractor(tab) for tab in ("videos", "shorts")}
            catalogue = build_catalogue(results, previous, allow_large_removal)
            break
        except Exception as error:
            last_error = error
            print(f"Catalogue attempt {attempt + 1}/{attempts} failed: {error}", file=sys.stderr)
            if attempt + 1 < attempts:
                sleep(2 ** (attempt + 1))
    else:
        raise CatalogueError(f"Refresh failed; last good catalogue left untouched: {last_error}")

    if catalogue == previous:
        return catalogue
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent, suffix=".tmp", delete=False, newline="\n") as handle:
            temporary = Path(handle.name)
            json.dump(catalogue, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        temporary.replace(output)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return catalogue


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--allow-large-removal", action="store_true", help="Allow a verified removal of more than 10%% of an existing tab; still rejects empty or invalid crawls")
    args = parser.parse_args()
    try:
        catalogue = refresh(args.output, allow_large_removal=args.allow_large_removal)
    except Exception as error:
        print(error, file=sys.stderr)
        return 1
    counts = catalogue["counts"]
    print(f"Updated {args.output}: {counts['videos']} videos, {counts['shorts']} Shorts, {counts['total']} total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
