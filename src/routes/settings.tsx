import { createFileRoute } from '@tanstack/react-router';
import Settings from '@/components/common/settings/settings';
import Header from '@/components/layout/headers/settings/header';
import MainLayout from '@/components/layout/main-layout';
import { getProjectPriorityList, getProjectStatusList } from '@/src/server/projects';

export const Route = createFileRoute('/settings')({
   loader: async () => {
      const [projectStatuses, projectPriorities] = await Promise.all([
         getProjectStatusList(),
         getProjectPriorityList(),
      ]);

      return {
         projectStatuses,
         projectPriorities,
      };
   },
   head: () => ({
      meta: [{ title: 'Settings | Triangle' }],
   }),
   component: SettingsPage,
});

function SettingsPage() {
   const { projectStatuses, projectPriorities } = Route.useLoaderData();

   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <Settings
            initialProjectStatuses={projectStatuses}
            initialProjectPriorities={projectPriorities}
         />
      </MainLayout>
   );
}
