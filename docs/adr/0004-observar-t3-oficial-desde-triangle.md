---
status: proposed
---

# Observar T3 Code oficial desde un observador de Triangle

La integración usa la versión oficial de T3 Code sin modificarla. Ningún cambio vive en un fork de T3; todo el código de la integración pertenece a este repositorio.

Cada máquina ejecuta un observador local de Triangle. Lee T3 por su servidor MCP con una autorización de solo lectura, que es la vía documentada para agentes externos. De ahí obtiene el entorno, los proyectos con su identidad de repositorio y las conversaciones con su rama, worktree, estado, solicitudes pendientes y ejecuciones. Git y los procesos se leen localmente: `git worktree list --porcelain` enumera todos los checkouts de los proyectos registrados en T3, también los worktrees sin rama, y los sockets en escucha se atribuyen a una ubicación por el directorio de trabajo del proceso. El observador no hace fetch, commit ni push, y no detiene procesos.

El observador publica lotes hacia un endpoint HTTP del Convex de Triangle con una credencial por entorno, revocable y distinta de la clave administradora. Guarda una cola local persistente con secuencia propia y descarta cada entrega solo después de que el receptor confirma haberla guardado. Envía metadatos operativos; nunca conversaciones, salidas de terminal ni contenido de archivos.

Un servidor de Triangle que sondee cada T3 no basta. El MCP de T3 lista worktrees solo a partir de una conversación y no expone procesos fuera de sus terminales, así que se perderían el checkout principal sin conversación y los servidores que lanzan los agentes. Contribuir un módulo al T3 oficial queda fuera de nuestro control.

## Consecuencias

- Hay que instalar y mantener el observador en cada máquina, como proceso de usuario de larga vida.
- La autorización MCP de T3 dura 30 días y no se renueva sola. Al vencer, el observador lo informa como estado propio y Vicente debe aprobarlo de nuevo.
- La conversación que lanzó un servidor solo se conoce cuando T3 la expone. En los demás casos queda como origen desconocido.
- El tiempo personal solo puede estimarse con interacciones que T3 registra, como mensajes y respuestas a solicitudes. Las lecturas sin interacción no se observan.

Antes de implementar, TRI-18 debe concretar el contrato, los límites de lotes y cola, el formato de credenciales y la recuperación después de reiniciar. El endpoint HTTP del Convex de Triangle es alcanzable desde Caburgua y vrhome; vrnotebook queda por comprobar.
