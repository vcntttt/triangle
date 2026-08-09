# Backlog recomendado de la auditoría de Circle

Fecha: 2026-08-08

## Objetivo

Incorporar las siete iniciativas del backlog recomendado de la auditoría de Circle,
conservando Triangle como un tracker personal respaldado por Convex. Circle aporta
patrones de interacción y densidad visual; no aporta datos, stores ni abstracciones
de equipos, miembros, ciclos o releases.

## Alcance

Se implementarán:

1. Command palette global con contexto del issue actual.
2. Scopes `Active`, `Backlog` y `All`, más Display agrupable y ordenable.
3. `My work` con las pestañas `Assigned` y `Activity`.
4. Vistas guardadas globales y por proyecto.
5. Sidebar configurable.
6. Project overview con outline, anchors y breakdown lateral.
7. Presets de tema `Pure Light` y `Classic Dark`.

Quedan fuera target dates/timeline, ciclos, releases, suscripciones, editor custom
de temas, compartir temas, equipos, miembros, iniciativas, reviews y cualquier
superficie multiusuario.

## Principios de integración

- Convex es la única fuente de verdad para issues, proyectos, preferencias y vistas.
- `IssuesWorkspace` y sus serializers son la superficie compartida por `/issues`,
  `My work` y `?tab=issues` de cada proyecto.
- Las preferencias nuevas deben ser compatibles con documentos existentes: el
  esquema acepta campos opcionales donde corresponda y los serializers aplican
  defaults completos.
- La presentación puede inspirarse en Circle, pero debe conservar tokens, primitives
  y navegación personal de Triangle.
- Las acciones persistentes reutilizan mutaciones existentes cuando cubren el caso;
  las nuevas mutaciones deben validar IDs y relaciones dentro de Convex.

## Modelo de datos

### Preferencias del viewer

`viewerPreferences.issueView` conserva la vista actual y añade:

- `groupBy`: `status`, `priority`, `project`, `assignee` o `none`.
- `orderBy`: `priority`, `created` o `title`.
- `orderDirection`: `ascending` o `descending`.
- `showSubissues`.
- `showEmptyGroups`.

Las propiedades visibles existentes se conservan. `hideCompletedIssues` continúa
siendo independiente del scope para permitir mostrar `All` sin completados.

`viewerPreferences.sidebar` añade:

- orden de entradas personales y de workspace;
- entradas ocultas;
- secciones plegadas;
- configuración de badges.

`pinnedProjectIds` se mantiene como una lista ordenada. Los proyectos no presentes
en esa lista se agregan al final con orden estable, sin perderse cuando cambie la
preferencia.

### Vistas guardadas

Se añade `savedViews` con:

- `name` e `icon` opcional;
- `target`: `global` o `project`;
- `projectId` opcional, obligatorio para target `project`;
- filtros de status, assignee, priority, labels, project y area;
- scope de issues (`active`, `backlog` o `all`);
- tipo de vista, agrupación, orden y propiedades visibles;
- `position`, `createdAt` y `updatedAt`.

Las vistas se identifican en URL por su ID: `/issues?view=<savedViewId>` para las
globales y `/projects/$projectSlug?tab=issues&view=<savedViewId>` para las de
proyecto. Al renombrarlas no cambia la URL.

### Actividad personal

`issueActivity` recibe un índice global por `createdAt`. La query de `My work` usa
`assigneeId === "me"` para `Assigned` y la actividad más reciente de cada issue
para `Activity`. Si un issue no tiene evento persistido, se considera activa su
fecha de creación. No se modelan actores alternativos porque Triangle es
singleplayer.

## Rutas y estado

- `/issues?scope=active|backlog|all` es enlazable y conserva el proyecto opcional
  actual.
- `/my-work?tab=assigned|activity` reutiliza el workspace con una fuente de datos
  personal.
- La pestaña de issues de proyecto admite los mismos parámetros `scope` y `view`.
- La selección del issue se mantiene con los parámetros existentes (`issue` en
  proyecto y `$issueIdentifier` en la vista global).
- El scope por defecto es `active`; el display se lee de las preferencias del
  viewer salvo que una vista guardada lo sobrescriba.

La semántica inicial de scopes es:

- `Active`: estados de tipo `started`.
- `Backlog`: estados de tipo `unstarted`.
- `All`: todos los issues no archivados, incluidos completados.

