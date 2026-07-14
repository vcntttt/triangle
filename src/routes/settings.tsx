import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '@convex/_generated/api';
import Settings from '@/components/common/settings/settings';
import Header from '@/components/layout/headers/settings/header';
import MainLayout from '@/components/layout/main-layout';
import { labelOptionsQuery } from '@/src/data/labels';
import { issueAutomationsQuery, issueStatusOptionsQuery } from '@/src/data/issue-automations';
import { projectPriorityListQuery, projectStatusListQuery } from '@/src/data/projects';
import { viewerPreferencesQuery, viewerProfileQuery } from '@/src/data/viewer';

export const Route = createFileRoute('/settings')({
   loader: async ({ context }) => {
      await Promise.all([
         context.convexClient
            .mutation(api.issueAutomations.ensureDefaults, {})
            .then(() => context.queryClient.ensureQueryData(issueAutomationsQuery())),
         context.queryClient.ensureQueryData(projectStatusListQuery()),
         context.queryClient.ensureQueryData(projectPriorityListQuery()),
         context.queryClient.ensureQueryData(labelOptionsQuery()),
         context.queryClient.ensureQueryData(issueStatusOptionsQuery()),
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
   const { data: labels } = useSuspenseQuery(labelOptionsQuery());
   const { data: automations } = useSuspenseQuery(issueAutomationsQuery());
   const { data: statuses } = useSuspenseQuery(issueStatusOptionsQuery());

   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <Settings
            initialLabels={labels}
            initialAutomations={automations}
            issueStatuses={statuses}
         />
      </MainLayout>
   );
}
