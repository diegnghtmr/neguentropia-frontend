# Neguentropía — frontend

Base local de una SPA React 19, Vite 8, TypeScript estricto y Tailwind CSS 4. La pantalla inicial informa que la preparación del corpus está pendiente; no carga artículos, llama al backend ni presenta resultados de algoritmos. Axios y Zod quedan disponibles para la posterior integración HTTP explícita.

## Requisitos y alcance

- Docker operativo. Node, npm, instalación, pruebas, compilación y aplicación se ejecutan dentro de contenedores; no instalar Node en el anfitrión.
- Node 24 y npm 11. El lockfile fija el árbol instalado; usar `npm ci`.
- No se incluyen corpus, modelos, credenciales, resultados ni instrucciones privadas en esta entrega.
- Los algoritmos se implementan en Java. Esta base no acredita integración HTTP, CORS, corpus verificado, inferencia ni despliegue.

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
| `npm test -- src/app/App.test.tsx` | Prueba enfocada del shell |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm run build` | Typecheck y build Vite en `dist/` |
| `npm run preview` | Inspección local del build; no producción |

## Desarrollo local

Después de instalar:

```sh
docker run --rm -it --user "$(id -u):$(id -g)" --env HOME=/tmp \
  -p 127.0.0.1:5173:5173 \
  --mount "type=bind,src=$PWD,dst=/app" --workdir /app \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  npm run dev -- --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`. Esta unidad no necesita URL de API, proxy ni configuración CORS. No colocar claves en variables `VITE_*`: se incorporan al JavaScript servido al navegador. La conexión al backend se configurará y comprobará en una unidad posterior.

## Imagen de producción local

```sh
docker build --file Dockerfile.vercel --tag neguentropia-frontend:local .
docker run --rm -p 127.0.0.1:4173:80 neguentropia-frontend:local
```

Abrir `http://127.0.0.1:4173`. La imagen multietapa usa Node para compilar y Nginx para servir solamente el resultado estático. Las bases están fijadas por digest. No copia `node_modules`, fuentes de desarrollo, notas o secretos a la imagen final.

`PORT` configura el puerto interno de Nginx al arrancar; su valor predeterminado es `80`. La publicación de puertos debe coincidir:

```sh
docker run --rm --env PORT=8080 -p 127.0.0.1:4173:8080 neguentropia-frontend:local
```

Nginx sustituye solo `PORT` en su plantilla; conserva `$uri` para resolver archivos. Las rutas profundas devuelven la SPA; los assets inexistentes responden 404, no el HTML de la aplicación. Los bundles con hash tienen caché immutable y el documento HTML usa no-cache. Un puerto inválido hace fallar la configuración Nginx; no hay fallback a otro servidor.

## Comprobar el servidor real

En una terminal, iniciar la imagen local. En otra, comprobar raíz, MIME/contenido de assets, icono, fallback SPA y 404:

```sh
docker run --rm --network=host \
  --env FRONTEND_ORIGIN=http://127.0.0.1:4173 \
  --mount "type=bind,src=$PWD/scripts/check-container.mjs,dst=/checks/check-container.mjs,readonly" \
  node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 \
  node --test /checks/check-container.mjs
```

`--network=host` corresponde a Docker Engine en Linux; en otros entornos, seleccionar una red/ruta que llegue al servidor. También se puede usar `--network=container:<nombre>` para compartir la red de un contenedor de prueba y establecer `FRONTEND_ORIGIN=http://127.0.0.1:80` (o el `PORT` alternativo). La comprobación no hace solicitudes de análisis ni necesita corpus. No sustituye la revisión funcional en navegador.

## Estructura y siguientes unidades

- `src/app/`: composición del shell y su prueba.
- `src/main.tsx`: arranque React.
- `src/styles.css`: estilos y Tailwind 4.
- `src/test/`: preparación del runner.
- `nginx/`: plantilla de servidor estático.
- `scripts/check-container.mjs`: comprobación HTTP de la imagen ya iniciada.

No se crean features vacías, librerías de gráficas sin uso ni un framework genérico. Los módulos de corpus, ranking, similitud, agrupamiento y búsqueda llegarán en unidades posteriores, con validación del contrato y pruebas.

## Alojamiento pendiente

`Dockerfile.vercel` es la ruta Docker adoptada para Vercel Container Runtime Beta, reutilizada localmente. El puerto configurado en el proveedor debe coincidir con Nginx. Acceso Beta, cuenta, plan, costos, límites, rutas/SPA y ejecución alojada requieren comprobación y autorización separadas. Este README no acredita despliegue ni configura CD, remotos o CI propio.
