# Componentes y fuentes de terceros

## Cojeev UI

El lector incorpora código auténtico de [Cojeev UI](https://github.com/luv-jeri/cojeev-ui) mediante su [registro oficial](https://cojeev.com/ui/r/{name}.json), adquirido con shadcn **4.21.5** e inspeccionado antes de la promoción selectiva. Las URLs del registro son mutables; [PROVENANCE.json](licenses/cojeev/PROVENANCE.json) conserva hashes de las fuentes adquiridas y adaptadas, sin atribuir un commit upstream no comprobado.

- Componentes renderizados: `NativeSelect`/`NativeSelectOption`, `Card`/Header/Title/Description/Content/Footer, `Badge`, `Alert`/Body/Title/Description.
- Código: `src/features/corpus/ui/`; soporte real en `src/features/corpus/lib/`.
- Tema, tokens y estilos: `src/styles/cojeev/`; fuentes locales: `src/styles/fonts/` y `src/styles/cojeev-fonts.css`.
- Licencia MIT, copyright 2026 Sanjay Kumar: [LICENCE](licenses/cojeev/LICENCE).
- Avisos completos conservados: [NOTICES.txt](licenses/cojeev/NOTICES.txt). Ese aviso upstream también describe helpers de bloom e iconos que **no** se incorporaron; conservar el aviso no afirma su uso.

### Selección y adaptaciones locales

No se copia la fundación completa. Se conservan cuatro componentes y su cierre transitivo real: `utils`, apariencia de controles, contornos y el runtime morph/depth con settings, geometría, refs, reloj, pintura, coreografía y preferencia de movimiento reducido. No se incorporan tablas de iconos, charts, shaders, 3D, servicios ni la aplicación documental upstream.

- Se eliminan las acciones opcionales no usadas `CardAction` y `AlertClose`, junto a sus imports. No se instalan Button, Presence, Spinner, Radix ni `tw-animate-css` para acciones que esta pantalla no ofrece. Los hooks necesarios no se reemplazan con stubs.
- El registro emitió soporte en `src/lib/` a pesar de la configuración de alias. Se reubican los imports reales en `@/features/corpus/lib/`; `@/` resuelve a `src/` en Vite, TypeScript y Vitest.
- Se conservan `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` y los controles noUnused. La geometría declara tuplas reales de dos/cinco coordenadas, los pares de atributos son constantes y se anotan accesos acotados por bucles/arrays internos. Un nombre de forma desconocido se rechaza explícitamente antes de usar SVG. No se usan `any`, stubs de declaraciones ni un proyecto de tipos con flags reducidos.
- Se eliminan reglas de ejemplos documentales, mappings Tailwind ajenos y tokens sin referencias, conservando valores originales de ambos modos y tiempos de flujo que el runtime calcula dinámicamente.
- El lector elige `data-motion="off"`, sin animación decorativa ni retención visual de resultados obsoletos. Los estilos base conservan foco y reduced motion. El título de la tarjeta usa el nivel semántico h3 y el tamaño title de Cojeev; el texto original se limita a 72ch. Los tokens de cuerpo/control se ajustan a 16px y helper a 14px para lectura y controles móviles.

Las referencias de shadcn consultadas son documentación auxiliar, no la API de Cojeev ni componentes sustitutos. Incorporar una actualización exige volver a inspeccionar soporte, aliases, licencias, flags estrictos y el cierre realmente usado; `components.json` por sí solo no garantiza que los targets explícitos del registro queden dentro de la feature. No ejecutar una actualización con overwrite sobre la app.

## Fuentes locales

Ambas caras están bajo **SIL Open Font License 1.1**, separada de MIT:

| Cara | Archivo | SHA-256 de WOFF2 |
| --- | --- | --- |
| DM Sans | `src/styles/fonts/dm-sans-variable.woff2` | `511199053bc63da8002f95cebf6d8254c0838d7c3515db9a6d92a579ac81eef8` |
| Bricolage Grotesque | `src/styles/fonts/bricolage-grotesque-variable.woff2` | `732d894c80980fc12f0c5dd955f5e917a6ffefb666553a7cee25a00b058b6368` |

Se conservan [DM Sans OFL](src/styles/fonts/DMSans-OFL.txt), [Bricolage Grotesque OFL](src/styles/fonts/BricolageGrotesque-OFL.txt) y [FONT-NOTICES.md](licenses/cojeev/FONT-NOTICES.md). El footer importa las tres licencias como assets y enlaza a ellas para conservar los textos legales también junto al build distribuible.

`src/scripts/cojeev-materialize-fonts.mjs` es el helper upstream inspeccionado, sin cambios: extrae exclusivamente los bytes embebidos verificados y reemplaza sus dos URLs por rutas relativas. Se ejecutó explícitamente en Docker sin red; no hay scripts de descarga de fuentes ni solicitudes externas de fuentes en runtime. No es un script npm automático. Un cambio futuro del registro puede restaurar fuentes embebidas: volver a inspeccionar antes de materializar.

## Paquetes añadidos

Versiones exactas tomadas del lockfile de adquisición, sin cambiar versiones preexistentes:

| Paquete | Versión | Licencia declarada |
| --- | --- | --- |
| class-variance-authority | 0.7.1 | Apache-2.0 |
| clsx | 2.1.1 | MIT |
| motion | 14.3.0 | MIT |
| tailwind-merge | 3.7.0 | MIT |

El lockfile conserva las dependencias transitivas reales y sus integridades. Las licencias de paquetes permanecen en sus distribuciones npm; este documento no reemplaza sus términos. Las pruebas de render usan los componentes y hooks reales; solo se simula `matchMedia` en jsdom, que no implementa media queries. Eso no es evidencia de navegador ni una auditoría completa de accesibilidad.
