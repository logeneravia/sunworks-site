#!/usr/bin/env python3
"""Build news/index.html from news/issues.json.

Adding a new issue = add one entry to issues.json (newest first or not,
we sort here), run this script, commit, push. Thumbnails are discovered
once from each archived issue's HTML and cached back into issues.json.
"""
import json, os, re, urllib.request, html as htmlmod

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ISSUES = os.path.join(ROOT, "news", "issues.json")
OUT = os.path.join(ROOT, "news", "index.html")

READ_RE = re.compile(r"^\((\d+(?:\.\d+)?)\s*second read\)\s*", re.I)
IMG_RE = re.compile(r'<img[^>]+src="([^"]+)"', re.I)
# the Sunworks logo header that opens every Mailchimp issue — never a hero
LOGO = "mailchimp-20200630-65d0006e-3002-4b67-abaf-52afadc7e52a.png"

def find_thumb(url):
    """First real image in the archived issue (mirrored bucket copies only)."""
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            body = r.read().decode("utf-8", "replace")
    except Exception as e:
        print(f"  thumb fetch failed {url}: {e}")
        return None
    for src in IMG_RE.findall(body):
        if "newsletter-images" in src and LOGO not in src:
            return src
    return None

def main():
    with open(ISSUES) as f:
        issues = json.load(f)

    changed = False
    for it in issues:
        if "thumb" not in it:
            print(f"finding thumb for {it['date']} ...")
            it["thumb"] = find_thumb(it["url"])
            changed = True
    if changed:
        with open(ISSUES, "w") as f:
            json.dump(issues, f, indent=2, ensure_ascii=False)

    issues.sort(key=lambda i: i["date"], reverse=True)

    cards, last_year = [], None
    for it in issues:
        year = it["date"][:4]
        if year != last_year:
            cards.append(f'<h2 class="year">{year}</h2>')
            last_year = year
        subject = it["subject"]
        m = READ_RE.match(subject)
        chip = ""
        if m:
            subject = READ_RE.sub("", subject)
            secs = m.group(1)
            chip = f'<span class="chip">{secs} second read</span>'
        d = it["date"]
        pretty = f"{['','January','February','March','April','May','June','July','August','September','October','November','December'][int(d[5:7])]} {int(d[8:10])}, {d[:4]}"
        thumb = (
            f'<div class="card-thumb" style="background-image:url(\'{htmlmod.escape(it["thumb"], quote=True)}\')"></div>'
            if it.get("thumb") else '<div class="card-thumb card-thumb-empty">☀</div>'
        )
        cards.append(f'''<a class="card" href="{htmlmod.escape(it["url"], quote=True)}" target="_blank" rel="noopener">
  {thumb}
  <div class="card-body">
    <div class="card-meta">{pretty}{chip}</div>
    <div class="card-title">{htmlmod.escape(subject)}</div>
    <div class="card-read">Read this issue →</div>
  </div>
</a>''')

    cards_html = "\n".join(cards)
    page = f'''<!DOCTYPE html>
<html lang="en-CA">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>News from Sunworks — the newsletter archive</title>
<meta name="description" content="Every issue of the Sunworks newsletter — art, design, café, and the occasional wee rant, from Red Deer, Alberta.">
<link rel="canonical" href="https://sunworks.ca/news/">
<meta name="theme-color" content="#e76324">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sunworks">
<meta property="og:title" content="News from Sunworks">
<meta property="og:description" content="Every issue of the Sunworks newsletter, newest first.">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: #0e0d0d; color: #222; font-family: Helvetica, Arial, sans-serif; }}
  .banner {{ background: #e76324; padding: 26px 24px 22px; text-align: center; }}
  .banner a {{ text-decoration: none; }}
  .wordmark {{ color: #ffffff; font-size: 30px; font-weight: bold; letter-spacing: 4px; }}
  .tagline {{ color: #ffe3d1; font-size: 12px; letter-spacing: 1.5px; margin-top: 6px; }}
  .intro {{ max-width: 720px; margin: 0 auto; padding: 36px 20px 8px; text-align: center; }}
  .intro h1 {{ color: #f5d1b0; font-size: 28px; line-height: 120%; }}
  .intro p {{ color: #c9b8a8; font-size: 15px; line-height: 150%; margin-top: 10px; }}
  main {{ max-width: 720px; margin: 0 auto; padding: 12px 16px 48px; }}
  .year {{ color: #ff8c00; font-size: 15px; letter-spacing: 3px; margin: 30px 4px 12px; }}
  .card {{ display: flex; gap: 0; background: #f5d1b0; border-radius: 8px; overflow: hidden;
          margin-bottom: 14px; text-decoration: none; transition: transform .12s ease; }}
  .card:hover {{ transform: translateY(-2px); }}
  .card-thumb {{ flex: 0 0 140px; min-height: 116px; background-size: cover; background-position: center top; }}
  .card-thumb-empty {{ display: flex; align-items: center; justify-content: center;
                      font-size: 40px; color: #e76324; background: #f0c49b; }}
  .card-body {{ padding: 14px 18px 12px; }}
  .card-meta {{ color: #8a6a4f; font-size: 12px; letter-spacing: .5px; }}
  .chip {{ background: #ff8c00; color: #fff; font-size: 11px; font-weight: bold;
          border-radius: 10px; padding: 2px 9px; margin-left: 8px; white-space: nowrap; }}
  .card-title {{ color: #b5401f; font-size: 18px; font-weight: bold; line-height: 125%; margin-top: 6px; }}
  .card-read {{ color: #e76324; font-size: 13px; font-weight: bold; margin-top: 8px; }}
  footer {{ background: #e76324; padding: 22px 24px; text-align: center;
           color: #ffe3d1; font-size: 12px; line-height: 160%; }}
  footer a {{ color: #ffffff; }}
  @media (max-width: 520px) {{
    .card {{ flex-direction: column; }}
    .card-thumb {{ flex: none; height: 150px; }}
  }}
</style>
</head>
<body>
<div class="banner">
  <a href="/"><span class="wordmark">SUNWORKS</span></a>
  <div class="tagline">ART &nbsp;·&nbsp; DESIGN &nbsp;·&nbsp; CAFÉ &nbsp;—&nbsp; RED DEER</div>
</div>
<div class="intro">
  <h1>News from Sunworks</h1>
  <p>Every issue of the newsletter — the sales, the events, the pizza on the patio,
     and the occasional wee rant. Newest first.</p>
</div>
<main>
{cards_html}
</main>
<footer>
  SUNWORKS — Red Deer, Alberta<br>
  <a href="https://sunworks.ca">sunworks.ca</a>
</footer>
</body>
</html>
'''
    with open(OUT, "w") as f:
        f.write(page)
    print(f"wrote {OUT} ({len(issues)} issues)")

if __name__ == "__main__":
    main()
