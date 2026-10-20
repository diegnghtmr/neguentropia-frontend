# Neguentropía — frontend

SPA local React 19, Vite 8, TypeScript estricto y Tailwind CSS 4. La pantalla de corpus consulta el catálogo y el abstract seleccionado mediante Axios, valida las respuestas con Zod y muestra las capacidades reales del backend. No ejecuta análisis ni calcula frecuencias o algoritmos en JavaScript.

## Requisitos y alcance

- Docker operativo. Node, npm, instalación, pruebas, compilación y aplicación se ejecutan dentro de contenedores; no instalar Node en el anfitrión.
- Node 24 y npm 11. El lockfile fija el árbol instalado; usar `npm ci`.
- No se incluyen corpus, modelos, credenciales, resultados ni instrucciones privadas en este repositorio.
- Los algoritmos se implementan en Java. Las pruebas usan datos sintéticos y red simulada.

Ejecutar los comandos desde la carpeta `frontend/`, que es también el único contexto Docker de la aplicación.

## Instalar y comprobar

```sh
docker run --rm --user "$(id -u):$(id -g)" --env HOME=/tmp \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  npm ci --ignore-scripts --no-fund --no-audit
```

`--ignore-scripts` evita ejecutar scripts de instalación de dependencias. No omitir las dependencias opcionales de plataforma que necesita el bundler. No actualizar globalmente npm por un aviso de versión.

```sh
docker run --rm --network=none --user "$(id -u):$(id -g)" --env HOME=/tmp \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  sh -eu -c 'npm test; npm run typecheck; npm run build'
```

Scripts:

| Comando dentro del contenedor | Función |
| --- | --- |
| `npm run dev` | Vite en `0.0.0.0`; desarrollo, no servidor de producción |
| `npm test` | Suite Vitest finita, sin modo watch |
| `npm test -- src/features/corpus src/app/App.test.tsx` | Pruebas enfocadas de schemas, cliente, corpus y shell |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm run build` | Typecheck y build Vite en `dist/` |
| `npm run preview` | Inspección local del build; no producción |

## Ranking view

Use the Corpus and Ranking tabs (arrow keys, Home/End, or native button activation) to switch views. The corpus reader keeps its selection. Ranking runs only when **Run ranking** is pressed and POSTs `{}` to `/api/ranking` through the shared Axios client. A strict Zod boundary validates the corpus, preprocessing, parameters and three ordered results before rendering.

Each method has a top-15 table (or all available terms when fewer than 15 exist), preserving Java's term order, ties and frequencies exactly. Run details identify the corpus version, fixed 20-abstract scope, sizes, Radix base and Bucket parameters. Durations are Java single-run sorting times in **ms**, not benchmarks, HTTP latency or browser render times. Tables use the existing Cojeev visual language without adding chart dependencies.

Loading prevents duplicate submissions. Failures clear prior results and show fixed, sanitized messages for invalid requests, unavailable service, server/network errors or incompatible responses. Leaving Ranking aborts its pending request and discards its result; cancellation does not guarantee stopping Java work. Tests use synthetic fixtures and mocked HTTP only; browser layout and real backend acceptance are separate checks.

## Componentes del lector

El lector usa los componentes NativeSelect, Card, Badge y Alert de [Cojeev UI](https://cojeev.com/ui/docs/), ubicados en `src/shared/{ui,lib}/`; el tema y las fuentes locales DM Sans y Bricolage Grotesque son globales. La selección es un `select` nativo con veinte opciones en orden del catálogo, y un error o cambio de selección nunca presenta el resultado anterior como vigente. Las licencias de Cojeev (MIT) y de las fuentes (OFL) se sirven desde el pie de página.

## Desarrollo local

Después de instalar:

```sh
docker run --rm -it --user "$(id -u):$(id -g)" --env HOME=/tmp \
  -p 127.0.0.1:5173:5173 \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  npm run dev -- --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`. Sin configuración, el cliente consulta `/api/papers` y `/api/papers/{id}` en el mismo origen. Si no existe backend allí, muestra un error: no usa fixtures ni datos de respaldo.

Para un backend en otro origen, pasar `--env VITE_API_BASE_URL=http://127.0.0.1:8081` al contenedor de desarrollo. Esta variable opcional contiene solo la URL pública base del backend, sin el sufijo `/api`; el cliente añade ese sufijo. Nunca colocar claves en `VITE_*`: sus valores se incorporan al JavaScript servido. El backend debe permitir explícitamente el origen frontend mediante su configuración CORS. No se añade proxy ni servicio intermedio.

