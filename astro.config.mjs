// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Dominio di produzione (06/10/2026): da qui escono canonical, og:url,
  // og:image e la sitemap. Il pannello (/admin) resta fuori dalla sitemap.
  site: 'https://asdcittadigalati.it',
  // Indirizzi senza barra finale, come i canonical (vedi Base.astro).
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin'),
      serialize: (item) => ({ ...item, url: item.url.replace(/([^/])\/$/, '$1') }),
    }),
  ],
});
