import { describe, expect, it } from 'vitest';
import { availabilitySchema, catalogSchema, detailSchema } from './schemas';
import { syntheticCatalog, syntheticDetail } from './fixtures.test-support';

describe('corpus response boundary', () => {
  it('accepts a complete synthetic catalog without changing manifest order', () => {
    expect(catalogSchema.parse(syntheticCatalog())).toEqual(syntheticCatalog());
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
  it.each([5, 7])('rejects %i similarity methods', (count) => {
    const data = syntheticCatalog();
    data.capabilities.similarity = Array.from({ length: count }, () => data.capabilities.similarity[0]!);
    expect(catalogSchema.safeParse(data).success).toBe(false);
  });
  it('rejects duplicate or unsupported similarity methods', () => {
    const data = syntheticCatalog();
    data.capabilities.similarity[1]!.method = data.capabilities.similarity[0]!.method;
    expect(catalogSchema.safeParse(data).success).toBe(false);
    expect(catalogSchema.safeParse({ ...data, capabilities: { ...data.capabilities, similarity: [
      { ...data.capabilities.similarity[0], method: 'unknown' }, ...data.capabilities.similarity.slice(1),
    ] } }).success).toBe(false);
  });
  it.each([
    { available: true, blockedReason: 'NOT_IMPLEMENTED' },
    { available: false, blockedReason: null },
    { available: false, blockedReason: 'UNKNOWN' },
  ])('rejects incoherent availability %j', (availability) => {
    expect(availabilitySchema.safeParse(availability).success).toBe(false);
  });
  it('accepts available capability and an explicit blocked reason', () => {
    expect(availabilitySchema.safeParse({ available: true, blockedReason: null }).success).toBe(true);
    expect(availabilitySchema.safeParse({ available: false, blockedReason: 'PERMISSION_UNVERIFIED' }).success).toBe(true);
  });
  it('preserves exact original Unicode, whitespace and markup as text', () => {
    expect(detailSchema.parse(syntheticDetail())).toEqual(syntheticDetail());
  });
  it.each([
    { originalAbstract: '' }, { originalAbstract: '\ud800' },
    { abstractSha256: 'not-a-hash' }, { corpusVersion: '' }, { sourceFile: '/private' },
  ])('rejects invalid detail %j', (change) => {
    expect(detailSchema.safeParse({ ...syntheticDetail(), ...change }).success).toBe(false);
  });
});
