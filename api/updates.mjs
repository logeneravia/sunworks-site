const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function publicDate(value) {
  return typeof value === 'string' && datePattern.test(value) &&
    !Number.isNaN(Date.parse(value));
}

function publicUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export default async function updates(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const source = process.env.SUNWORKS_PUBLIC_UPDATES_URL;
  if (!source) return res.status(200).json({ sms: null, newsletters: [] });
  try {
    const response = await fetch(source, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) throw new Error('Update source unavailable');
    const data = await response.json();
    const sms = data.sms?.published === true && publicDate(data.sms.date) &&
      typeof data.sms.text === 'string' && data.sms.text.trim()
      ? { date: data.sms.date, text: data.sms.text.trim().slice(0, 1800) }
      : null;
    const newsletters = (Array.isArray(data.newsletters) ? data.newsletters : [])
      .filter((item) => item?.published === true && publicDate(item.date) &&
        typeof item.title === 'string' && item.title.trim() && publicUrl(item.url))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map(({ date, title, url }) => ({ date, title: title.trim().slice(0, 200), url }));
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({ sms, newsletters });
  } catch {
    return res.status(503).json({ sms: null, newsletters: [] });
  }
}
