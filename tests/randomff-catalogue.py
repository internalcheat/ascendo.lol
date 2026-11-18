"""Offline checks for complete retrieval, classification, and failed-refresh safety."""

from contextlib import redirect_stderr
import copy
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("update_randomff", ROOT / "scripts" / "update-randomff.py")
updater = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(updater)


def video(number, **extra):
    return {"id": f"v{number:010d}", "title": f"Video {number}", **extra}


def tab(name, entries):
    return {
        "channel_id": updater.CHANNEL_ID,
        "extractor_key": "YoutubeTab",
        "_type": "playlist",
        "webpage_url": f"{updater.CHANNEL_URL}/{name}",
        "playlist_count": len(entries),
        "entries": entries,
    }


def complete():
    return {
        "videos": tab("videos", [video(n) for n in range(115)]),
        "shorts": tab("shorts", [video(n) for n in range(115, 244)]),
    }


class CatalogueTests(unittest.TestCase):
    def test_complete_channel_not_only_first_page(self):
        catalogue = updater.build_catalogue(complete())
        self.assertEqual(catalogue["counts"], {"videos": 115, "shorts": 129, "total": 244})
        self.assertIn("v0000000243", {item["id"] for item in catalogue["videos"]})
        self.assertEqual(catalogue["schemaVersion"], 1)

    def test_deduplication_and_true_shorts_membership(self):
        data = complete()
        data["videos"]["entries"] += [video(0), video(115, duration=15)]
        data["videos"]["playlist_count"] += 2
        data["shorts"]["entries"][0]["duration"] = 166
        catalogue = updater.build_catalogue(data)
        self.assertEqual(len(catalogue["videos"]), 244)
        rows = {item["id"]: item for item in catalogue["videos"]}
        self.assertFalse(rows["v0000000000"]["isShort"])
        self.assertTrue(rows["v0000000115"]["isShort"])

    def test_filters_unavailable_and_live_videos(self):
        data = complete()
        data["videos"]["entries"] += [
            video(300, availability="private"),
            video(301, live_status="is_upcoming"),
            video(302, live_status="is_live"),
            video(303, title="[Deleted video]"),
        ]
        data["videos"]["playlist_count"] += 4
        self.assertEqual(updater.build_catalogue(data)["counts"]["total"], 244)

    def test_malformed_empty_wrong_channel_and_partial_rejected(self):
        cases = []
        for mutation in (
            lambda data: data["videos"].update(entries=[]),
            lambda data: data["videos"].update(channel_id="wrong"),
            lambda data: data["shorts"].update(playlist_count=130),
            lambda data: data["shorts"].update(webpage_url=f"{updater.CHANNEL_URL}/videos"),
            lambda data: data["videos"]["entries"][0].update(id="invalid"),
            lambda data: data["videos"]["entries"][0].update(channel_id="other-channel"),
        ):
            data = complete()
            mutation(data)
            cases.append(data)
        for index, data in enumerate(cases):
            with self.subTest(index=index), self.assertRaises(updater.CatalogueError):
                updater.build_catalogue(data)

    def test_silent_truncation_rejected_against_last_good_count(self):
        previous = updater.build_catalogue(complete())
        data = complete()
        data["videos"] = tab("videos", [video(n) for n in range(30)])
        with self.assertRaises(updater.CatalogueError):
            updater.build_catalogue(data, previous)
        allowed = updater.build_catalogue(data, previous, allow_large_removal=True)
        self.assertEqual(allowed["counts"]["videos"], 30)

    def test_any_extractor_warning_rejects_the_whole_crawl(self):
        class WarningDownloader:
            def __init__(self, options):
                self.logger = options["logger"]

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def extract_info(self, url, download=False):
                self.logger.warning("Unable to download remaining continuation page")
                return complete()["videos"]

        with patch.dict("sys.modules", {"yt_dlp": SimpleNamespace(YoutubeDL=WarningDownloader)}):
            with self.assertRaises(updater.CatalogueError):
                updater.extract_tab("videos")

    def test_unchanged_refresh_preserves_timestamp_and_file(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "catalogue.json"
            old = updater.build_catalogue(complete())
            old["generatedAt"] = "2026-01-01T00:00:00Z"
            original = json.dumps(old).encode()
            output.write_bytes(original)
            before = output.stat().st_mtime_ns
            actual = updater.refresh(output, extractor=lambda name: complete()[name])
            self.assertEqual(actual, old)
            self.assertEqual(output.read_bytes(), original)
            self.assertEqual(output.stat().st_mtime_ns, before)

    def test_failure_retries_and_preserves_output_bytes(self):
        for mode in ("exception", "partial", "empty"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "catalogue.json"
                original = json.dumps(updater.build_catalogue(complete())).encode()
                output.write_bytes(original)
                calls = []

                def extractor(name):
                    calls.append(name)
                    if mode == "exception":
                        raise RuntimeError("YouTube unavailable")
                    data = complete()[name]
                    if mode == "partial":
                        data["playlist_count"] += 1
                    else:
                        data["entries"] = []
                    return data

                with redirect_stderr(io.StringIO()), self.assertRaises(updater.CatalogueError):
                    updater.refresh(output, extractor=extractor, sleep=lambda _: None)
                self.assertEqual(output.read_bytes(), original)
                self.assertGreaterEqual(len(calls), 3)

    def test_success_is_written_only_after_both_tabs_complete(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "catalogue.json"
            calls = []

            def extractor(name):
                self.assertFalse(output.exists())
                calls.append(name)
                return copy.deepcopy(complete()[name])

            catalogue = updater.refresh(output, extractor=extractor)
            self.assertEqual(calls, ["videos", "shorts"])
            self.assertEqual(json.loads(output.read_text(encoding="utf-8")), catalogue)
            self.assertEqual(list(output.parent.iterdir()), [output])


if __name__ == "__main__":
    unittest.main()
