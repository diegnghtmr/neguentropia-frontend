# Neguentropía — frontend

Local SPA with React 19, Vite 8, strict TypeScript and Tailwind CSS 4. The corpus screen queries the catalog and the selected abstract through Axios, validates the responses with Zod and displays the original text. Analysis views request Java results; no frequencies or analysis algorithms are computed in JavaScript.

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

Use the Corpus, Ranking, Similitud, Agrupamiento and Búsqueda tabs (pointer, arrow keys or Home/End) to switch views. The corpus reader keeps its selection. Ranking runs only when **Ejecutar ranking** is pressed and POSTs `{}` to `/api/ranking` through the shared Axios client. A strict Zod boundary validates the corpus, preprocessing, parameters and three ordered results before rendering.

Each method has a top-15 table (or all available terms when fewer than 15 exist), preserving Java's term order, ties and frequencies exactly. Run details show the preprocessing settings returned by the backend, the fixed 20-abstract scope, sizes, Radix base and Bucket parameters. Durations are Java single-run sorting times in **ms**, not benchmarks, HTTP latency or browser render times. Tables use the existing Cojeev visual language without adding chart dependencies.

Loading prevents duplicate submissions and shows a text-free skeleton shaped like the result (announced to assistive technology with a Spanish status label). Failures clear prior results and show fixed, sanitized messages for invalid requests, unavailable service, server/network errors or incompatible responses. Leaving Ranking aborts its pending request and discards its result; cancellation does not guarantee stopping Java work. Tests use synthetic fixtures and mocked HTTP only; browser layout and real backend acceptance are separate checks.

## Similarity view

Select two or more papers and at least one method, then press **Calcular similitud** to compare their abstracts through `/api/similarity`. All six methods are selected by default; any of them can be unchecked. Papers are chosen in a searchable multi-select (type a title or id to filter) whose selections appear as removable tags and whose description shows how many papers exist and how many are selected; a secondary button selects all papers or clears the selection. Each pair is identified by paper titles and has a table with four-decimal scores and method-specific explanatory values, with a caption stating the score scales (classical scores from 0 to 1, embedding cosines from -1 to 1). On narrow screens the explanation sits under the method and score. TF-IDF uses the full 20-paper corpus. Embedding rows show the model name and vector dimension. Embedding vectors are generated once in advance and compared with a Java cosine calculation. Scores are not probabilities or plagiarism percentages. Before a comparison the view asks the user to select at least two papers and run it. If embedding vectors are unavailable, a Spanish message chosen by the error code is shown without partial results.

The shared Axios transport and strict Zod validation require complete pairs and the requested methods in order. Loading blocks duplicate runs. Selection changes clear previous results and cancel pending requests; leaving the view also aborts its request. API errors show a Spanish message chosen by their validated `code` (not the English backend text) without retaining prior results.

## Clustering view

Choose the number of clusters (2 to 19, initially 2) and press **Ejecutar agrupamiento**. The view POSTs `{ "clusterCount": n }` to `/api/clustering` through the shared Axios client and validates the response with a strict Zod boundary: a strict shape with no extra fields, 20 leaves, three results in the order single, complete and average linkage, 19 merges per tree, and value ranges for ids, heights, sizes, silhouette and the number of groups. Merge references, sizes and partition coverage are not checked; they come from the backend as computed.

