// author: Stephen Eaton
// Rehype plugin: tag **MUST** / **SHOULD** / **MAY** (and NOT forms) so CSS can render them as RFC 2119 badges.
// The Markdown source stays plain bold text, so raw .md served to agents is unchanged.
const KEYWORDS = { MUST: 'must', 'MUST NOT': 'must', REQUIRED: 'must', SHALL: 'must', 'SHALL NOT': 'must', SHOULD: 'should', 'SHOULD NOT': 'should', RECOMMENDED: 'should', MAY: 'may', OPTIONAL: 'may' };

export default function rehypeRfc2119() {
  const visit = (node) => {
    if (node.type === 'element' && node.tagName === 'strong' && node.children?.length === 1 && node.children[0].type === 'text') {
      const level = KEYWORDS[node.children[0].value.trim()];
      if (level) node.properties = { ...node.properties, className: ['rfc2119', `rfc2119-${level}`] };
    }
    node.children?.forEach(visit);
  };
  return (tree) => visit(tree);
}
