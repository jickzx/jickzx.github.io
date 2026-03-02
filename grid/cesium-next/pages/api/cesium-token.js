export default function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.CESIUM_ION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token not configured' });
  }

  // Restrict to your domain in production
  const origin = req.headers.origin || '';
  const allowed = [
    'https://jickzx.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  if (origin && !allowed.some(o => origin.startsWith(o))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ token });
}
