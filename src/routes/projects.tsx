import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router';
import Header from '@/components/layout/headers/projects/header';
import MainLayout from '@/components/layout/main-layout';
import { getProjectsPage } from '@/src/server/projects';

export const Route = createFileRoute('/projects')({
   loader: () => getProjectsPage(),
   head: () => ({
      meta: [
         { title: 'Projects | Triangle' },
         {
            name: 'description',
            content: 'Projects backed by PostgreSQL for the personal Triangle tracker.',
         },
      ],
   }),
   component: ProjectsPage,
});

function ProjectsPage() {
   const { projects, isConnected } = Route.useLoaderData();
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
