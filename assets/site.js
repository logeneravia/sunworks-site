const byId = (id) => document.getElementById(id);

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function getJson(path) {
  const response = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Unable to load');
  return response.json();
}

function formatDay(value) {
  return new Date(value + 'T12:00:00').toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Instagram shows straight away — no click needed (Chip, Nov 22: "we should
// already show an instagram preview rather than making people click").
const instagram = byId('instagram');
if (instagram && !instagram.querySelector('iframe')) {
  const frame = element('iframe', '', 'instagram-frame');
  frame.title = 'Recent Sunworks Living posts on Instagram';
  frame.src = 'https://www.instagram.com/sunworksliving/embed/';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  instagram.append(frame);
}

// Dates in the same look as the baked-in ones.
function longDay(value) { // "Sunday, November 22"
  return new Date(value + 'T12:00:00')
    .toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
}
function shortDay(value) { // "Sat Nov 21"
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).formatToParts(new Date(value + 'T12:00:00')).map((p) => [p.type, p.value]));
  return `${parts.weekday.replace('.', '')} ${parts.month.replace('.', '')} ${parts.day}`;
}

// The latest InTheKnow texts come live from Strum through /api/updates; the
// texts baked into the page stay when the feed is empty or unreachable.
const latestText = byId('latest-text');
if (latestText) {
  getJson('/api/updates').then(({ sms, texts, newsletters }) => {
    const recent = texts?.length ? texts : (sms ? [sms] : []);
    if (recent.length) {
      byId('text-date').dateTime = recent[0].date;
      byId('text-date').textContent = longDay(recent[0].date);
      byId('text-body').textContent = recent[0].text;
      latestText.hidden = false;
    }

    // Home page: the two texts before the latest.
    const earlier = byId('earlier-texts');
    if (earlier && texts?.length > 1) {
      earlier.replaceChildren(...texts.slice(1, 3).map((item) => {
        const row = element('li');
        const date = element('time', shortDay(item.date));
        date.dateTime = item.date;
        row.append(date, element('span', item.text));
        return row;
      }));
    }

    // What's new page: the previous texts under "Previous texts".
    const previous = byId('previous-texts');
    if (previous && texts?.length > 1) {
      previous.replaceChildren(previous.querySelector('summary'), ...texts.slice(1, 6).map((item) => {
        const card = element('article', '', 'past-text');
        const label = element('p', '', 'eyebrow');
        const date = element('time', longDay(item.date));
        date.dateTime = item.date;
        label.append(date);
        card.append(label, element('p', item.text));
        return card;
      }));
    }

    const currentIssues = byId('current-issues');
    if (currentIssues && newsletters?.length) {
      const items = newsletters.map((issue) => {
        const row = element('li');
        const date = element('time', formatDay(issue.date));
        date.dateTime = issue.date;
        const link = element('a', issue.title);
        link.href = issue.url;
        row.append(date, link);
        return row;
      });
      currentIssues.replaceChildren(...items);
    }
  }).catch(() => {});
}

// Garage sale: staff add items at staff.sunworks.ca/garage (Nov 22); this page
// reads the live public feed, falling back to the static file. Contact: Chip,
// Nov 22: "They could text my personal phone number or email." Then: "I want
// people to text me so maybe strumworks would be best" — texts go to the
// Sunworks Strum number (the 431 line), which lands in the Strum inbox, texts
// Chip an alert and prints a reply slip; email goes to the shop address.
const GARAGE_FEED = 'https://staff.sunworks.ca/api/garage-public';
const GARAGE_CONTACT = { sms: '+14313403455', email: 'shop@sunworks.ca' };

// Strum signs up anyone whose text CONTAINS a list's join keyword once spaces
// and punctuation are stripped (live keyword, Nov 22: "intheknow"). So the
// pre-filled text avoids "in the" before the item name, and falls back to a
// generic line if an item's own name would still trip it.
const STRUM_JOIN_KEYWORDS = ['intheknow'];
function garageText(title) {
  const ask = 'Hi, is the ' + title + ' from the Sunworks garage sale still available?';
  const flat = ask.toLowerCase().replace(/[^a-z0-9]/g, '');
  return STRUM_JOIN_KEYWORDS.some((k) => flat.includes(k))
    ? 'Hi, I have a question about an item in the Sunworks garage sale.'
    : ask;
}

