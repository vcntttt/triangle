'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
   type Project,
   type ProjectLike,
   type ProjectOptionLike,
   toPresentationProject,
} from '@/lib/projects-presentation';
import {
   projectOptionsQuery,
   projectPriorityListQuery,
   projectAttentionListQuery,
   projectStatusListQuery,
} from '@/src/data/projects';
import { useViewerProfile } from '@/src/data/viewer';
import { viewerProfileToUser } from '@/lib/current-user';

const noOptions: never[] = [];

// Memoized so consumers can use the result as an effect or memo dependency.
export function useProjectOptions() {
   const { data: projects = noOptions } = useQuery(projectOptionsQuery());
   const { data: statuses = noOptions } = useQuery(projectStatusListQuery());
   const { data: priorities = noOptions } = useQuery(projectPriorityListQuery());
   const { data: attentions = noOptions } = useQuery(projectAttentionListQuery());
   const viewerProfile = useViewerProfile();

   return useMemo(() => {
      const viewer = viewerProfileToUser(viewerProfile);
      return (projects as ProjectLike[]).map((project) =>
         toPresentationProject(
            project,
            statuses as ProjectOptionLike[],
            priorities as ProjectOptionLike[],
            attentions as ProjectOptionLike[],
            viewer
         )
      ) satisfies Project[];
   }, [attentions, priorities, projects, statuses, viewerProfile]);
}
