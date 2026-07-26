import os
import re
import base64

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
STANDALONE_DIR = os.path.join(BASE_DIR, "standalone")

with open(os.path.join(FRONTEND_DIR, 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()

with open(os.path.join(FRONTEND_DIR, 'css', 'styles.css'), 'r', encoding='utf-8') as f:
    css = f.read()

with open(os.path.join(FRONTEND_DIR, 'js', 'exercises_data.js'), 'r', encoding='utf-8') as f:
    ex_js = f.read()

with open(os.path.join(FRONTEND_DIR, 'js', 'app.js'), 'r', encoding='utf-8') as f:
    app_js = f.read()

with open(os.path.join(FRONTEND_DIR, 'js', 'analytics.js'), 'r', encoding='utf-8') as f:
    analytics_js = f.read()

try:
    with open(os.path.join(FRONTEND_DIR, 'assets', 'icon.jpg'), 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode('utf-8')
        img_src = f"data:image/jpeg;base64,{img_b64}"
except Exception:
    img_src = ""

# Replace CSS link
html = re.sub(r'<link rel="stylesheet" href="css/styles\.css">', f'<style>\n{css}\n</style>', html)

# Replace icon img
if img_src:
    html = html.replace('src="assets/icon.jpg"', f'src="{img_src}"')
    html = html.replace('href="assets/favicon.ico"', f'href="{img_src}"')
    html = html.replace('href="assets/apple-touch-icon.png"', f'href="{img_src}"')

# Replace JS script tags
script_tags = r'<script src="js/exercises_data\.js"></script>\s*<script src="js/app\.js"></script>\s*<script src="js/analytics\.js"></script>'
bundled_js = f'<script>\n{ex_js}\n\n{app_js}\n\n{analytics_js}\n</script>'
html = re.sub(script_tags, bundled_js, html)

out_file = os.path.join(STANDALONE_DIR, 'gymtracker_standalone.html')
with open(out_file, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"✅ Generado archivo portátil único: {out_file}")
