const hues = ['pink', 'blue', 'olive', 'yellow'];
const palette = [...hues.map((hue) => `--v-${hue}`), '--v-ink', ...hues.map((hue) => `--v-${hue}-deep`)];
const softs = [...hues.map((hue) => `--v-${hue}-soft`), '--status-pending-bg', ...hues.map((hue) => `--v-${hue}-soft`)];

export const neutralStroke = 'var(--v-text-3)';

export function groupColor(group: number) {
  return `var(${palette[group % palette.length]!})`;
}

export function groupSoft(group: number) {
  return `var(${softs[group % softs.length]!})`;
}

export function pillInk(group: number) {
  if (palette[group % palette.length] === '--v-ink') {
    return 'var(--v-on-ink)';
  }
  return 'var(--v-on-accent)';
}
