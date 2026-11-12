import { createContext, useContext } from 'react';

// Where a publication website's pages live: "/p/<slug>" inside DevPress, or "" at the root of the
// publication's own subdomain or verified custom domain. Provided by PublicationSite.
export const SiteContext = createContext({ base: '', publication: null, tags: [] });
export const useSite = () => useContext(SiteContext);
