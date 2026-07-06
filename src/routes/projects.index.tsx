import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import Projects from '@/components/common/projects/projects';
import { projectsPageQuery } from '@/src/data/projects';

export const Route = createFileRoute('/projects/')({
   component: ProjectsIndexPage,
});

function ProjectsIndexPage() {
   const { data } = useSuspenseQuery(projectsPageQuery());
   const { projects, statusOptions, priorityOptions, databaseError } = data;

   return (
      <Projects
         projects={projects}
         statusOptions={statusOptions}
         priorityOptions={priorityOptions}
         databaseError={databaseError}
      />
   );
}
