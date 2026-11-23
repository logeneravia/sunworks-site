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

const latestText = byId('latest-text');
if (latestText) {
  getJson('/api/updates').then(({ sms, newsletters }) => {
    if (sms) {
      byId('text-date').dateTime = sms.date;
      // Same look as the baked-in date: "Sunday, November 22".
      byId('text-date').textContent = new Date(sms.date + 'T12:00:00')
        .toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
      byId('text-body').textContent = sms.text;
      latestText.hidden = false;
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

const listings = byId('listings');
if (listings) {
  getJson('/data/garage-sale.json').then((publishedItems) => {
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
        if (item.photo) {
          const image = element('img');
          image.src = item.photo;
          image.alt = item.photoAlt || item.title;
          image.loading = 'lazy';
          card.append(image);
        }
        const price = item.price === 0 ? 'Free' : currency.format(item.price);
        card.append(element('h3', item.title), element('p', price, 'price'));
        if (item.description) card.append(element('p', item.description));
        if (item.status === 'claimed') {
          card.append(element('p', 'Claimed'));
        } else if (!item.demo) {
          const inquire = element('a', 'Ask about this item', 'text-link');
          inquire.href = 'mailto:shop@sunworks.ca?subject=' +
            encodeURIComponent('Sunworks garage sale: ' + item.title);
          card.append(inquire);
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
