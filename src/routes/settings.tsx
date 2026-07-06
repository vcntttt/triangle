import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import Settings from '@/components/common/settings/settings';
import Header from '@/components/layout/headers/settings/header';
import MainLayout from '@/components/layout/main-layout';
import { projectPriorityListQuery, projectStatusListQuery } from '@/src/data/projects';
import { viewerPreferencesQuery, viewerProfileQuery } from '@/src/data/viewer';

export const Route = createFileRoute('/settings')({
   loader: async ({ context }) => {
      await Promise.all([
         context.queryClient.ensureQueryData(projectStatusListQuery()),
         context.queryClient.ensureQueryData(projectPriorityListQuery()),
         context.queryClient.ensureQueryData(viewerProfileQuery()),
         context.queryClient.ensureQueryData(viewerPreferencesQuery()),
      ]);
   },
   head: () => ({
      meta: [{ title: 'Settings | Triangle' }],
   }),
   component: SettingsPage,
});

function SettingsPage() {
   const { data: projectStatuses } = useSuspenseQuery(projectStatusListQuery());
   const { data: projectPriorities } = useSuspenseQuery(projectPriorityListQuery());

   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <Settings
            initialProjectStatuses={projectStatuses}
            initialProjectPriorities={projectPriorities}
         />
      </MainLayout>
   );
}
