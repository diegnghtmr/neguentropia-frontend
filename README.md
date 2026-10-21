# Neguentropía — frontend

Local SPA with React 19, Vite 8, strict TypeScript and Tailwind CSS 4. The corpus screen queries the catalog and the selected abstract through Axios, validates the responses with Zod and shows the backend's real capabilities. It does not run analyses or compute frequencies or algorithms in JavaScript.

## Requirements and scope

- A working Docker. Node, npm, installation, tests, build and application run inside containers; do not install Node on the host.
- Node 24 and npm 11. The lockfile pins the installed tree; use `npm ci`.
- No corpus, models, credentials, results or private instructions are included in this repository.
- The algorithms are implemented in Java. The tests use synthetic data and a mocked network.

Run the commands from the `frontend/` folder, which is also the application's only Docker context.

## Install and check

```sh
docker run --rm --user "$(id -u):$(id -g)" --env HOME=/tmp \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  npm ci --ignore-scripts --no-fund --no-audit
```

`--ignore-scripts` prevents running dependency install scripts. Do not omit the optional platform dependencies the bundler needs. Do not upgrade npm globally because of a version notice.

```sh
docker run --rm --network=none --user "$(id -u):$(id -g)" --env HOME=/tmp \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  sh -eu -c 'npm test; npm run typecheck; npm run build'
```

Scripts:

| Command inside the container | Purpose |
| --- | --- |
| `npm run dev` | Vite on `0.0.0.0`; development, not a production server |
| `npm test` | Finite Vitest suite, no watch mode |
| `npm test -- src/features/corpus src/app/App.test.tsx` | Focused tests for schemas, client, corpus and shell |
| `npm run typecheck` | TypeScript without emitting files |
| `npm run build` | Typecheck and Vite build into `dist/` |
| `npm run preview` | Local inspection of the build; not production |

## Ranking view

Use the Corpus and Ranking tabs (arrow keys, Home/End, or native button activation) to switch views. The corpus reader keeps its selection. Ranking runs only when **Run ranking** is pressed and POSTs `{}` to `/api/ranking` through the shared Axios client. A strict Zod boundary validates the corpus, preprocessing, parameters and three ordered results before rendering.

Each method has a top-15 table (or all available terms when fewer than 15 exist), preserving Java's term order, ties and frequencies exactly. Run details identify the corpus version, fixed 20-abstract scope, sizes, Radix base and Bucket parameters. Durations are Java single-run sorting times in **ms**, not benchmarks, HTTP latency or browser render times. Tables use the existing Cojeev visual language without adding chart dependencies.

Loading prevents duplicate submissions. Failures clear prior results and show fixed, sanitized messages for invalid requests, unavailable service, server/network errors or incompatible responses. Leaving Ranking aborts its pending request and discards its result; cancellation does not guarantee stopping Java work. Tests use synthetic fixtures and mocked HTTP only; browser layout and real backend acceptance are separate checks.

## Reader components

The reader uses the NativeSelect, Card, Badge and Alert components from [Cojeev UI](https://cojeev.com/ui/docs/), located in `src/shared/{ui,lib}/`; the theme and the local DM Sans and Bricolage Grotesque fonts are global. The selection is a native `select` with twenty options in catalog order, and an error or a selection change never presents the previous result as current. The Cojeev (MIT) and font (OFL) licenses are served from the footer.

## Local development

After installing:

```sh
docker run --rm -it --user "$(id -u):$(id -g)" --env HOME=/tmp \
  -p 127.0.0.1:5173:5173 \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  npm run dev -- --port 5173 --strictPort
```

Open `http://127.0.0.1:5173`. Without configuration, the client queries `/api/papers` and `/api/papers/{id}` on the same origin. If no backend exists there, it shows an error: it does not use fixtures or fallback data.

For a backend on another origin, pass `--env VITE_API_BASE_URL=http://127.0.0.1:8081` to the development container. This optional variable contains only the backend's public base URL, without the `/api` suffix; the client adds that suffix. Never put keys in `VITE_*`: their values are embedded in the served JavaScript. The backend must explicitly allow the frontend origin through its CORS configuration. No proxy or intermediate service is added.

## Local production image

```sh
docker build --file Dockerfile.vercel --tag neguentropia-frontend:local \
  --build-arg VITE_API_BASE_URL=http://127.0.0.1:8081 .
docker run --rm -p 127.0.0.1:4174:80 neguentropia-frontend:local
```

Open `http://127.0.0.1:4174`; configure the exact allowed origin `http://127.0.0.1:4174` in the backend. Omitting the ARG keeps relative `/api` requests. The URL is fixed at build time: changing a variable of the Nginx container does not reconfigure the bundle. The multi-stage image uses Node to build and Nginx to serve only the static output. The base images are pinned by digest. It does not copy `node_modules`, development sources, notes or secrets into the final image.

`PORT` sets Nginx's internal port at startup; its default value is `80`. Port publishing must match:

```sh
docker run --rm --env PORT=8080 -p 127.0.0.1:4174:8080 neguentropia-frontend:local
```

Nginx substitutes only `PORT` in its template; it keeps `$uri` to resolve files. Deep routes return the SPA; missing assets answer 404, not the application HTML. Hashed bundles have immutable caching and the HTML document uses no-cache. An invalid port makes the Nginx configuration fail; there is no fallback to another server.

## Check the real server

In one terminal, start the local image. In another, check the root, asset MIME/content, icon, SPA fallback and 404:

```sh
docker run --rm --network=host \
  --env FRONTEND_ORIGIN=http://127.0.0.1:4174 \
  --mount "type=bind,src=$PWD/scripts/check-container.mjs,dst=/checks/check-container.mjs,readonly" \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  node --test /checks/check-container.mjs
```

`--network=host` applies to Docker Engine on Linux; in other environments, choose a network/route that reaches the server. You can also use `--network=container:<name>` to share the network of a test container and set `FRONTEND_ORIGIN=http://127.0.0.1:80` (or the alternative `PORT`). The check makes no analysis requests and needs no corpus. It does not replace functional review in a browser.

## Structure

- `src/app/`: composition of the accessible shell and its test.
- `src/features/corpus/`: catalog, original reader, schemas and synthetic tests.
- `src/features/ranking/`: explicit ranking action, validated HTTP boundary, three tables and synthetic tests.
- `src/shared/`: UI components shared by corpus and ranking, and their support utilities.
- `src/infrastructure/api/`: Axios instance and public backend URL.
- `src/main.tsx`: React bootstrap.
- `src/styles.css`: styles and Tailwind 4.
- `src/test/`: test runner setup.
- `nginx/`: static server template.
- `scripts/check-container.mjs`: HTTP check of the already started image.

The catalog is shown only if it contains exactly 20 unique IDs, six unique supported methods and consistent availabilities. The detail must match the ID and the corpus version; the original text is kept and rendered as text, never HTML. Changing or clearing the selection discards the previous detail and aborts its request; stale responses do not update the screen. Errors are shown without private details or previous data presented as a current success. Capabilities are informational, even when the backend declares one as available.

The tests use only 20 new synthetic records per case and a mocked network; they contain no real abstracts. They cover invariants, errors, loading, selection, out-of-order responses and shell regressions (brand, main landmark and explicit navigation). Health and preparation are the backend's responsibility: this screen does not infer their state from liveness.

No empty features, unused chart libraries or generic framework are created. Similarity, clustering and search are not implemented yet.

## Hosting

`Dockerfile.vercel` is the Docker path adopted for Vercel Container Runtime Beta, reused locally. The port configured in the provider must match Nginx.
