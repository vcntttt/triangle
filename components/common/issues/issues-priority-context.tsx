'use client';

import { createContext, use, useMemo } from 'react';
import { priorities as basePriorities, type Priority } from '@/lib/ui-catalog';
import type { ProjectOptionLike } from '@/lib/projects-presentation';

const IssuesPriorityContext = createContext<Priority[]>([]);

const basePriorityById = Object.fromEntries(basePriorities.map((item) => [item.id, item]));

function toPriorityKey(value: string): string {
   return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
}

const priorityNameAliases: Record<string, string> = {
   'no-priority': 'no-priority',
   'none': 'no-priority',
   'nonepriority': 'no-priority',
};

function resolvePriorityIcon(priorityId: string, priorityName: string): Priority['icon'] {
   const directMatch = basePriorityById[priorityId];
   if (directMatch) {
      return directMatch.icon;
   }

   const normalizedId = toPriorityKey(priorityId);
   const aliasedId = priorityNameAliases[normalizedId];
   if (aliasedId && basePriorityById[aliasedId]) {
      return basePriorityById[aliasedId].icon;
   }

   const normalizedName = toPriorityKey(priorityName);
   if (basePriorityById[normalizedName]) {
      return basePriorityById[normalizedName].icon;
   }

   const aliasedNameId = priorityNameAliases[normalizedName];
   if (aliasedNameId && basePriorityById[aliasedNameId]) {
      return basePriorityById[aliasedNameId].icon;
   }

   return basePriorities[0].icon;
}

export function IssuesPriorityProvider({
   priorities,
   children,
}: {
   priorities: ProjectOptionLike[];
   children: React.ReactNode;
}) {
   const resolvedPriorities = useMemo<Priority[]>(
      () =>
         priorities.map((item) => ({
            id: item.id,
            name: item.name,
            position: item.position,
            icon: resolvePriorityIcon(item.id, item.name),
         })),
      [priorities]
   );

   return (
      <IssuesPriorityContext.Provider value={resolvedPriorities}>
         {children}
      </IssuesPriorityContext.Provider>
   );
}

export function useIssuesPriorities() {
   const priorities = use(IssuesPriorityContext);
   return priorities.length > 0 ? priorities : basePriorities;
}
