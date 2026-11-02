export const isLibraryPage = (page: unknown): boolean =>
  typeof page === 'string' && page.toLowerCase().includes('library');

export const nodeHasText = (node: any, phrase: string): boolean => {
  if (typeof node?.text === 'string' && node.text.toLowerCase().includes(phrase.toLowerCase())) return true;
  for (const child of node?.children || []) {
    if (nodeHasText(child, phrase)) return true;
  }
  return false;
};

export const nodeCount = (node: any): number => {
  let count = 1;
  for (const child of node?.children || []) count += nodeCount(child);
  return count;
};