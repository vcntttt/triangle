import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ProjectUpdatesTimeline } from '@/components/common/projects/project-updates-timeline';
import MainLayout from '@/components/layout/main-layout';
import { projectUpdatesPageQuery } from '@/src/data/projects';

export const Route = createFileRoute('/pulse')({
   loader: ({ context }) => context.queryClient.ensureQueryData(projectUpdatesPageQuery()),
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
   const { data } = useSuspenseQuery(projectUpdatesPageQuery());
   const { updates, databaseError, isConnected } = data;

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
