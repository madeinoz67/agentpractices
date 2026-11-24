// author: Stephen Eaton
// Validate taxonomy + practices. Exit 1 on any error. Usage: bun scripts/check.ts
import { loadTaxonomy, validateTaxonomy } from './lib/taxonomy';
import { findUnidentified, loadPractices, validatePractices } from './lib/practices';

const t = loadTaxonomy('taxonomy');
const ps = loadPractices('src/content/docs');
const issues = [...validateTaxonomy(t), ...validatePractices(ps, t, { checkPath: true }), ...findUnidentified('src/content/docs', t)];
for (const i of issues) console[i.level === 'error' ? 'error' : 'warn'](`${i.level.toUpperCase()} ${i.code} ${i.msg}`);
const errors = issues.filter((i) => i.level === 'error').length;
console.log(`checked ${t.concepts.length} concepts, ${ps.length} practices: ${errors} error(s), ${issues.length - errors} warning(s)`);
process.exit(errors ? 1 : 0);
