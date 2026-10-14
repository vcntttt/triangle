# Triangle

Triangle es el gestor personal de proyectos y tareas de Vicente. Su contexto de desarrollo permite entender el trabajo repartido entre máquinas y copias de un proyecto.

## Lenguaje

**Estado actual del desarrollo**: Situación observable del trabajo de un proyecto en sus distintas ubicaciones: actividad de agentes, cambios pendientes y servidores de desarrollo. Permite saber qué está ocurriendo y qué requiere intervención.

**Ubicación de trabajo**: Copia concreta de un proyecto en una máquina, con su rama y directorio de trabajo. Un proyecto puede tener varias ubicaciones con trabajo simultáneo.

**Atención personal**: Dedicación directa de Vicente a un proyecto. Se distingue del trabajo que los agentes realizan mientras él atiende otro proyecto.

**Ejecución de agentes**: Trabajo realizado por agentes para un proyecto. Puede continuar sin atención personal y coincidir con ejecuciones de otros proyectos.

**Atención recibida**: Trabajo que recibe un proyecto, por dedicación personal de Vicente o por ejecución de sus agentes. Describe actividad observada y puede existir aunque el proyecto no requiera atención.

**Atención requerida**: Necesidad de dedicar atención a un proyecto. Expresa dónde Vicente debería trabajar y es independiente de la atención que el proyecto esté recibiendo.

**Tiempo personal estimado**: Aproximación a la duración de la atención personal. No suma el tiempo de ejecución de agentes y es información secundaria frente al estado actual del desarrollo.

**Trabajo sin vincular**: Trabajo observado cuyo repositorio todavía no está asociado a un proyecto de Triangle. Permanece en el inventario hasta que Vicente lo asocie o cree un proyecto.

**Observador local**: Proceso de Triangle que corre en cada máquina, lee T3 Code oficial y el estado local de Git y procesos, y publica observaciones hacia Triangle. T3 no se modifica.

**Pendiente operativo**: Situación concreta del desarrollo que puede necesitar intervención, como cambios sin commit o un agente esperando respuesta. Es independiente de la atención requerida que Vicente declara para el proyecto.
