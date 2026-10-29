"""Batch-compress the birthday photo gallery in place.

Usage (run with the bundled Python that has Pillow):
    python tools/compress_photos.py --probe
    python tools/compress_photos.py --sample 5 --out .preview
    python tools/compress_photos.py --max-side 1600 --quality 82

Design notes:
- Keeps filenames unchanged, so public/birthday/index.html needs no edits.
- Bakes EXIF orientation into pixels (exif_transpose) before stripping EXIF,
  otherwise phone photos would come out sideways once metadata is gone.
- Only downscales; never upscales a small photo.
- Skips files that are already small, to avoid needless re-encode quality loss.
- Originals stay in git: `git checkout -- public/birthday/photos` restores them.
"""

from __future__ import annotations

import argparse
import io
import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parent.parent
PHOTOS = REPO / "public" / "birthday" / "photos"

# Skip re-encoding anything already this small unless it is also way too large
SKIP_BYTES = 500 * 1024
SKIP_MAX_SIDE = 1600


def iter_photos():
    for p in sorted(PHOTOS.iterdir()):
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg"}:
            yield p


def probe() -> None:
    rows = []
    for p in iter_photos():
        with Image.open(p) as im:
            rows.append((p.name, im.width, im.height, p.stat().st_size))
    rows.sort(key=lambda r: r[3], reverse=True)
    total = sum(r[3] for r in rows)
    print(f"{len(rows)} photos, {total / 1024 / 1024:.1f} MB")
    widths = sorted(r[1] for r in rows)
    heights = sorted(r[2] for r in rows)
    print(f"width  min={widths[0]} median={widths[len(widths) // 2]} max={widths[-1]}")
    print(f"height min={heights[0]} median={heights[len(heights) // 2]} max={heights[-1]}")
    print("\nlargest 10:")
    for name, w, h, size in rows[:10]:
        print(f"  {name:40s} {w:5d}x{h:<5d} {size / 1024 / 1024:6.2f} MB")
    print("\nsmallest 5:")
    for name, w, h, size in rows[-5:]:
        print(f"  {name:40s} {w:5d}x{h:<5d} {size / 1024 / 1024:6.2f} MB")


def compress_one(src: Path, dest: Path, max_side: int, quality: int) -> tuple[int, int, tuple[int, int], tuple[int, int]]:
    before = src.stat().st_size
    with Image.open(src) as im:
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        w, h = im.size
        if max(w, h) > max_side:
            scale = max_side / max(w, h)
            new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
            im = im.resize(new_size, Image.LANCZOS)
        else:
            new_size = (w, h)
        buf = io.BytesIO()
        save_kwargs = dict(
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
            subsampling=0 if quality >= 90 else 2,
        )
        if icc:
            save_kwargs["icc_profile"] = icc
        im.save(buf, **save_kwargs)
    data = buf.getvalue()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return before, len(data), (w, h), new_size


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true", help="print dimensions/sizes only")
    ap.add_argument("--max-side", type=int, default=1600)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--sample", type=int, default=0, help="only process N largest photos")
    ap.add_argument("--out", default="", help="write results here instead of in place")
    ap.add_argument("--dry-run", action="store_true", help="compress to temp, report, write nothing")
    args = ap.parse_args()

    if args.probe:
        probe()
        return 0

    targets = list(iter_photos())
    if args.sample:
        targets = sorted(targets, key=lambda p: p.stat().st_size, reverse=True)[: args.sample]

    # dry-run must never touch the originals: always divert output to a scratch dir
    # (tempfile.mkdtemp is avoided on purpose: its 0700 dir breaks writes on Windows)
    if args.dry_run:
        out_dir = REPO.parent / ".compress-dryrun"
        out_dir.mkdir(parents=True, exist_ok=True)
    elif args.out:
        out_dir = Path(args.out).resolve()
    else:
        out_dir = None

    before_total = after_total = 0
    changed = skipped = 0
    worst: list[tuple[float, str]] = []

    for src in targets:
        size = src.stat().st_size
        with Image.open(src) as im:
            w, h = im.size
        if size < SKIP_BYTES and max(w, h) <= SKIP_MAX_SIDE:
            skipped += 1
            before_total += size
            after_total += size
            continue

        dest = (out_dir if out_dir else src.parent) / src.name
        try:
            b, a, old_size, new_size = compress_one(src, dest, args.max_side, args.quality)
        except Exception as exc:  # noqa: BLE001
            print(f"  FAIL {src.name}: {exc}")
            continue
        before_total += b
        after_total += a
        changed += 1
        ratio = a / b if b else 1.0
        if ratio > 0.75:
            worst.append((ratio, src.name))
        print(f"  {src.name:38s} {old_size[0]}x{old_size[1]:<5d} -> {new_size[0]}x{new_size[1]:<5d}  "
              f"{b / 1024 / 1024:6.2f} -> {a / 1024:7.0f} KB  ({ratio * 100:4.0f}%)")

    def mb(n: int) -> float:
        return n / 1024 / 1024

    print()
    print(f"processed {changed}, skipped {skipped}")
    if before_total:
        print(f"total {mb(before_total):.1f} MB -> {mb(after_total):.1f} MB "
              f"({after_total / before_total * 100:.1f}%, saved {mb(before_total - after_total):.1f} MB)")
    if worst:
        print("files that barely shrank (already efficient):")
        for ratio, name in sorted(worst, reverse=True)[:5]:
            print(f"  {name} ({ratio * 100:.0f}%)")
    if args.dry_run:
        shutil.rmtree(out_dir, ignore_errors=True)
        print("\ndry-run: nothing written in place")
    elif args.out:
        print(f"\nwritten to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
