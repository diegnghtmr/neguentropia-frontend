# Neguentropía — frontend

Web interface to explore the analysis of 20 scientific papers on artificial intelligence in education. It reads the abstracts and shows the results that the [backend](https://github.com/diegnghtmr/neguentropia-backend) computes in Java; the browser never runs the algorithms.

Live: https://neguentropia-frontend.vercel.app

## What it does

Five tabs:

| Tab | Shows |
| --- | --- |
| Corpus | The catalog and the original abstract of each paper |
| Ranking | Top 15 terms sorted with Counting, Radix and Bucket sort |
| Similitud | Similarity matrix, pair scores and step-by-step tables |
| Agrupamiento | Three dendrograms, their groups and the silhouette of every cut |
| Búsqueda | Highlighted matches, timings and a step-by-step view of KMP, Boyer-Moore and Rabin-Karp |

## Where things are

| Path | Content |
| --- | --- |
| `src/app/` | Application shell and tabs |
| `src/features/` | One folder per tab: `corpus`, `ranking`, `similarity`, `clustering`, `search` (view, Zod schemas, API calls and tests) |
| `src/shared/` | Shared UI components ([Cojeev UI](https://cojeev.com/ui/docs/)) and utilities |
| `src/infrastructure/api/` | Axios client and backend URL |
| `nginx/` | Static server configuration |
| `Dockerfile.vercel` | Image used locally and on Vercel |

## Run it

Only Docker is needed; Node runs inside the container.

```sh
docker build -f Dockerfile.vercel -t neguentropia-frontend \
  --build-arg VITE_API_BASE_URL=http://127.0.0.1:8080 .
docker run --rm -p 127.0.0.1:4174:80 neguentropia-frontend
```

Then open http://127.0.0.1:4174. The backend must allow that origin in `CORS_ALLOWED_ORIGINS`. Without `--build-arg`, the image uses the public backend on Render.

Tests:

```sh
docker run --rm --user "$(id -u):$(id -g)" --env HOME=/tmp \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app node:24-bookworm-slim \
  sh -c 'npm ci --ignore-scripts && npm test'
```

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Zod, Axios and Vitest.