// Full-size photo viewer for the garage sale: the whole photo, uncropped,
// with arrows when an item has more than one. Esc, the ✕ or a tap on the
// dark background closes it.
let viewer = null;
function openViewer(pictures, start, title) {
  if (!viewer) {
    viewer = element('div', '', 'photo-viewer');
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.hidden = true;
    const close = element('button', '✕', 'viewer-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    const prev = element('button', '‹', 'viewer-prev');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Previous photo');
    const next = element('button', '›', 'viewer-next');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next photo');
    const img = element('img', '', 'viewer-image');
    const count = element('p', '', 'viewer-count');
    viewer.append(img, prev, next, close, count);
    document.body.append(viewer);
    const show = () => {
      img.src = viewer.pictures[viewer.at];
      img.alt = `${viewer.title}, photo ${viewer.at + 1} of ${viewer.pictures.length}`;
      const many = viewer.pictures.length > 1;
      prev.hidden = next.hidden = !many;
      count.textContent = many ? `${viewer.at + 1} of ${viewer.pictures.length}` : '';
    };
    const step = (by) => {
      viewer.at = (viewer.at + by + viewer.pictures.length) % viewer.pictures.length;
      show();
    };
    const shut = () => {
      viewer.hidden = true;
      document.body.style.overflow = '';
      viewer.opener?.focus();
    };
    viewer.show = show;
    viewer.shut = shut;
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    close.addEventListener('click', shut);
    viewer.addEventListener('click', (event) => { if (event.target === viewer) shut(); });
    document.addEventListener('keydown', (event) => {
      if (viewer.hidden) return;
      if (event.key === 'Escape') shut();
      else if (event.key === 'ArrowLeft' && viewer.pictures.length > 1) step(-1);
      else if (event.key === 'ArrowRight' && viewer.pictures.length > 1) step(1);
    });
  }
  viewer.pictures = pictures;
  viewer.at = start || 0;
  viewer.title = title;
  viewer.opener = document.activeElement;
  viewer.show();
  viewer.hidden = false;
  document.body.style.overflow = 'hidden';
  viewer.querySelector('.viewer-close').focus();
}

async function garageItems() {
  try {
    const response = await fetch(GARAGE_FEED, { headers: { Accept: 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.items)) return data.items;
    }
  } catch { /* fall back to the static file */ }
  return getJson('/data/garage-sale.json');
}

