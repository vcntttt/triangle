import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import Header from '@/components/layout/headers/projects/header';
import MainLayout from '@/components/layout/main-layout';
import { projectsPageQuery } from '@/src/data/projects';

export const Route = createFileRoute('/projects')({
   loader: ({ context }) => context.queryClient.ensureQueryData(projectsPageQuery()),
   head: () => ({
      meta: [
         { title: 'Projects | Triangle' },
         {
            name: 'description',
            content: 'Projects backed by Convex for the personal Triangle tracker.',
         },
      ],
   }),
   component: ProjectsPage,
});

function ProjectsPage() {
   const { data } = useSuspenseQuery(projectsPageQuery());
   const { projects, isConnected } = data;
   const pathname = useRouterState({ select: (state) => state.location.pathname });
   const isProjectsIndex = pathname === '/projects';

   return (
      <MainLayout
         headersNumber={1}
         header={
            isProjectsIndex ? <Header count={projects.length} isConnected={isConnected} /> : null
         }
      >
         <Outlet />
      </MainLayout>
   );
}
