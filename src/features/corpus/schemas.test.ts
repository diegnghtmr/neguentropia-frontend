import { describe, expect, it } from 'vitest';
import { catalogSchema, detailSchema } from './schemas';
import { syntheticCatalog, syntheticDetail } from './fixtures.test-support';

describe('corpus response boundary', () => {
  it('accepts a complete synthetic catalog without changing manifest order', () => {
    const { corpusState, papers } = syntheticCatalog();
    const catalog = { corpusState, papers };
    expect(catalogSchema.parse(catalog)).toEqual(catalog);
  });
  it.each([19, 21])('rejects %i papers', (count) => {
    const data = syntheticCatalog();
    data.papers = Array.from({ length: count }, (_, i) => ({ id: `synthetic-${i}`, title: 'Synthetic', authors: ['Synthetic'] }));
    expect(catalogSchema.safeParse(data).success).toBe(false);
  });
  it('rejects duplicate IDs', () => {
    const data = syntheticCatalog();
    data.papers[1]!.id = data.papers[0]!.id;
    expect(catalogSchema.safeParse(data).success).toBe(false);
  });
  it.each(['id', 'title', 'authors'] as const)('rejects empty %s', (field) => {
    const data = syntheticCatalog();
    const paper = { ...data.papers[0], [field]: field === 'authors' ? [] : '' };
    expect(catalogSchema.safeParse({ ...data, papers: [paper, ...data.papers.slice(1)] }).success).toBe(false);
  });
  it('rejects non-ready catalog and private extra fields', () => {
    expect(catalogSchema.safeParse({ ...syntheticCatalog(), corpusState: 'unavailable' }).success).toBe(false);
    expect(catalogSchema.safeParse({ ...syntheticCatalog(), sourceFile: '/private' }).success).toBe(false);
  });
  it('preserves exact original Unicode, whitespace and markup as text', () => {
    expect(detailSchema.parse(syntheticDetail())).toEqual(syntheticDetail());
  });
  it.each([
    { originalAbstract: '' }, { originalAbstract: '\ud800' },
    { sourceFile: '/private' },
  ])('rejects invalid detail %j', (change) => {
    expect(detailSchema.safeParse({ ...syntheticDetail(), ...change }).success).toBe(false);
  });
});
