import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';
import { fetchSiteContent } from '../lib/siteContent';

const SiteContentContext = createContext(DEFAULT_SITE_CONTENT);

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT);

  useEffect(() => {
    let alive = true;
    fetchSiteContent().then((data) => {
      if (alive) setContent(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
