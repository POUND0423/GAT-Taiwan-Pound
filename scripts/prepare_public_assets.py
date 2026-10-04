"""Generate publication assets locally; requires Pillow to regenerate PNGs."""
import argparse
import json
import random
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
ROOT = parser.parse_args().root.resolve()
ASSETS = ROOT / "outputs" / "xinyi-walk" / "assets"

def atlas(filename, brick=False):
    rng = random.Random(101 if brick else 188)
    image = Image.new("RGB", (1024, 128))
    pixels = image.load()
    for y in range(128):
        for x in range(1024):
            tile = x // 128
            base = (125 + tile * 3, 82 + tile * 2, 64 + tile) if brick else (170 - tile * 5, 166 - tile * 4, 154 - tile * 3)
            grain = rng.randrange(-8, 9)
            pixels[x, y] = tuple(max(0, min(255, c + grain)) for c in base)
    image.save(ASSETS / filename)

def map_image(city, roads):
    bounds = city["bounds"]
    width = 2048
    scale = width / (bounds[2] - bounds[0])
    height = round((bounds[3] - bounds[1]) * scale)
    image = Image.new("RGB", (width, height), "#b9c4ad")
    draw = ImageDraw.Draw(image)
    def project(point):
        return ((point[0] - bounds[0]) * scale, (point[1] - bounds[1]) * scale)
    widths = {"primary": 14, "secondary": 11, "tertiary": 8, "residential": 5,
              "service": 3, "unclassified": 5, "footway": 1.7, "path": 1.5,
              "pedestrian": 4, "cycleway": 2}
    for road in roads:
        if len(road["points"]) < 2:
            continue
        color = "#deded4" if road["kind"] in ("footway", "path", "pedestrian", "cycleway") else "#727a7b"
        draw.line([project(p) for p in road["points"]], fill=color,
                  width=max(1, round(widths.get(road["kind"], 4) * scale)))
    for building in city["buildings"]:
        for polygon in building["footprints"]:
            if len(polygon) >= 3:
                draw.polygon([project(p) for p in polygon], fill="#c4c2b8", outline="#9b9f97")
    image.save(ASSETS / "map-public.png")

def main():
    city = json.loads((ASSETS / "city.json").read_text(encoding="utf-8"))
    roads = json.loads((ASSETS / "roads.json").read_text(encoding="utf-8"))
    # Runtime uses geometry, not business names or the duplicate road listing.
    for building in city["buildings"]:
        building.pop("name", None)
    city.pop("roads", None)
    city["source"] = "OpenStreetMap contributors; derived geometry, ODbL 1.0"
    city["license"] = "https://opendatacommons.org/licenses/odbl/1-0/"
    (ASSETS / "city.json").write_text(json.dumps(city, ensure_ascii=True, separators=(",", ":")) + "\n", encoding="utf-8")
    atlas("concrete-public.png")
    atlas("brick-public.png", brick=True)
    Image.new("RGB", (1024, 128), (128, 128, 255)).save(ASSETS / "normal-public.png")
    map_image(city, roads)
    print(json.dumps({"buildings": len(city["buildings"]), "roadSegments": len(roads), "generatedImages": 4}))

if __name__ == "__main__":
    main()
