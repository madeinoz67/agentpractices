// author: Stephen Eaton
// Content collection schema: Starlight docs + optional practice metadata.
// Practice-level cross-checks (taxonomy, IDs, relations) live in scripts/check.ts.
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Every source carries `note`: one line saying why that source matters to this practice's rules.
// The note is required. A source with no note is a bare link, and the body's old References
// section is what used to carry these notes, so dropping it without `note` loses content.
const source = z.object({ title: z.string(), url: z.string().url(), note: z.string().min(1) });

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        id: z.string().regex(/^BP-\d{4}$/).optional(),
        domain: z.string().regex(/^D(\.[A-Z]{2,4}){1,3}$/).optional(),
        type: z.enum(['guideline', 'pattern', 'anti-pattern', 'checklist', 'procedure', 'reference']).optional(),
        roles: z.array(z.enum(['any', 'orchestrator', 'planner', 'implementer', 'reviewer', 'researcher'])).optional(),
        stage: z.array(z.enum(['plan', 'build', 'verify', 'operate'])).optional(),
        status: z.enum(['draft', 'adopted', 'deprecated']).optional(),
        version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
        updated: z.coerce.date().optional(),
        reviewed: z.coerce.date().optional(),
        review_by: z.coerce.date().optional(),
        related: z.array(z.string()).optional(),
        superseded_by: z.string().nullable().optional(),
        sources: z.array(source).optional(),
      }),
    }),
  }),
};
