# Auditoría de Circle frente a Triangle

Fecha: 2026-08-08

## Alcance y fuentes

- Circle local: `5302333` (`project overview: document outline rail with hover navigation panel`).
- Triangle local: `d417ea8` (`feat(markdown): add syntax highlighting to code blocks`).
- Interfaz publicada revisada: [Circle, vista All issues del equipo Core](https://circle.lndev.me/lndev-ui/team/CORE/all).
- Otras vistas publicadas revisadas: [Projects](https://circle.lndev.me/lndev-ui/projects), [My issues](https://circle.lndev.me/lndev-ui/my-issues), [Views](https://circle.lndev.me/lndev-ui/views) y un [project overview](https://circle.lndev.me/lndev-ui/project/1/overview).
- Fuentes de implementación principales: [Circle issues](/home/vrivera/git-packages/circle/components/common/issues/all-issues.tsx), [Triangle Convex schema](../../convex/schema.ts), [Triangle viewer preferences](../../convex/viewer.ts) y [Triangle issues workspace](../../components/common/issues/issues-workspace.tsx).

Circle es una fuente de patrones de interfaz, no una fuente de datos para Triangle. Su `package.json` no contiene Convex y la implementación de issues, proyectos, usuarios, ciclos, vistas y demás superficies importa `mock-data/*` y stores de Zustand. Las nuevas páginas pueden verse completas, pero no traen la persistencia, invariantes ni consultas que ya existen en Triangle.

## Resumen ejecutivo

Lo que vale la pena traer primero:

1. Command palette global con contexto del issue actual.
2. Una superficie personal de trabajo —`My issues` adaptado a “Assigned / Activity”—.
3. Display más completo: agrupación, orden, propiedades visibles y scopes Active / Backlog / All.
4. Vistas guardadas, persistidas en Convex y reutilizables tanto en `/issues` como en la pestaña de issues de cada proyecto.
5. Personalización real de la sidebar.
6. Project overview más rico: outline de Markdown, rail de progreso y breakdown de issues.

Triangle ya supera a Circle en la parte que no se ve a primera vista: datos live en Convex, usuario único coherente con el producto, subissues, relaciones de bloqueo con reglas de ciclo, actividad, comentarios, automatizaciones, áreas de proyecto, updates persistentes, Markdown y PWA. No conviene sustituir esa base por los stores de Circle.

## Inventario de capacidades del fork

| Capacidad de Circle                                   | Evidencia                                                                                             | Encaje en Triangle                                                                          | Decisión                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Issues Active / Backlog / All, filtros y Display      | `app/[orgId]/team/[teamId]/active`, `backlog`, `all`; `components/layout/headers/display-options.tsx` | Alto. Triangle ya tiene list / board / graph y filtros, pero falta organizar mejor la vista | Integrar en el workspace compartido                       |
| Command palette                                       | Commit `c60371c`, `components/layout/command-palette.tsx`                                             | Muy alto. Encaja con los atajos y selectores existentes                                     | Prioridad P0                                              |
| My issues: Assigned, Created, Subscribed, Activity    | Commits `02bd178`, `09f0a0f`, `650575d`; `components/common/my-issues`                                | Alto, pero el esquema actual no tiene `creatorId` ni suscripciones                          | Empezar por Assigned / Activity; modelar lo demás después |
| Saved views                                           | Commit `8f55d27`, `components/common/views`                                                           | Alto para un tracker personal con muchos proyectos                                          | Persistir una nueva entidad `savedViews` en Convex        |
| Insights / breakdown panel                            | `components/common/issues/insights-panel.tsx`, `components/common/my-issues/breakdown-panel.tsx`      | Alto. Triangle ya tiene issue counts y project areas que pueden alimentar el panel          | Integrar como panel lateral opcional                      |
| Personalización de sidebar                            | Commits `14bd1cd`, `a15fe9f`; `customize-sidebar-dialog.tsx` y `sidebar-prefs-store.ts`               | Alto. Triangle ya persiste proyectos fijados y estado abierto                               | Añadir orden, visibilidad y secciones plegables           |
| Project overview con outline                          | Commit `5302333`; `document-outline.tsx`                                                              | Medio-alto. Triangle ya guarda `project.description` y acaba de mejorar Markdown            | Añadir anchors y outline derivado de headings             |
| Project progress / breakdown                          | `project-overview.tsx`, `project-side-panel.tsx`                                                      | Medio. Requiere decidir cómo calcular progreso y, para fechas, ampliar esquema              | Integrar counts y salud primero; fechas/timeline después  |
| Temas Pure Light / Magic Blue / Classic Dark / Custom | Commit `266fdfc`; `theme-store.ts`, `theme-applier.tsx`                                               | Medio. Es una mejora visual, pero no el cuello de botella de uso                            | Traer variantes nombradas; posponer editor Custom         |
| Reviews / diff / guide                                | Commit `63f1b00`, `components/common/reviews`                                                         | Bajo para un producto personal sin integración de código                                    | No integrar ahora                                         |
| Cycles / burnup / capacity                            | `components/common/cycles` y `mock-data/cycles.ts`                                                    | Bajo-medio. Puede ser útil, pero exige un modelo nuevo y Circle solo simula los datos       | Dejar detrás de target dates / timeline                   |
| Initiatives                                           | Commit `683ff89`, `components/common/initiatives`                                                     | Bajo y contrario al enfoque personal actual                                                 | No reintroducir como abstracción                          |
| Teams / members / profiles                            | `app/[orgId]/team`, `members`, `profiles`                                                             | Bajo; son multi-usuario y no corresponden al modelo actual                                  | No integrar                                               |
| Inbox / notifications / Agent                         | `components/common/inbox`, `agent`, stores asociados                                                  | Bajo-medio; podrían servir más adelante como actividad personal o asistente                 | No portar la superficie todavía                           |
| Settings / integrations / AI / templates              | `app/[orgId]/settings`                                                                                | Mayormente placeholders visuales y dependientes de multi-equipo                             | No priorizar                                              |

## Qué hace mejor visualmente

La interfaz publicada de Circle muestra una jerarquía muy clara: navegación personal, navegación de workspace, equipos y navegación interna del equipo. En la vista de issues además combina scopes explícitos —Active, Backlog y All issues— con Filter y Display. Eso hace que el usuario entienda rápidamente tanto el alcance como la configuración de la vista.

Triangle comparte los mismos primitives visuales y no necesita un rediseño completo, pero hoy queda por detrás en estos puntos:

- La sidebar de Triangle muestra Workspace y proyectos, pero no permite ordenar, ocultar o plegar sus secciones. Circle convierte esa personalización en una interacción de primer nivel y mantiene la navegación más limpia.
- El header de Triangle muestra título, contador, búsqueda, Filter, Display y Create issue, pero no tiene scopes Active / Backlog / All. Circle usa esos scopes para quitar carga cognitiva de los filtros.
- El Display de Circle ofrece agrupación, orden, visibilidad de campos, subissues y estados completados en un único popover compacto. Triangle tiene modos list / board / graph, jerarquía y propiedades visibles, pero no expone todavía la misma gramática de agrupación y orden.
- Circle usa paneles laterales para insights y breakdown sin sacar al usuario de la lista. Triangle ya tiene la arquitectura de paneles redimensionables en el workspace de issues, pero puede usarla para métricas y breakdown con más intención.
- El project overview de Circle tiene una columna de documento legible, propiedades agrupadas, links y un panel de progreso. Triangle tiene edición inline, latest update y áreas, pero la pantalla se siente más ancha y más vacía. Un rail de outline y un resumen lateral de estado/progreso cerrarían buena parte de esa diferencia sin copiar el modelo de equipos.
- Circle ofrece variantes de tema además del simple light/dark/system. Triangle tiene una base de tokens especialmente apta para esto en `src/styles/globals.css`, así que añadir dos o tres presets sería una mejora de identidad de bajo riesgo.

La conclusión visual es incremental: conservar el lenguaje de Triangle, pero hacerlo más denso, configurable y orientado a contexto. No recomiendo copiar el branding, el pie promocional ni la navegación de organizaciones/equipos de Circle.

## Backlog recomendado

### P0 — productividad diaria

#### 1. Command palette global

Portar el patrón de `c60371c` a `MainLayout` / root de Triangle, usando los hooks de Convex existentes.

- `Cmd/Ctrl+K` para abrir.
- Acciones globales: crear issue, ir a Issues / Projects / Settings, buscar issue o proyecto.
- Contexto del issue abierto: cambiar status, priority, labels, project, copiar ID / URL / Markdown / branch name.
- No incluir ciclos, equipos ni releases hasta que existan en el dominio.
- Usar los IDs y opciones que devuelven Convex; no copiar los arrays de `mock-data`.

#### 2. Scopes de issues + Display consistente

Añadir a `/issues` scopes `Active`, `Backlog` y `All`, idealmente como search params para que sean enlazables. Ampliar el display persistido en `viewerPreferences` con:

- agrupación por status, priority, project o assignee;
- orden por priority, created o title;
- completed issues / empty groups;
- propiedades visibles y subissues.

La implementación debe vivir en `IssuesWorkspace` y sus serializers para que el mismo comportamiento funcione en `/projects/$projectSlug?tab=issues`.

### P1 — organización personal

#### 3. My work

Crear una vista personal reutilizando el mismo workspace de issues, con tabs `Assigned` y `Activity`. `Created` necesita añadir `creatorId` al issue; `Subscribed` necesita una tabla de suscripciones, por lo que no conviene fingir esas pestañas todavía.

El breakdown lateral puede mostrar estado, prioridad, proyecto, label y área, todos datos que Triangle ya conoce.

#### 4. Saved views

Portar el concepto de `8f55d27`, no sus mocks. Modelo mínimo sugerido:

- nombre, icono opcional y scope global / proyecto;
- filtros de status, assignee, priority, labels, project y area;
- configuración de view, grouping, ordering y display properties;
- timestamps y orden explícito.

La vista guardada debería poder abrirse desde la sidebar y tener una URL estable.

#### 5. Sidebar configurable

Reutilizar `pinnedProjectIds` que ya existe en `viewerPreferences` y añadir preferencias para:

- orden de entradas;
- visibilidad de Issues, Projects, Pulse, Settings y Saved views;
- secciones plegables;
- badges opcionales.

Mantener una taxonomía personal: `Personal`, `Workspace`, `Projects`, `Saved views`, no `Teams` ni `Members`.

### P1/P2 — calidad visual de proyectos

#### 6. Project overview con contexto

- Convertir la descripción Markdown en bloques con headings y anchors.
- Añadir un outline rail flotante, siguiendo `document-outline.tsx`.
- Añadir un panel lateral con conteo por status, issues abiertos/cerrados, áreas y último update.
- Mantener la edición inline actual.
- Dejar target dates y timeline para una iteración de dominio separada; el esquema actual aún no guarda fechas de proyecto.

#### 7. Presets de tema

Traer primero `Pure Light` y `Classic Dark` como presets estáticos sobre los tokens actuales. El editor de colores custom y compartir temas puede esperar hasta que haya una necesidad real.

## Estrategia de integración

Portaría por slices pequeños, no haciendo un merge de Circle:

1. Presentación y UX desde Circle.
2. Serializadores y queries de Triangle.
3. Mutaciones Convex, cuando la interacción sea persistente.
4. Verificación de `/issues` y de la pestaña de issues de cada proyecto.

La primera tanda con mejor relación valor/riesgo es `Command palette` + `Active/Backlog/All` + Display agrupable. La segunda es `My work` + breakdown + sidebar configurable. Saved views y project outline son la siguiente capa.

## Observación de verificación

La navegación publicada fue consultada directamente y sus páginas SSR permitieron revisar la estructura, textos, agrupaciones y controles. La captura automatizada del preview no respondió de forma estable para la página remota; las observaciones visuales se contrastaron con los componentes y estilos del fork local.
