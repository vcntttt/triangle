import { createFileRoute } from '@tanstack/react-router';
import { ProjectUpdatesTimeline } from '@/components/common/projects/project-updates-timeline';
import MainLayout from '@/components/layout/main-layout';
import { getProjectUpdatesPage } from '@/src/server/projects';

export const Route = createFileRoute('/pulse')({
   loader: () => getProjectUpdatesPage(),
   head: () => ({
      meta: [
         { title: 'Pulse | Triangle' },
         {
            name: 'description',
            content: 'Timeline of project health updates for the personal Triangle tracker.',
         },
      ],
   }),
   component: PulsePage,
});

function PulsePage() {
   const { updates, databaseError, isConnected } = Route.useLoaderData();

   return (
      <MainLayout headersNumber={1}>
         <ProjectUpdatesTimeline
            updates={updates}
            databaseError={databaseError}
            isConnected={isConnected}
         />
      </MainLayout>
   );
}
