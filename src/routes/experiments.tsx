import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ExperimentDialog } from '@/components/common/experiments/experiment-dialog';
import { ExperimentsBoard } from '@/components/common/experiments/experiments-board';
import MainLayout from '@/components/layout/main-layout';
import { ExperimentsHeader } from '@/components/layout/headers/experiments-header';
import { experimentsPageQuery } from '@/src/data/experiments';

export const Route = createFileRoute('/experiments')({
   loader: ({ context }) => context.queryClient.ensureQueryData(experimentsPageQuery()),
   head: () => ({ meta: [{ title: 'Experiments | Triangle' }] }),
   component: ExperimentsPage,
});

function ExperimentsPage() {
   const { data: experiments } = useSuspenseQuery(experimentsPageQuery());
   const [isCreating, setIsCreating] = useState(false);

   return (
      <MainLayout
         headersNumber={1}
         header={
            <ExperimentsHeader count={experiments.length} onCreate={() => setIsCreating(true)} />
         }
      >
         <ExperimentsBoard experiments={experiments} />
         <ExperimentDialog open={isCreating} onOpenChange={setIsCreating} />
      </MainLayout>
   );
}
