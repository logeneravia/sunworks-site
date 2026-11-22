"""Update the letter section of the Sunworks news page from its catalog."""

from collections import defaultdict
from datetime import date
from html import escape
import json
from pathlib import Path
import re

site = Path(__file__).resolve().parents[1]
news = site / "news"
issues = sorted(
    json.loads((news / "catalog.json").read_text()),
    key=lambda issue: issue["date"],
    reverse=True,
)


def link(issue):
    return f'<a href="{escape(issue["url"], quote=True)}">{escape(issue["title"])}</a>'


def stamp(value, form):
    return date.fromisoformat(value).strftime(form)


def feature(issue):
    paragraphs = "\n".join(f"<p>{escape(text)}</p>" for text in issue["excerpt"])
    return f'''<article class="letter-preview">
  <time datetime="{issue["date"]}">{stamp(issue["date"], "%B %-d, %Y")}</time>
  <h3>{link(issue)}</h3>
  <div class="letter-excerpt">
    <img src="{escape(issue["image"], quote=True)}" alt="{escape(issue["alt"], quote=True)}" loading="lazy" width="160" height="120">
    {paragraphs}
  </div>
</article>'''


recent = issues[:6]
months = defaultdict(list)
for issue in issues[6:]:
    months[issue["date"][:7]].append(issue)
old_months = []
for month, rows in months.items():
    rows_html = "\n".join(
        f'<li><time datetime="{issue["date"]}">{stamp(issue["date"], "%b %-d")}</time>{link(issue)}</li>'
        for issue in rows
    )
    label = stamp(month + "-01", "%B %Y")
    old_months.append(
        f'<details class="letter-month"><summary>{label}</summary><ul class="news-list">{rows_html}</ul></details>'
    )

recent_html = "\n".join(feature(issue) for issue in recent)
older_html = "\n".join(old_months)
fragment = f'''<!-- LETTERS START -->
<div class="recent-letters">
{recent_html}
</div>
<h3 class="older-letters-heading">Older letters by month</h3>
<div class="older-letters">
{older_html}
</div>
<!-- LETTERS END -->'''
page = news / "index.html"
html = page.read_text()
if "<!-- LETTERS START -->" in html:
    pattern = r"<!-- LETTERS START -->.*?<!-- LETTERS END -->"
else:
    pattern = r'<ul class="news-list" id="current-issues">.*?</ul>\s*<h3>From the archive</h3>\s*<ul class="news-list">.*?</ul>'
updated, count = re.subn(pattern, lambda _: fragment, html, count=1, flags=re.S)
if count != 1:
    raise SystemExit("Could not find the Sunworks newsletter section.")
page.write_text(updated)
