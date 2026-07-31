const MANIFEST_URL = 'https://github.com/ModulesoftLLC/gennetex/releases/latest/download/latest.json';

module.exports = async function desktopUpdates(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const response = await fetch(MANIFEST_URL, { headers: { Accept: 'application/json' } });
    if (response.status === 404) return res.status(204).end();
    if (!response.ok) throw new Error(`Release manifest HTTP ${response.status}`);
    const manifest = await response.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json(manifest);
  } catch (error) {
    console.error('[desktop-updates]', error?.message || error);
    return res.status(503).json({ error: 'Desktop update service unavailable' });
  }
};
