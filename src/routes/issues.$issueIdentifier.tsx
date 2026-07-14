import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/issues/$issueIdentifier')({
   head: ({ params }) => ({
      meta: [{ title: `${params.issueIdentifier} | Triangle` }],
   }),
   component: () => null,
});
