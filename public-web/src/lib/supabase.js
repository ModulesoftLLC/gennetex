// Supabase client removed — site now uses Firebase-backed server endpoints.
// This shim provides a minimal supabase-like interface used by public-web to avoid
// attempting to contact a dead Supabase URL. Full migration: replace with Firestore
// queries or API calls as needed.

export const supabase = {
  from(table) {
    const self = {
      async select() { return self; },
      eq() { return self; },
      order() { return self; },
      maybeSingle() { return self._fetch(table, true); },
      single() { return self._fetch(table, true); },
      async _fetch(tbl, single = false) {
        try {
          // Public site main content is served by /api/public-site
          if (tbl === 'publicSiteContent' || tbl === 'public_site_content' || tbl === 'main') {
            const res = await fetch('/api/public-site');
            if (!res.ok) return { data: null, error: new Error('API error') };
            const json = await res.json();
            return { data: single ? json.content : json.content, error: null };
          }

          // Generic fallback: return empty array or null so the site doesn't crash
          return { data: single ? null : [], error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      },
    };

    return self;
  },
};

export const HERO_GIF_URL = '/hero-network.gif';
export const HERO_POSTER_URL = '/hero-network-poster.jpg';
export const HERO_IMAGE_URL = HERO_GIF_URL;
export const HERO_VIDEO_URL = HERO_GIF_URL;
