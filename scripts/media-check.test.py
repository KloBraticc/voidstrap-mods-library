import importlib.util
import io
from pathlib import Path
import unittest
import sys

from PIL import Image


spec = importlib.util.spec_from_file_location("media_check", Path(__file__).with_name("media-check.py"))
sys.dont_write_bytecode = True
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


def encode(frames, format="PNG"):
    output = io.BytesIO()
    frames[0].save(output, format=format, save_all=len(frames) > 1, append_images=frames[1:], duration=100, loop=0)
    return output.getvalue()


class MediaChecks(unittest.TestCase):
    def test_later_gif_frame_rejects_entire_animation(self):
        data = encode([Image.new("RGB", (16, 16), "white"), Image.new("RGB", (16, 16), "red")], "GIF")
        seen = []

        def check(image):
            seen.append(image.getpixel((0, 0)))
            if len(seen) == 2:
                raise ValueError("Rejected frame")

        with self.assertRaises(ValueError):
            media.scan_image(data, check)
        self.assertEqual(len(seen), 2)

    def test_every_declared_sprite_cell_is_checked(self):
        image = Image.new("RGB", (32, 16), "white")
        image.paste("blue", (16, 0, 32, 16))
        seen = []
        media.scan_image(encode([image]), lambda frame: seen.append(frame.size), {"frameWidth": 16, "frameHeight": 16})
        self.assertEqual(seen, [(32, 16), (16, 16), (16, 16)])

    def test_malformed_media_is_rejected(self):
        with self.assertRaises(Exception):
            media.scan_image(b"GIF89a", lambda image: None)

    def test_invalid_sprite_dimensions_are_rejected(self):
        with self.assertRaises(ValueError):
            media.scan_image(encode([Image.new("RGB", (16, 16))]), lambda image: None, {"frameWidth": 7, "frameHeight": 16})

    def test_modified_model_is_rejected(self):
        with self.assertRaises(ValueError):
            media.verified_bytes(b"changed model", media.MODEL_HASH)

    def test_checker_failure_propagates(self):
        def unavailable(image):
            raise RuntimeError("Checker unavailable")

        with self.assertRaises(RuntimeError):
            media.scan_image(encode([Image.new("RGB", (16, 16))]), unavailable)

    def test_real_local_model_accepts_safe_control(self):
        media.ContentChecker()(Image.new("RGB", (384, 384), (128, 128, 128)))

    def test_real_local_model_accepts_plain_brown_and_pixel_art(self):
        checker = media.ContentChecker()
        checker(Image.new("RGB", (384, 384), (134, 96, 67)))
        art = Image.new("RGB", (16, 16), (134, 96, 67))
        art.paste((92, 170, 60), (0, 0, 16, 5))
        checker(art)


if __name__ == "__main__":
    unittest.main()