## Módulos y comportamiento

### Command palette

Un provider global se monta junto al root de la aplicación y se abre con
`Cmd/Ctrl+K`. El modo inicial ofrece:

- crear issue;
- navegar a Issues, My work, Projects y Settings;
- buscar issues y proyectos usando consultas Convex y resultados limitados.

Cuando la ruta actual contiene un issue, se agrega un grupo contextual con:

- cambio de status, prioridad, labels y proyecto;
- copiar ID, URL, Markdown y branch name;
- abrir el issue en su superficie canónica.

El branch name se deriva como `<identifier>-<slug-del-título>`. Las acciones
reutilizan las mutaciones y selectores existentes, muestran errores mediante toast
y cierran la palette solo después de una operación exitosa.

### Issues workspace y Display

Se introduce un modelo de display serializado que transforma issues en grupos
genéricos con etiqueta, color, icono y orden. Los grupos pueden ser por status,
priority, project o assignee. `none` conserva una lista única.

El orden soporta prioridad, fecha de creación y título, con dirección explícita y
desempate estable por rank/identifier. La jerarquía de subissues se conserva en
list y se puede ocultar desde Display. El board mantiene columnas por status para
preservar el significado del drag-and-drop; la agrupación avanzada se aplica a
list y graph.

El header de issues muestra los scopes como navegación de primer nivel. El mismo
Display y los mismos serializers se renderizan en `/issues` y en la pestaña de
issues de proyecto.

### My work

`My work` es una ruta fina sobre `IssuesWorkspace`:

- `Assigned` filtra el assignee del viewer.
- `Activity` ordena por última actividad y conserva los mismos filtros/display.

El panel lateral opcional muestra breakdown por status, prioridad, proyecto, label y
área usando los datos ya serializados. No se añaden las pestañas `Created` ni
`Subscribed` porque requieren campos de dominio que el audit decidió posponer.

### Saved views

La sidebar lista vistas guardadas según su ámbito y posición. Crear o editar una
vista captura el estado actual de filtros y display; aplicar una vista no modifica
las preferencias globales. La vista activa puede guardarse como nueva o actualizar
la existente. Eliminar y reordenar son mutaciones Convex con feedback optimista
acotado y recuperación ante error.

### Sidebar configurable

La sidebar adopta las secciones personales `Personal`, `Workspace`, `Projects` y
`Saved views`. El diálogo de personalización permite ocultar y ordenar Issues,
Projects, Pulse, Settings y vistas guardadas, plegar secciones y activar badges.
La preferencia `sidebarOpen` existente sigue controlando el estado global de
colapsado/expandido.

### Project overview

La descripción Markdown se analiza con un helper compartido que extrae headings y
genera IDs deterministas, deduplicados y seguros para URL. `MarkdownContent`
renderiza esos anchors y un rail sticky permite saltar a cada sección.

El panel de contexto del proyecto calcula desde los issues ya cargados:

- total y conteo por status;
- abiertos frente a cerrados;
- distribución por área;
- health, attention y último update.

La edición inline actual se conserva. No se introducen fechas ni timeline en este
slice.

### Presets de tema

Se mantienen `light`, `dark` y `system`, y se agregan `Pure Light` y `Classic Dark`
como presets estáticos de `next-themes` sobre variables CSS existentes. No se
introduce un editor de colores ni sincronización adicional de temas.

## Errores y compatibilidad

- Queries que no encuentran una vista guardada muestran estado de no encontrado y
  vuelven a `/issues` sin dejar una pantalla inválida.
- Una vista de proyecto abierta fuera de su proyecto se rechaza con un mensaje claro
  y no cambia el filtro actual.
- Defaults de preferencias cubren usuarios y documentos creados antes de este
  cambio.
- Errores de mutaciones conservan el estado anterior del control y muestran toast.
- Las acciones de clipboard degradan a un mensaje de error cuando el navegador no
  permite acceso al portapapeles.

## Verificación

La implementación se valida con:

- `bun run build`;
- `bun run lint`;
- `bunx react-doctor@latest`;
- revisión manual de `/issues`, `/my-work`, una vista global, una vista de proyecto,
  `/projects/$projectSlug?tab=issues` y el overview con headings.

También se comprobará que crear, editar y eliminar datos desde una vista de proyecto
no diverge del workspace global y que documentos existentes de preferencias siguen
cargando correctamente.
