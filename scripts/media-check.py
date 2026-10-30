import hashlib
import io
import json
import os
from pathlib import Path
import sys
import urllib.request
import warnings

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps, ImageSequence


ROOT = Path(__file__).resolve().parent.parent
MODEL_ROOT = "https://huggingface.co/KanariKanaru/nsfw-image-detection-384-onnx/resolve/8edc47eedf74b30fd379673bc202fe3b754b1538/"
MODEL_HASH = "e9350e576608afe4b57a089ffeb0ebafa1389cdcea4882dd61df28c45f1c24d2"
EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico"}
MAX_BYTES = 16 * 1024 * 1024
MAX_PIXELS = 48 * 1024 * 1024 // 4
MAX_FRAMES = 180
REJECT_SCORE = 0.60
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
warnings.simplefilter("error", Image.DecompressionBombWarning)


def verified_bytes(data, expected):
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("Content checker checksum mismatch")
    return data


def model_path():
    directory = Path(os.environ.get("XDG_CACHE_HOME", str(Path.home() / ".cache"))) / "voidstrap" / "media"
    directory.mkdir(parents=True, exist_ok=True)
    files = {
        "model.onnx": MODEL_HASH,
        "LICENSE-APACHE-2.0.txt": "b4123048cb9e96f48ec9ab9e0ec5fe34b6c5a2eb648e88550cc7a630763134c3",
        "MODEL_NOTICES.md": "265c7254d699ce034c215fb1c10d0e45a2b7fd5572b4f0786cff8af3bc1fc908",
    }
    for name, expected in files.items():
        target = directory / name
        if target.exists() and target.stat().st_size <= 32 * 1024 * 1024:
            if hashlib.sha256(target.read_bytes()).hexdigest() == expected:
                continue
        with urllib.request.urlopen(MODEL_ROOT + name, timeout=60) as response:
            data = response.read(32 * 1024 * 1024 + 1)
        if len(data) > 32 * 1024 * 1024:
            raise ValueError("Content checker exceeds its download size limit")
        temporary = target.with_suffix(target.suffix + ".tmp")
        try:
            temporary.write_bytes(verified_bytes(data, expected))
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    return directory / "model.onnx"


class ContentChecker:
    def __init__(self):
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(model_path()), sess_options=options, providers=["CPUExecutionProvider"])
        self.seen = set()

    def __call__(self, image):
        rgba = image.convert("RGBA")
        key = hashlib.sha256(rgba.tobytes() + str(rgba.size).encode()).digest()
        if key in self.seen:
            return
        for background in (255, 0):
            canvas = Image.new("RGBA", rgba.size, (background, background, background, 255))
            rgb = Image.alpha_composite(canvas, rgba).convert("RGB").resize((384, 384), Image.Resampling.BICUBIC)
            pixels = np.asarray(rgb, dtype=np.float32) / np.float32(127.5) - np.float32(1)
            tensor = np.ascontiguousarray(pixels.transpose(2, 0, 1)[None])
            logits = self.session.run(["logits"], {"input": tensor})[0].reshape(-1)
            if logits.shape != (2,) or not np.isfinite(logits).all():
                raise ValueError("Content checker returned an invalid result")
            probabilities = np.exp(logits - logits.max())
            score = float(probabilities[0] / probabilities.sum())
            if score >= REJECT_SCORE:
                raise ValueError("Media rejected by local sexual content checking")
            if rgba.getextrema()[3] == (255, 255):
                break
        self.seen.add(key)


def scan_image(data, check, sheet=None):
    if not data or len(data) > MAX_BYTES:
        raise ValueError("Media exceeds its encoded size limit")
    with Image.open(io.BytesIO(data)) as source:
        if source.format not in {"PNG", "JPEG", "GIF", "WEBP", "BMP", "ICO"}:
            raise ValueError("Unsupported image format")
        count = getattr(source, "n_frames", 1)
        if count > MAX_FRAMES or source.width * source.height * count > MAX_PIXELS:
            raise ValueError("Media exceeds its frame or decoded size limit")
        if source.format == "ICO":
            frames = [source.ico.getimage(size) for size in source.ico.sizes()]
        else:
            frames = ImageSequence.Iterator(source)
        for frame in frames:
            image = ImageOps.exif_transpose(frame).convert("RGBA")
            check(image)
            if sheet is not None:
                width, height = sheet["frameWidth"], sheet["frameHeight"]
                if type(width) is not int or type(height) is not int or min(width, height) < 1 or image.width % width or image.height % height:
                    raise ValueError("Invalid sprite sheet cell dimensions")
                if (image.width // width) * (image.height // height) > MAX_FRAMES:
                    raise ValueError("Sprite sheet exceeds its cell limit")
            else:
                width, height = min(384, image.width), min(384, image.height)
            if sheet is not None or image.width > 384 or image.height > 384:
                for top in range(0, image.height, height):
                    for left in range(0, image.width, width):
                        check(image.crop((left, top, min(left + width, image.width), min(top + height, image.height))))


def main(names):
    mods = ROOT / "mods"
    names = names or sorted(path.name for path in mods.iterdir() if path.is_dir())
    checker = None
    checked = 0
    for name in names:
        directory = mods / name
        if directory.parent.resolve() != mods.resolve() or directory.is_symlink():
            raise ValueError("Invalid mod directory")
        sheets = {}
        metadata = directory / "media.json"
        if metadata.exists():
            if metadata.is_symlink() or metadata.stat().st_size > 262144:
                raise ValueError("Invalid media metadata")
            sheets = json.loads(metadata.read_text(encoding="utf-8"))["spriteSheets"]
            if not isinstance(sheets, dict):
                raise ValueError("Invalid sprite sheet map")
            for relative in sheets:
                target = directory / relative
                if not target.resolve().is_relative_to(directory.resolve()) or not target.is_file() or target.suffix.lower() not in EXTENSIONS:
                    raise ValueError("Invalid sprite sheet path")
        for path in sorted(directory.rglob("*")):
            if path.is_symlink():
                raise ValueError("Symbolic links are not allowed")
            if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
                continue
            if path.stat().st_size > MAX_BYTES:
                raise ValueError("Media exceeds its encoded size limit")
            if checker is None:
                checker = ContentChecker()
            relative = path.relative_to(directory).as_posix()
            try:
                scan_image(path.read_bytes(), checker, sheets.get(relative))
            except Exception:
                print(f"Media rejected: {name}/{relative}", file=sys.stderr)
                raise
            checked += 1
    print(f"Local media checks passed for {checked} files")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except Exception as error:
        print(f"Media checks failed: {type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
