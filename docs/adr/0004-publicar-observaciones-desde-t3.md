---
status: proposed
---

# Publicar las observaciones desde cada servidor T3

Cada servidor T3 publicará observaciones hacia Triangle mientras esté funcionando, mediante un módulo ligado a su ciclo de vida. Triangle no sondeará las máquinas: recibir datos desde ellas evita depender de conexiones entrantes hacia servidores locales y permite observar sin un cliente abierto.

El receptor se ubicará en el backend Convex de Triangle, con una credencial específica por entorno. La entrega tendrá una cola persistente propia en T3 y confirmación después de guardar los datos; la secuencia de entrega será independiente de las secuencias de orquestación. Las observaciones conservarán el estado actual y las transiciones relevantes, sin copiar conversaciones, salidas de terminal ni contenido de archivos.

La cola de integración no reutilizará directamente la cola de efectos de orquestación: tienen distintos destinatarios, formas de confirmar entrega y reglas de retención. Sí se reutilizarán los patrones existentes de persistencia y ejecución con alcance limitado al servidor.

Esta es una propuesta técnica para TRI-17. Antes de implementarla, la tarea del contrato debe comprobar el acceso al endpoint HTTP del Convex alojado por Vicente y concretar sus límites de entrega, recuperación y almacenamiento.
