# Triangle

![Logo de Triangle](./public/triangle.png)

Triangle es un fork personal nacido a partir de Circle, una interfaz de gestion de proyectos inspirada en Linear.

Triangle es la version adaptada para uso personal. El objetivo no es reconstruir Linear completo, sino convertir la base visual original en una herramienta simple y usable para gestionar proyectos, issues y etiquetas.

## Enfoque de esta version

Se recorto el producto para priorizar un flujo personal:

- proyectos
- issues
- etiquetas
- persistencia real con PostgreSQL

Y se dejaron fuera, o en segundo plano, las funciones orientadas a trabajo en equipo que no aportan al caso de uso personal.

## Desarrollo local

Este proyecto espera una instancia compartida de PostgreSQL corriendo fuera del repo.

Comandos principales:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

## Estado actual

Este fork ya prioriza datos reales en PostgreSQL y evita depender de contenido ficticio para funcionar.

## Credito

Nacio a partir de Circle, proyecto original de UI inspirado en Linear.