A compact table above the results lists each method's silhouette and group sizes. Each result shows its dendrogram, its silhouette value and the groups of the cut, with titles from the corpus catalog (paper IDs if the catalog is unavailable). The method with the highest silhouette is marked "Mayor silueta"; when two methods tie for the highest value both are marked, and when all three are equal the view says all methods have the same silhouette. If the catalog cannot be loaded, an alert says so and paper IDs are shown. The dendrogram is a plain React SVG: leaves follow the order of a walk from the root (left child first), each merge sits at the height computed by the backend on a labeled distance axis, and a merge is placed at the midpoint of its children. A dashed line marks the cut between the last applied merge and the next one, and each group has its own vivid theme color: merges inside a group and the leaf stubs are drawn thick in it, merges above the cut stay thin and gray, paper IDs are pills of that color in the drawing and in the list, and groups are tinted blocks showing the group size and the paper ID before each title. Merge steps are also available in a collapsed table (step, the two joined items as pills, and the distance): a paper is a pill in its group color, an earlier merge is a pill such as "paso 4 (3 artículos)" that takes the group color when all its papers are in one group and stays neutral otherwise, a dashed row marks the cut, and steps after it use a muted text color. Each dendrogram scales to the width of its container. The browser never recomputes clustering, heights or silhouette. Changing the cluster count discards the previous result; errors show a Spanish message chosen by the API error `code`.

## Search view

Type a pattern and press **Buscar** (disabled while the field is empty). The view POSTs `{ "pattern": ..., "methods": ["kmp", "boyer-moore", "rabin-karp"] }` to `/api/search` through the shared Axios client and validates the response with a strict Zod boundary: no extra fields, one to three method results, 20 papers per result, non-negative durations and positions.

With at least one match, the view first states the number of matches and papers followed by a per-method table with preprocessing and search times. Papers with more matches come first; papers with the same number keep corpus order. Each paper with at least one match shows its title (from the corpus catalog, or its ID if the catalog is unavailable), its number of matches and its original abstract, fetched from the paper detail endpoint, with every match highlighted using the positions computed by Java (`start` to `start + pattern length`). Overlapping matches are merged into one highlighted range for display, and the text is rendered as text, never HTML. When nothing matches the view shows only "Sin coincidencias" and the timings. If the catalog cannot be loaded, an alert says so. A table with each method's preprocessing time and search time in milliseconds follows the summary and precedes the papers. Errors show a Spanish message chosen by the API error `code`. The browser never searches the text itself.

## Reader components

The interface uses the Tabs, Select, Field, Label, Button, Table, Card, Badge, Alert, Empty and Skeleton components from [Cojeev UI](https://cojeev.com/ui/docs/), located in `src/shared/{ui,lib}/`; the theme and the local DM Sans and Bricolage Grotesque fonts are global. The [Cojeev Select](https://cojeev.com/ui/docs/select/) opens twenty options in catalog order and supports keyboard navigation. It initially shows “Elige un artículo”; after choosing a paper, select another to change the reading (there is no empty/reset option). Ranking uses the same component for its disabled, fixed analysis scope. An error or a selection change never presents the previous result as current. The Cojeev (MIT) and font (OFL) license texts are included in the build output under `licenses/`.

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
- `src/features/similarity/`: paper and method selection, validated comparisons, pair tables and synthetic tests.
- `src/features/clustering/`: cluster count selector, validated clustering response, SVG dendrograms, groups, silhouette and synthetic tests.
- `src/features/search/`: pattern field, validated search response, per-method timings table, highlighted abstracts and synthetic tests.
- `src/shared/`: UI components shared by the views and their support utilities.
- `src/infrastructure/api/`: Axios instance and public backend URL.
- `src/main.tsx`: React bootstrap.
- `src/styles.css`: styles and Tailwind 4.
- `src/test/`: test runner setup.
- `nginx/`: static server template.
- `scripts/check-container.mjs`: HTTP check of the already started image.

The catalog is shown only if it contains exactly 20 unique IDs. The detail must match the selected ID; the original text is kept and rendered as text, never HTML. Changing the selection discards the previous detail and aborts its request; stale responses do not update the screen. Errors are shown without private details or previous data presented as a current success.

The tests use only 20 new synthetic records per case and a mocked network; they contain no real abstracts. They cover invariants, errors, loading, selection, out-of-order responses and shell regressions (brand, main landmark and explicit navigation). Health and preparation are the backend's responsibility: this screen does not infer their state from liveness.

No empty features, unused chart libraries or generic framework are created.

## Hosting

`Dockerfile.vercel` is the Docker path adopted for Vercel Container Runtime Beta, reused locally. The port configured in the provider must match Nginx.
