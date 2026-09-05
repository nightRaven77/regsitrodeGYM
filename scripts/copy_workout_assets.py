import os
import json
import shutil

SOURCE_DIR = "/Users/erick/.gemini/antigravity/brain/9c7278dd-bc78-4d6d-82c7-9caae904bc16/scratch/workout-guide/packages/workout-guide"
MANIFEST_PATH = os.path.join(SOURCE_DIR, "manifest.json")
ASSETS_DIR = os.path.join(SOURCE_DIR, "assets")

TARGET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "assets", "exercises")
TARGET_MANIFEST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "assets", "exercises_manifest.json")

def main():
    print(f"Leyendo manifest de origen: {MANIFEST_PATH}")
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        raw_manifest = json.load(f)

    os.makedirs(TARGET_DIR, exist_ok=True)

    processed_manifest = []
    total_files_copied = 0

    for item in raw_manifest:
        slug = item["slug"]
        dest_folder = os.path.join(TARGET_DIR, slug)
        os.makedirs(dest_folder, exist_ok=True)

        frames_data = []
        for frame in item.get("frames", []):
            rel_path = frame["path"]
            filename = os.path.basename(rel_path)
            src_file = os.path.join(SOURCE_DIR, rel_path)
            dst_file = os.path.join(dest_folder, filename)

            if os.path.exists(src_file):
                shutil.copy2(src_file, dst_file)
                total_files_copied += 1
                frames_data.append({
                    "index": frame["index"],
                    "filename": filename,
                    "url": f"assets/exercises/{slug}/{filename}"
                })

        processed_manifest.append({
            "id": item.get("id"),
            "slug": slug,
            "name": item.get("name"),
            "equipment": item.get("equipment", "Bodyweight"),
            "primaryMuscle": item.get("primaryMuscle", "General"),
            "secondaryMuscles": item.get("secondaryMuscles", []),
            "frames": frames_data,
            "attribution": item.get("attribution", {})
        })

    with open(TARGET_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(processed_manifest, f, indent=2, ensure_ascii=False)

    print(f"✅ Procesados {len(processed_manifest)} ejercicios y copiados {total_files_copied} archivos SVG a {TARGET_DIR}")
    print(f"✅ Manifest generado en {TARGET_MANIFEST}")

if __name__ == "__main__":
    main()
