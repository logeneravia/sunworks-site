const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function customerSignup(req, res) {
  const endpoint = process.env.SUNWORKS_CUSTOMER_SIGNUP_URL;
  const token = process.env.SUNWORKS_CUSTOMER_SIGNUP_TOKEN;
  const available = Boolean(endpoint && token);
  res.setHeader('Cache-Control', 'no-store');

  const demo = process.env.VERCEL_ENV === 'preview';
  if (req.method === 'GET') return res.status(200).json({ available, demo });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const body = req.body || {};
  if (body.demo === true) {
    if (!demo || body.email !== 'visitor@example.com' || body.consent !== true) {
      return res.status(400).json({ error: 'Invalid example' });
    }
    return res.status(200).json({ demo: true });
  }
  if (!available) return res.status(503).json({ error: 'Signup unavailable' });
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  if (body.consent !== true || email.length > 254 ||
      !emailPattern.test(email) || firstName.length > 80) {
    return res.status(400).json({ error: 'Invalid signup' });
  }

  try {
    const target = new URL(endpoint);
    if (target.protocol !== 'https:') throw new Error('Invalid upstream protocol');
    const response = await fetch(target, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ email, firstName, consent: true, source: 'sunworks-website' }),
    });
    if (!response.ok) throw new Error('Signup provider rejected the request');
    return res.status(202).json({ accepted: true });
  } catch {
    return res.status(503).json({ error: 'Signup unavailable' });
  }
}
