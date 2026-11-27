"""Keep sunworks.ca's canonical tags and sitemap in step with its pages.

Run after adding, moving or editing a page:

    python3 tools/build_seo.py

For every public index.html it writes (or corrects) one
<link rel="canonical" href="https://sunworks.ca/<path>/"> right after the
page's meta description, then rebuilds sitemap.xml with each page's
last-changed date (its last commit, or today if it has uncommitted edits).
robots.txt is a plain file at the site root and points to the sitemap.
"""

from datetime import date
from pathlib import Path
import re
import subprocess

SITE = Path(__file__).resolve().parents[1]
ORIGIN = "https://sunworks.ca"
SKIP_DIRS = {"wp-archive", "tools", "node_modules", ".git", ".vercel", ".claude", "api", "assets", "data", "img"}
CANONICAL = re.compile(r'<link rel="canonical" href="[^"]*">\n?')


def pages():
    for path in sorted(SITE.rglob("index.html")):
        rel = path.relative_to(SITE)
        if rel.parts[0] in SKIP_DIRS:
            continue
        url_path = "/" + "/".join(rel.parts[:-1]) + ("/" if len(rel.parts) > 1 else "")
        yield path, rel, ORIGIN + url_path


def last_changed(rel):
    dirty = subprocess.run(["git", "status", "--porcelain", "--", str(rel)], cwd=SITE,
                           capture_output=True, text=True).stdout.strip()
    if dirty:
        return date.today().isoformat()
    stamp = subprocess.run(["git", "log", "-1", "--format=%cs", "--", str(rel)], cwd=SITE,
                           capture_output=True, text=True).stdout.strip()
    return stamp or date.today().isoformat()


entries = []
for path, rel, url in pages():
    html = path.read_text()
    if re.search(r'<meta name="robots" content="[^"]*noindex', html):
        continue  # a page marked noindex stays out of the sitemap
    tag = f'<link rel="canonical" href="{url}">'
    html = CANONICAL.sub("", html)
    desc = re.search(r'<meta name="description" content="[^"]*">\n?', html)
    title = re.search(r"</title>\n?", html)
    anchor = desc or title
    if not anchor:
        raise SystemExit(f"{rel}: no <title> or meta description to place the canonical tag after")
    end = anchor.end()
    sep = "" if html[end - 1] == "\n" else "\n"
    html = html[:end] + sep + tag + "\n" + html[end:]
    path.write_text(html)
    entries.append((url, last_changed(rel)))

body = "".join(f"  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n" for u, d in entries)
(SITE / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "</urlset>\n")
print(f"{len(entries)} pages: canonical tags set, sitemap.xml written")
