# Observador local

El observador corre en cada máquina con T3 Code oficial y publica en Triangle el estado de sus proyectos: checkouts y pendientes de Git, conversaciones, ejecuciones de agentes y mensajes del usuario. Las reglas de entrega están en [t3-observations-v1.md](./t3-observations-v1.md).

## Puesta en marcha

1. Aprobar el acceso de solo lectura a T3 con `bun observer/main.ts login <url-mcp-de-t3>`. La URL sale de **Settings → Connections → Copy MCP URL**. El comando imprime la página de aprobación; si el navegador está en otra máquina, se pega en la terminal la URL final a la que redirige.
2. Crear la credencial de Triangle para ese entorno con el comando que imprime `login` (`bunx convex run devState/credentials:create ...`). El token se muestra una sola vez.
3. Guardarla sin dejarla en el historial de la shell: `bun observer/main.ts connect <url-del-sitio-convex> < archivo-con-el-token`.
4. Ejecutar `bun observer/main.ts run` como proceso del usuario.

El estado vive en `~/.local/state/triangle-observer` (o en `$TRIANGLE_OBSERVER_STATE`) con permisos solo para el dueño: configuración, autorización de T3 y la cola SQLite.

## Trampas

- La autorización de T3 dura 30 días y no se renueva. Al vencer, el observador sigue leyendo Git sobre los últimos proyectos conocidos y publica `t3: unauthorized`; hay que repetir `login`.
- Una respuesta `401`, `403`, `400` o `stream_superseded` detiene la entrega sin descartar la cola. Tras corregir la configuración hay que reiniciar el proceso.
- Dos observadores con el mismo entorno se reemplazan entre sí: el último stream gana y el anterior deja de publicar.
