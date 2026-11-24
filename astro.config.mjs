// author: Stephen Eaton
// Astro + Starlight configuration for the agent best-practices site.
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';

const domains = [
  ['Agent Engineering', 'agent-engineering'],
  ['Multi-Agent Systems', 'multi-agent-systems'],
  ['Knowledge Modelling', 'knowledge-modelling'],
  ['Software Engineering', 'software-engineering'],
  ['Security & Safety', 'security-safety'],
  ['Operations', 'operations'],
  ['Documentation & Writing', 'documentation-writing'],
];

export default defineConfig({
  site: 'https://madeinoz67.github.io',
  base: '/best-practices',
  integrations: [
    starlight({
      title: 'Agent Best Practices',
      description:
        'Canonical, versioned best practices for AI agents. Start at /best-practices/llms.txt or /best-practices/catalog.json.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/madeinoz67/best-practices' }],
      editLink: { baseUrl: 'https://github.com/madeinoz67/best-practices/edit/main/' },
      lastUpdated: true,
      sidebar: [
        { label: 'Start here', items: [{ label: 'Overview', link: '/' }, { label: 'Contributing', items: [{ autogenerate: { directory: 'contributing' } }] }] },
        ...domains.map(([label, directory]) => ({ label, items: [{ autogenerate: { directory } }] })),
      ],
      plugins: [
        starlightLlmsTxt({
          projectName: 'Agent Best Practices',
          rawContent: true,
          customSets: domains.map(([label, dir]) => ({ label, paths: [`${dir}/**`], description: `all ${label} practices` })),
        }),
      ],
    }),
  ],
});
