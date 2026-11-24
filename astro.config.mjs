// author: Stephen Eaton
// Astro + Starlight configuration. Sidebar and llms-txt sets are derived from taxonomy/domains.yaml.
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import rehypeRfc2119 from './src/plugins/rehype-rfc2119.mjs';
import { loadTaxonomy, dirOf } from './scripts/lib/taxonomy.ts';

const t = loadTaxonomy('taxonomy');
const DOCS = 'src/content/docs';
const tops = t.concepts.filter((c) => !c.broader && c.status !== 'deprecated');
const hasContent = (dir) => existsSync(`${DOCS}/${dir}`);
const domainGroups = tops
  .filter((c) => hasContent(dirOf(t, c.id)))
  .map((top) => ({
    label: top.label,
    collapsed: true,
    items: t.concepts
      .filter((c) => c.broader === top.id && hasContent(dirOf(t, c.id)))
      .map((sub) => ({ label: sub.label, items: [{ autogenerate: { directory: dirOf(t, sub.id) } }] })),
  }));

export default defineConfig({
  site: 'https://agentpractices.dev',
  markdown: { rehypePlugins: [rehypeRfc2119] },
  integrations: [
    starlight({
      title: 'Agent Best Practices',
      description: 'Canonical, versioned best practices for AI agents. Agents start at llms.txt or catalog.json.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/madeinoz67/best-practices' }],
      editLink: { baseUrl: 'https://github.com/madeinoz67/best-practices/edit/main/' },
      lastUpdated: true,
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://agentpractices.dev/og.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1280' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '640' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Agent Best Practices — the rules AI agents check before they act.' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://agentpractices.dev/og.png' } },
      ],
      customCss: [
        '@fontsource/ibm-plex-sans/400.css', '@fontsource/ibm-plex-sans/600.css', '@fontsource/ibm-plex-sans/700.css',
        '@fontsource/ibm-plex-mono/400.css', '@fontsource/ibm-plex-mono/600.css',
        './src/styles/theme.css',
      ],
      components: { PageTitle: './src/components/PageTitle.astro' },
      sidebar: [
        { label: 'Start here', items: ['index', 'how-agents-use-this-site', { label: 'Contributing', items: [{ autogenerate: { directory: 'contributing' } }] }] },
        ...domainGroups,
      ],
      plugins: [
        starlightLlmsTxt({
          projectName: 'Agent Best Practices',
          rawContent: true,
          customSets: tops.map((c) => ({ label: c.label, paths: [`${dirOf(t, c.id)}/**`], description: `all ${c.label} practices` })),
        }),
      ],
    }),
  ],
});