## Imagen de producción local

```sh
docker build --file Dockerfile.vercel --tag neguentropia-frontend:local \
  --build-arg VITE_API_BASE_URL=http://127.0.0.1:8081 .
docker run --rm -p 127.0.0.1:4174:80 neguentropia-frontend:local
```

Abrir `http://127.0.0.1:4174`; configurar en el backend el origen permitido exacto `http://127.0.0.1:4174`. Omitir el ARG conserva las peticiones relativas `/api`. La URL se fija al compilar: cambiar una variable del contenedor Nginx no reconfigura el bundle. La imagen multietapa usa Node para compilar y Nginx para servir solamente el resultado estático. Las bases están fijadas por digest. No copia `node_modules`, fuentes de desarrollo, notas o secretos a la imagen final.

`PORT` configura el puerto interno de Nginx al arrancar; su valor predeterminado es `80`. La publicación de puertos debe coincidir:

```sh
docker run --rm --env PORT=8080 -p 127.0.0.1:4174:8080 neguentropia-frontend:local
```

Nginx sustituye solo `PORT` en su plantilla; conserva `$uri` para resolver archivos. Las rutas profundas devuelven la SPA; los assets inexistentes responden 404, no el HTML de la aplicación. Los bundles con hash tienen caché immutable y el documento HTML usa no-cache. Un puerto inválido hace fallar la configuración Nginx; no hay fallback a otro servidor.

## Comprobar el servidor real

En una terminal, iniciar la imagen local. En otra, comprobar raíz, MIME/contenido de assets, icono, fallback SPA y 404:

```sh
docker run --rm --network=host \
  --env FRONTEND_ORIGIN=http://127.0.0.1:4174 \
  --mount "type=bind,src=$PWD/scripts/check-container.mjs,dst=/checks/check-container.mjs,readonly" \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  node --test /checks/check-container.mjs
```

`--network=host` corresponde a Docker Engine en Linux; en otros entornos, seleccionar una red/ruta que llegue al servidor. También se puede usar `--network=container:<nombre>` para compartir la red de un contenedor de prueba y establecer `FRONTEND_ORIGIN=http://127.0.0.1:80` (o el `PORT` alternativo). La comprobación no hace solicitudes de análisis ni necesita corpus. No sustituye la revisión funcional en navegador.

## Estructura

- `src/app/`: composición del shell accesible y su prueba.
- `src/features/corpus/`: catálogo, lectura del original, schemas y pruebas sintéticas.
- `src/features/ranking/`: explicit ranking action, validated HTTP boundary, three tables and synthetic tests.
- `src/shared/`: componentes UI compartidos por corpus y ranking y sus utilidades de soporte.
- `src/infrastructure/api/`: instancia Axios y URL pública de backend.
- `src/main.tsx`: arranque React.
- `src/styles.css`: estilos y Tailwind 4.
- `src/test/`: preparación del runner.
- `nginx/`: plantilla de servidor estático.
- `scripts/check-container.mjs`: comprobación HTTP de la imagen ya iniciada.

El catálogo solo se muestra si contiene exactamente 20 IDs únicos, seis métodos soportados únicos y disponibilidades coherentes. El detalle debe coincidir en ID y versión del corpus; el texto original se conserva y renderiza como texto, nunca HTML. Cambiar o borrar la selección descarta el detalle anterior y aborta su petición; respuestas obsoletas no actualizan la pantalla. Los errores se muestran sin detalles privados ni datos anteriores como éxito vigente. Las capacidades son informativas, incluso cuando el backend declara alguna disponible.

Las pruebas usan exclusivamente 20 registros sintéticos nuevos por caso y red simulada; no contienen abstracts reales. Cubren invariantes, errores, carga, selección, respuestas fuera de orden y regresiones del shell (marca, landmark principal y navegación explícita). El health y la preparación son responsabilidad del backend: esta pantalla no inventa su estado desde liveness.

No se crean features vacías, librerías de gráficas sin uso ni un framework genérico. Similitud, agrupamiento y búsqueda aún no están implementados.

## Alojamiento

`Dockerfile.vercel` es la ruta Docker adoptada para Vercel Container Runtime Beta, reutilizada localmente. El puerto configurado en el proveedor debe coincidir con Nginx. No hay despliegue ni CI configurados.
