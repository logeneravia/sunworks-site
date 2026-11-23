"""Update the Sunworks news page and the home page's "What's happening" block.

Letters come from news/catalog.json, InTheKnow texts from news/texts.json
(newest first is not required; both are sorted by date here).
"""

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
texts = sorted(
    json.loads((news / "texts.json").read_text()),
    key=lambda text: text["date"],
    reverse=True,
)


def text_day(value):
    return stamp(value, "%A, %B %-d")


past_texts = "".join(
    f'<article class="past-text"><p class="eyebrow"><time datetime="{text["date"]}">'
    f'{text_day(text["date"])}</time></p><p>{escape(text["text"])}</p></article>'
    for text in texts[1:6]
)
texts_fragment = f'''<!-- TEXTS START -->
 <div id="latest-text"><p class="eyebrow"><time id="text-date" datetime="{texts[0]["date"]}">{text_day(texts[0]["date"])}</time></p><p id="text-body">{escape(texts[0]["text"])}</p></div>
 <details><summary>Previous texts</summary>{past_texts}</details>
 <!-- TEXTS END -->'''


def replace(html, start, end, fragment, what):
    pattern = re.escape(start) + r".*?" + re.escape(end)
    updated, count = re.subn(pattern, lambda _: fragment, html, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"Could not find the {what}.")
    return updated


page = news / "index.html"
html = page.read_text()
if "<!-- LETTERS START -->" in html:
    pattern = r"<!-- LETTERS START -->.*?<!-- LETTERS END -->"
else:
    pattern = r'<ul class="news-list" id="current-issues">.*?</ul>\s*<h3>From the archive</h3>\s*<ul class="news-list">.*?</ul>'
updated, count = re.subn(pattern, lambda _: fragment, html, count=1, flags=re.S)
if count != 1:
    raise SystemExit("Could not find the Sunworks newsletter section.")
updated = replace(updated, "<!-- TEXTS START -->", "<!-- TEXTS END -->",
                  texts_fragment, "InTheKnow section on the news page")
page.write_text(updated)

# Home page: the latest text with its date, the newest letter with its
# picture and opening paragraph, and the Instagram panel (filled by site.js).
latest = issues[0]
earlier_texts = "".join(
    f'<li><time datetime="{text["date"]}">{stamp(text["date"], "%a %b %-d")}</time>'
    f'<span>{escape(text["text"])}</span></li>'
    for text in texts[1:3]
)
home_fragment = f'''<!-- HAPPENING START -->
 <div class="happening-grid">
  <article class="happening-card happening-text" aria-labelledby="text-heading">
   <h2 class="card-label" id="text-heading">Latest text</h2>
   <div id="latest-text"><p class="eyebrow"><time id="text-date" datetime="{texts[0]["date"]}">{text_day(texts[0]["date"])}</time></p>
   <p id="text-body" class="text-now">{escape(texts[0]["text"])}</p></div>
   <ul class="earlier-texts" aria-label="Earlier texts">{earlier_texts}</ul>
   <p class="card-links"><a class="text-link" href="/join/#texts">Get the daily text</a><a href="/news/#texts">Earlier texts</a></p>
  </article>
  <article class="happening-card happening-letter" aria-labelledby="letter-heading">
   <h2 class="card-label" id="letter-heading">From the newsletter</h2>
   <a class="letter-photo" href="{escape(latest["url"], quote=True)}" tabindex="-1" aria-hidden="true"><img src="{escape(latest["image"], quote=True)}" alt="" width="640" height="400"></a>
   <time datetime="{latest["date"]}">{stamp(latest["date"], "%B %-d, %Y")}</time>
   <h3>{link(latest)}</h3>
   <p>{escape(latest["excerpt"][0])}</p>
   <p class="card-links"><a class="text-link" href="{escape(latest["url"], quote=True)}">Read the letter</a><a href="/news/#letters">All letters</a></p>
  </article>
  <article class="happening-card happening-ig" aria-labelledby="ig-heading">
   <h2 class="card-label" id="ig-heading">On Instagram</h2>
   <div id="instagram" class="ig-latest"></div>
   <p class="card-links"><a class="text-link" href="https://www.instagram.com/sunworksliving/">Follow @sunworksliving</a></p>
  </article>
 </div>
 <!-- HAPPENING END -->'''
home = site / "index.html"
home.write_text(replace(home.read_text(), "<!-- HAPPENING START -->",
                        "<!-- HAPPENING END -->", home_fragment,
                        "What's happening block on the home page"))
