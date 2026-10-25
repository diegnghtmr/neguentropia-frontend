import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react(), tailwindcss(), {
    name: 'license-assets',
    apply: 'build',
    generateBundle() {
      for (const [sourcePath, fileName] of [
        ['./licenses/cojeev/LICENCE', 'licenses/cojeev/LICENCE'],
        ['./src/styles/fonts/DMSans-OFL.txt', 'licenses/fonts/DMSans-OFL.txt'],
        ['./src/styles/fonts/BricolageGrotesque-OFL.txt', 'licenses/fonts/BricolageGrotesque-OFL.txt'],
      ] as const) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(new URL(sourcePath, import.meta.url)) });
      }
    },
  }],
});
