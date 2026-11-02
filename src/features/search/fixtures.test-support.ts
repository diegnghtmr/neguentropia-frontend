export const fixturePattern = 'aba';

export function catalogFixture() {
  return { corpusState: 'ready', papers: Array.from({ length: 20 }, (_, i) => ({
    id: `paper-${i + 1}`, title: `Paper ${i + 1}`, authors: ['Author'],
  })) };
}

export function detailFixture(id: string) {
  const number = Number(id.replace('paper-', ''));
  return { id, title: `Paper ${number}`, authors: ['Author'], originalAbstract: `xababa tail ${number}` };
}

function papers() {
  return Array.from({ length: 20 }, (_, i) => {
    if (i === 1) {
      return { paperId: 'paper-2', positions: [1, 3] };
    }
    if (i === 4) {
      return { paperId: 'paper-5', positions: [1] };
    }
    return { paperId: `paper-${i + 1}`, positions: [] as number[] };
  });
}

export function searchFixture() {
  return {
    pattern: fixturePattern,
    results: [
      { method: 'kmp', preprocessingMilliseconds: 0.0123, searchMilliseconds: 0.45, papers: papers() },
      { method: 'boyer-moore', preprocessingMilliseconds: 0.0234, searchMilliseconds: 0.35, papers: papers() },
      { method: 'rabin-karp', preprocessingMilliseconds: 0.0345, searchMilliseconds: 0.55, papers: papers() },
    ],
  };
}

export function stepsFixture() {
  return {
    pattern: fixturePattern,
    paperId: 'paper-2',
    fragmentStart: 7,
    fragment: 'xab aba',
    positions: [4],
    kmp: {
      failure: [0, 0, 1],
      steps: [
        { index: 0, character: 'x', matchedBefore: 0, fallbacks: [] as number[], matchedAfter: 0, match: false },
        { index: 1, character: 'a', matchedBefore: 0, fallbacks: [] as number[], matchedAfter: 1, match: false },
        { index: 2, character: 'b', matchedBefore: 1, fallbacks: [] as number[], matchedAfter: 2, match: false },
        { index: 3, character: ' ', matchedBefore: 2, fallbacks: [0], matchedAfter: 0, match: false },
        { index: 4, character: 'a', matchedBefore: 0, fallbacks: [] as number[], matchedAfter: 1, match: false },
        { index: 5, character: 'b', matchedBefore: 1, fallbacks: [] as number[], matchedAfter: 2, match: false },
        { index: 6, character: 'a', matchedBefore: 2, fallbacks: [] as number[], matchedAfter: 1, match: true },
      ],
    },
    boyerMoore: {
      lastOccurrences: [{ character: 'a', index: 2 }, { character: 'b', index: 1 }],
      steps: [
        { start: 0, match: false, mismatchIndex: 2, textCharacter: 'b', lastIndex: 1, shift: 1 },
        { start: 1, match: false, mismatchIndex: 2, textCharacter: ' ', lastIndex: -1, shift: 3 },
        { start: 4, match: true, mismatchIndex: -1, textCharacter: '', lastIndex: -1, shift: 1 },
      ],
    },
    rabinKarp: {
      base: 256,
      modulus: 1000000007,
      patternHash: 6382177,
      high: 65536,
      windows: [
        { start: 0, text: 'xab', hash: 7889250, equalHash: false, match: false },
        { start: 1, text: 'ab ', hash: 6382112, equalHash: false, match: false },
        { start: 2, text: 'b a', hash: 6430817, equalHash: false, match: false },
        { start: 3, text: ' ab', hash: 2122082, equalHash: false, match: false },
        { start: 4, text: 'aba', hash: 6382177, equalHash: true, match: true },
      ],
    },
  };
}
