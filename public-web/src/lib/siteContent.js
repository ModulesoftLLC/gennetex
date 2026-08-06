import { DEFAULT_SITE_CONTENT } from './siteContentDefaults';

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  if (Array.isArray(patch)) return patch.map((item, i) => (typeof item === 'object' && item && base?.[i] ? deepMerge(base[i], item) : item));
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      out[key] = value;
    } else if (value && typeof value === 'object' && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function mergeSiteContent(partial) {
  return deepMerge(DEFAULT_SITE_CONTENT, partial || {});
}

export async function fetchSiteContent() {
  try {
    const response = await fetch('/api/public-site', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      console.warn('[siteContent] API returned', response.status);
      return { content: DEFAULT_SITE_CONTENT, updatedAt: null };
    }
    const data = await response.json();
    if (!data?.content) return { content: DEFAULT_SITE_CONTENT, updatedAt: null };
    return {
      content: mergeSiteContent(data.content || {}),
      updatedAt: data.updatedAt || null,
    };
  } catch (e) {
    console.warn('[siteContent]', e);
    return { content: DEFAULT_SITE_CONTENT, updatedAt: null };
  }
}

export function formatCopyright(text) {
  return String(text || '').replace(/\{year\}/g, String(new Date().getFullYear()));
}
