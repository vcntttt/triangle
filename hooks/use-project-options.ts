'use client';

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

export function useProjectOptions() {
   const { data: projects = [] } = useQuery(projectOptionsQuery());
   const { data: statuses = [] } = useQuery(projectStatusListQuery());
   const { data: priorities = [] } = useQuery(projectPriorityListQuery());
   const { data: attentions = [] } = useQuery(projectAttentionListQuery());
   const viewer = viewerProfileToUser(useViewerProfile());

   return (projects as ProjectLike[]).map((project) =>
      toPresentationProject(
         project,
         statuses as ProjectOptionLike[],
         priorities as ProjectOptionLike[],
         attentions as ProjectOptionLike[],
         viewer
      )
   ) satisfies Project[];
}
