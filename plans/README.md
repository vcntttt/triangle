# Implementation Plans

Generados por el skill `improve` el 2026-08-22, contra el commit `0bd654e`. Ejecutar en el orden de la tabla salvo que las dependencias indiquen otra cosa. Cada executor: leer el plan completo antes de empezar, respetar sus STOP conditions y actualizar su fila al terminar. La ejecución será realizada por el propio agente de esta sesión (Vicente lo solicitó), plan por plan.

Verificación global del repo: `bun run build && bun run lint` (no hay tests ni script typecheck; `bunx react-doctor@latest` para cambios de UI).

## Execution order & status

| Plan | Título                                                                | Prioridad | Esfuerzo | Depende de       | Estado                                                                                |
| ---- | --------------------------------------------------------------------- | --------- | -------- | ---------------- | ------------------------------------------------------------------------------------- |
| 001  | Importar `defaultIssueStatuses` en `convex/issues.ts`                 | P1        | S        | —                | DONE (`00ce6df` en advisor/plans-p1)                                                  |
| 002  | Eliminar botón "Description" roto (crash en overview)                 | P1        | S        | —                | DONE (`9d1a3aa` en advisor/plans-p1)                                                  |
| 003  | Preservar `scope`/`view` al seleccionar issue (ambas superficies)     | P1        | S        | —                | DONE (`fee714a`, incluye 4ª navegación adyacente)                                     |
| 004  | Guard para índice −1 en `navigateToAdjacentIssue`                     | P1        | S        | —                | DONE (`c755bf0`)                                                                      |
| 005  | Unicidad de nombre en rename de labels                                | P2        | S        | —                | DONE (`99393a7`)                                                                      |
| 006  | Ignorar headings dentro de code fences en el outline                  | P2        | S        | —                | DONE (`574431c`)                                                                      |
| 007  | Tipo correcto de `estimatedHours` en execution-path (MCP)             | P2        | S        | —                | DONE (`c7ede85`)                                                                      |
| 008  | `event.waitUntil` en escrituras de caché del service worker           | P2        | S        | —                | DONE (`15334d3`)                                                                      |
| 009  | Respetar orderBy/orderDirection en vista de lista                     | P2        | S/M      | —                | DONE (`1f6ab80`)                                                                      |
| 010  | Semántica de bloqueo por `status.type` + validación en create         | P2        | S/M      | 001, 012 (orden) | DONE (`93174e2`; estados son globales, sin query por proyecto)                        |
| 011  | Tolerar ids malformados en URLs de issues                             | P2        | S        | —                | DONE (`98adcaa`; loader try/catch omitido según plan)                                 |
| 012  | Cascada completa al borrar proyecto con issues                        | P2        | M        | después de 001   | DONE (`888407a`)                                                                      |
| 013  | Consistencia de filtros entre superficies (My Work / Save view)       | P2        | S        | —                | DONE (`1961625`)                                                                      |
| 014  | Anidamiento recursivo de jerarquía (nietos, colapso, contadores)      | P3        | M        | 009              | DONE (`a756fea`)                                                                      |
| 015  | Updates optimistas en toggles de preferencias                         | P3        | M        | —                | DONE (`2fc1f3a`; nota: pinned-projects-store tiene el mismo patrón, candidato futuro) |
| 016  | No pisar salud del proyecto al editar updates históricos              | P3        | S        | —                | DONE (`31daefd`; reutiliza `getLatestProjectUpdate`)                                  |
| 017  | Tipar contexto del router + opción inválida Convex + script typecheck | P1        | S        | —                | DONE (`ead7319`; interfaz incluye convexQueryClient)                                  |
| 018  | Typecheck en cero errores (serializadores, ids, UI)                   | P1        | M        | 017              | DONE (`7bbee8b`, `963b748`, `e31ff39`; fix runtime real en nav-saved-views delete)    |

Nota 2026-08-23: los planes 001–016 se ejecutaron, revisaron y mergea­ron a `master` (fast-forward hasta `31daefd`). Los planes 017–018 también (hasta `e31ff39`); `bun run typecheck` queda en cero errores y como script permanente. `pinned-projects-store` se evaluó como candidato de iteración y se descartó como bug: el toggle lo resuelve el servidor transaccionalmente; solo falta UX optimista (polish opcional).

## Dependency notes

- **010 depende de 001**: ambos tocan `assertCanEnterStatus` y el mecanismo de estados en `convex/issues.ts`; aterrizar el import primero.
- **010 conviene ejecutarlo después de 012** solo por orden práctico (mismo archivo), no es dependencia lógica.
- **014 depende de 009**: reutiliza el parámetro `order: IssueOrderConfig` introducido en la firma de `getIssueListRows`.
- Los planes 001–004 son crashes/no-ops confirmados con evidencia directa; ejecútalos primero como un lote.

## Decisiones de producto embebidas (confirmar si aparecen dudas)

- 013 paso 1: My Work muestra datos sin filtros globales (recomendado; pedir confirmación si se prefiere mostrar chips).
- 016: editar un update histórico NO debe rewindsar la salud actual del proyecto.
- 007: se corrige el tipo declarado (`string | null`) en vez de migrar el almacenamiento a numérico.

## Findings considered and rejected

- Atajos sin cubrir `[role="listbox"]` de Radix Select (`keyboard-utils.ts`): gap latente sin ningún Select primitivo en uso hoy; añadir selector preventivamente es ruido.
- Identidad inestable de `useProjectOptions` en efectos (`hooks/use-project-options.ts`): fragilidad real pero sin síntoma activo verificado; revisitar si aparece un suscriptor nuevo del store de crear issue.
- Divergencia de ids por blockquotes anidados en markdown outline: sub-caso del hallazgo 006; quedó documentado como mantenimiento en ese plan.
