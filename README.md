# Sunworks Living

The replacement for the public WordPress website. This version uses plain HTML,
CSS and browser JavaScript, with two optional Vercel functions.

## Editing

- Each page has an `index.html` in its own folder. Shared type, colour and layout
  live in `assets/site.css`.
- `data/garage-sale.json` takes entries with a title, description, CAD price
  (zero for giveaway), optional photo and alt text, and status (`available` or
  `claimed`). Use a relative site image URL such as `/assets/listings/table.jpg`.
- The news page shows the six newest newsletters with pictured excerpts and groups older letters by month. Edit `news/catalog.json` and run `python3 tools/build_news.py` to refresh it. It also includes six dated InTheKnow broadcasts.
  Its Instagram preview and the SMS keyword signup link use the existing public
  profile and confirmed InTheKnow destination.

## Connecting the public updates

Set `SUNWORKS_PUBLIC_UPDATES_URL` in the Vercel preview environment once a
public-only feed is available. The expected data is a JSON object with
`sms` and `newsletters`. An SMS has `date`, `text`, and `published: true`.
Each newsletter has `date`, `title`, an HTTPS `url`, and `published: true`.
Use ISO dates. Publish only staff-approved broadcast text and issue links.
The site never needs subscriber records, reply content, or administrative
credentials for reading these updates.

## Connecting customer signup

Set `SUNWORKS_CUSTOMER_SIGNUP_URL` and `SUNWORKS_CUSTOMER_SIGNUP_TOKEN` in the
Vercel preview environment when a dedicated Arazzo opt-in endpoint is available.
The website forwards email, first name, explicit email consent, and source over
HTTPS using a scoped server-side credential. The receiving service owns
deduplication, rate limits, consent records and any confirmation email. Until
connected, visitors can request to join by email. Preview deployments also
provide a fixed, non-persisting signup example. Text signup is separate and
uses the existing SMS keyword.

## Preview

Deploy the source to the existing `sunworks-site` project under the
Logeneravia Vercel team. A preview deployment is sufficient for review.
The public `sunworks.ca` domain is attached when the replacement is approved.