const listings = byId('listings');
if (listings) {
  garageItems().then((publishedItems) => {
    let items = publishedItems;
    const demo = byId('garage-demo');
    const filters = byId('listing-filters');
    const empty = byId('listing-empty');
    const currency = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

    function render(filter) {
      const selected = items.filter((item) => filter === 'all' ||
        (filter === 'free' ? item.price === 0 : item.price > 0));
      listings.replaceChildren(...selected.map((item) => {
        const card = element('article', '', 'panel');
        if (item.demo && !item.photo) {
          const sample = element('div', 'Example listing', 'garage-placeholder-photo');
          sample.setAttribute('aria-hidden', 'true');
          card.append(sample);
        }
        // Up to 5 photos per item (Nov 23): the main picture, then small
        // thumbnails underneath that swap into the main spot when tapped.
        const pictures = item.photos?.length ? item.photos : (item.photo ? [item.photo] : []);
        if (pictures.length) {
          // The card crops to fit; tapping opens the whole photo (Chip, Nov 23:
          // "click on an item and see the whole photo").
          let shown = 0;
          const image = element('img', '', 'garage-photo');
          image.src = pictures[0];
          image.alt = item.photoAlt || item.title;
          image.loading = 'lazy';
          image.tabIndex = 0;
          image.setAttribute('role', 'button');
          image.setAttribute('aria-label', `See the whole photo of ${item.title}`);
          image.addEventListener('click', () => openViewer(pictures, shown, item.title));
          image.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openViewer(pictures, shown, item.title);
            }
          });
          card.append(image);
          if (pictures.length > 1) {
            const strip = element('div', '', 'garage-thumbs');
            pictures.forEach((src, i) => {
              const pick = element('button');
              pick.type = 'button';
              pick.setAttribute('aria-label', `Photo ${i + 1} of ${pictures.length}`);
              pick.setAttribute('aria-pressed', String(i === 0));
              const thumb = element('img');
              thumb.src = src;
              thumb.alt = '';
              thumb.loading = 'lazy';
              pick.append(thumb);
              pick.addEventListener('click', () => {
                image.src = src;
                shown = i;
                for (const other of strip.children) other.setAttribute('aria-pressed', String(other === pick));
              });
              strip.append(pick);
            });
            card.append(strip);
          }
        }
        const price = item.price === 0 ? 'Free' : currency.format(item.price);
        card.append(element('h3', item.title), element('p', price, 'price'));
        // How many there are (Nov 23), when it's more than one and not gone.
        if (item.quantity > 1 && item.status !== 'claimed') {
          card.append(element('p', `${item.quantity} available`, 'garage-qty'));
        }
        if (item.description) card.append(element('p', item.description));
        if (item.status === 'claimed') {
          card.append(element('p', 'Claimed'));
        } else if (!item.demo) {
          const subject = 'Sunworks garage sale: ' + item.title;
          const ask = element('p', '', 'garage-ask');
          if (GARAGE_CONTACT.sms) {
            const text = element('a', 'Text about this item', 'text-link');
            text.href = 'sms:' + GARAGE_CONTACT.sms + '?body=' + encodeURIComponent(garageText(item.title));
            ask.append(text, document.createTextNode('  ·  '));
          }
          const mail = element('a', GARAGE_CONTACT.sms ? 'Email' : 'Ask about this item', 'text-link');
          mail.href = 'mailto:' + GARAGE_CONTACT.email + '?subject=' + encodeURIComponent(subject);
          ask.append(mail);
          card.append(ask);
        }
        return card;
      }));
      empty.hidden = true;
      byId('listing-status').textContent = selected.length ? '' : 'No items in this category yet.';
    }

    if (items.length) {
      filters.hidden = false;
      demo.hidden = true;
      render('all');
    } else {
      getJson('/api/customer-signup').then(({ demo: canDemo }) => {
        demo.hidden = !canDemo;
      }).catch(() => { demo.hidden = true; });
      demo.addEventListener('click', () => {
        items = [
          { title: 'Wooden side table', price: 35, description: 'An example of a priced item.', demo: true },
          { title: 'Pair of display baskets', price: 0, description: 'An example of a giveaway.', demo: true },
          { title: 'Reading lamp', price: 15, description: 'An example of an item already taken.', status: 'claimed', demo: true },
        ];
        filters.hidden = false;
        demo.hidden = true;
        byId('garage-demo-note').hidden = false;
        render('all');
      });
    }
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      for (const option of filters.querySelectorAll('button')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      render(button.dataset.filter);
    });
  }).catch(() => {});
}

const customerForm = byId('customer-form');
if (customerForm) {
  let previewDemo = false;
  const sample = byId('signup-demo');
  getJson('/api/customer-signup').then(({ available, demo }) => {
    if (!available) {
      if (demo) sample.hidden = false;
      return;
    }
    byId('signup-fallback').hidden = true;
    customerForm.hidden = false;
  }).catch(() => {});

  sample.addEventListener('click', () => {
    previewDemo = true;
    sample.hidden = true;
    customerForm.hidden = false;
    byId('signup-demo-note').hidden = false;
    byId('first-name').value = 'Sample Visitor';
    byId('email').value = 'visitor@example.com';
    byId('first-name').readOnly = true;
    byId('email').readOnly = true;
    customerForm.querySelector('button').textContent = 'Try example signup';
    customerForm.querySelector('[name=consent]').focus();
  });

  customerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = customerForm.querySelector('button');
    const status = byId('signup-status');
    const fields = new FormData(customerForm);
    button.disabled = true;
    status.textContent = 'Sending your request…';
    try {
      const response = await fetch('/api/customer-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.get('email'),
          firstName: fields.get('firstName'),
          consent: fields.has('consent'),
          demo: previewDemo,
        }),
      });
      if (!response.ok) throw new Error('Signup unavailable');
      if (!previewDemo) customerForm.reset();
      status.textContent = previewDemo
        ? 'Example complete. No customer details were stored or sent.'
        : 'Thanks. Your signup request has been received.';
    } catch {
      status.textContent = 'The form is temporarily unavailable. You can request to join by email.';
      byId('signup-fallback').hidden = false;
    } finally {
      button.disabled = false;
    }
  });
}
