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
