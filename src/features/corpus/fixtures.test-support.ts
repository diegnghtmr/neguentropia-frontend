import type { PaperCatalog, PaperDetail } from './schemas';

// Synthetic records only; each call creates isolated mutable test data.
export function syntheticCatalog(): PaperCatalog {
  return {
    corpusState: 'ready',
    papers: Array.from({ length: 20 }, (_, index) => ({
      id: `synthetic-${index + 1}`,
      title: `Synthetic paper ${index + 1}`,
      authors: ['Synthetic Author'],
    })),
  };
}

export function syntheticDetail(id = 'synthetic-1'): PaperDetail {
  return {
    id,
    title: `Synthetic paper ${id.split('-')[1]}`,
    authors: ['Synthetic Author'],
    originalAbstract: '  Synthetic e\u0301 🌱 <script>text only</script>\nUnchanged.  ',
  };
}
