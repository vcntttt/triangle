import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { z } from 'zod';
import MainLayout from '@/components/layout/main-layout';
import { MyWorkHeader } from '@/components/layout/headers/my-work-header';
import { IssuesWorkspace } from '@/components/common/issues/issues-workspace';
import { myWorkQuery } from '@/src/data/issues';

const myWorkSearchSchema = z.object({
   tab: z.enum(['assigned', 'activity']).optional().catch('assigned'),
});

export const Route = createFileRoute('/my-work')({
   validateSearch: (search) => myWorkSearchSchema.parse(search),
   loaderDeps: ({ search }) => ({ tab: search.tab ?? 'assigned' }),
   loader: ({ context, deps }) => context.queryClient.ensureQueryData(myWorkQuery(deps.tab)),
   head: () => ({ meta: [{ title: 'My work | Triangle' }] }),
   component: MyWorkPage,
});

function MyWorkPage() {
   const { tab = 'assigned' } = Route.useSearch();
   const { data } = useSuspenseQuery(myWorkQuery(tab));

   return (
      <MainLayout headersNumber={1} header={<MyWorkHeader tab={tab} count={data.issues.length} />}>
         <IssuesWorkspace
            initialIssues={data.issues}
            initialStatuses={data.statusOptions}
            initialPriorities={data.priorityOptions}
            databaseError={data.databaseError}
            scope="all"
            applyIssueFilters={false}
            emptyCopy={{
               title: tab === 'assigned' ? 'No assigned issues' : 'No issue activity yet',
               description:
                  tab === 'assigned'
                     ? 'Issues assigned to you will appear here.'
                     : 'Recent issue changes will appear here.',
            }}
         />
      </MainLayout>
   );
}
