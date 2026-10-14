# Observaciones de T3 Code, contrato v1

El observador local de cada máquina envía a Triangle lo que ve en T3 Code oficial, Git y los procesos de sus checkouts. Los esquemas están en [convex/devState/contract.ts](../../convex/devState/contract.ts) y los usan ambos lados; este documento fija las reglas de entrega que los esquemas no pueden expresar. La decisión de arquitectura está en el [ADR 0004](../adr/0004-observar-t3-oficial-desde-triangle.md).

## Entrega

El observador hace `POST` a `DEV_STATE_OBSERVATIONS_PATH` en el sitio HTTP del Convex de Triangle, con `Authorization: Bearer <credencial>` y un lote JSON de hasta `MAX_OBSERVATIONS_PER_BATCH` observaciones y `MAX_BATCH_BYTES`.

Cada credencial pertenece a un solo `environmentId` de T3. Triangle guarda solo su hash, puede revocarla y nunca acepta la clave administradora de Convex. Un lote con otro `environmentId` recibe `403 rejected/environment_mismatch`; una credencial inválida o revocada, `401`. En ambos casos el observador deja de enviar y conserva su cola.

## Secuencias y confirmación

Un stream es el estado persistente de un observador y se identifica con `streamId`. Sus secuencias empiezan en 1, son contiguas y el observador las guarda antes de enviarlas. Si el observador pierde su estado, empieza un stream nuevo en 1, y ese stream reemplaza al anterior del mismo entorno. El stream reemplazado recibe `409 stream_superseded`.

El receptor aplica en orden las observaciones con secuencia mayor que la última guardada, ignora las repetidas y responde `200 accepted` con `acknowledgedThrough` solo después de persistir. Si el lote empieza después de la siguiente secuencia esperada, responde `409 sequence_gap` con `expectedSequence`, sin guardar nada. Un reintento del mismo lote es inofensivo.

Las respuestas `5xx`, `429` y los fallos de red se vuelven a intentar con espera exponencial y jitter, de 1 segundo a 5 minutos. Un `400` no se vuelve a intentar: el observador registra el error localmente y no descarta el lote.

## Estado y transiciones

Cada observación de entidad lleva su estado completo, no un diff. El observador solo envía una entidad cuando cambia y, al arrancar, vuelve a enviar todas. El receptor registra una transición solo cuando el estado difiere del guardado. La primera observación de una entidad es su base y se fecha como «detectado desde», sin fabricar historia anterior.

Las bajas son explícitas. `location_removed` exige una enumeración de Git completa y válida, y `server_stopped` exige comprobar que el proceso terminó. Un fallo al observar o la falta de observaciones nunca implica una baja.

El observador envía `emitter` al menos cada `HEARTBEAT_INTERVAL_MS`. Pasado `STALE_AFTER_MS` sin lotes, el receptor muestra la última información conocida con su fecha y no da por terminados agentes ni servidores. Si T3 no responde o su autorización MCP vence, `emitter.t3` lo dice; Git y procesos siguen observándose sobre los últimos proyectos conocidos.

## Cola local

El observador retiene como máximo 10.000 observaciones sin confirmar o 7 días. Al superar el límite descarta las más antiguas y encola un `history_gap` con el intervalo afectado. Así la pérdida de datos queda registrada.

## Reloj

El orden dentro de un stream lo da la secuencia, nunca `observedAt`. El receptor guarda `observedAt` y su propio momento de recepción. Si `sentAt` difiere en más de 5 minutos del momento de recepción, corrige las fechas de ese lote con la diferencia y marca el entorno con reloj desfasado.

## Compatibilidad

Los esquemas son estrictos: cualquier cambio de forma crea una versión nueva. El receptor se despliega primero y acepta la versión actual y la anterior; `rejected/unsupported_version` indica las que acepta en `supportedVersions`. Los estados de T3 se traducen en el observador a `activity`, así que un estado nuevo de T3 no rompe el contrato.

## Privacidad

Solo viajan metadatos: identificadores, rutas, ramas, contadores, fechas, puertos y el nombre del ejecutable. Nunca viajan conversaciones, diffs, salidas de terminal, contenido de archivos ni argumentos de procesos.
