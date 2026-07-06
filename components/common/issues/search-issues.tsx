'use client';

import { useIssuesData, type IssuesData } from '@/components/common/issues/issues-data-context';
import { useSearchStore } from '@/store/search-store';
import { useMemo } from 'react';
import { IssueLine } from './issue-line';
import type { Issue } from '@/lib/models';

export function SearchIssues({
   issues,
   selectedIssueIdentifier,
   selectedIssueIds,
   onSelectIssue,
   onToggleIssueSelection,
}: {
   issues?: IssuesData['issues'];
   selectedIssueIdentifier?: string;
   selectedIssueIds?: Set<string>;
   onSelectIssue?: (issue: Issue) => void;
   onToggleIssueSelection?: (issue: Issue) => void;
}) {
   const { searchIssues } = useIssuesData();
   const { searchQuery, isSearchOpen } = useSearchStore();

   const searchResults = useMemo(() => {
      if (searchQuery.trim() === '') {
         return [];
      }

      const normalizedQuery = searchQuery.toLowerCase();
      return issues
         ? issues.filter(
              (issue) =>
                 issue.title.toLowerCase().includes(normalizedQuery) ||
                 issue.identifier.toLowerCase().includes(normalizedQuery)
           )
         : searchIssues(searchQuery);
   }, [issues, searchIssues, searchQuery]);

   if (!isSearchOpen) {
      return null;
   }

   return (
      <div className="w-full">
         {searchQuery.trim() !== '' && (
            <div>
               {searchResults.length > 0 ? (
                  <div className="border rounded-md mt-4">
                     <div className="py-2 px-4 border-b bg-muted/50">
                        <h3 className="text-sm font-medium">Results ({searchResults.length})</h3>
                     </div>
                     <div className="divide-y">
                        {searchResults.map((issue) => (
                           <IssueLine
                              key={issue.id}
                              issue={issue}
                              layoutId={false}
                              isActive={selectedIssueIdentifier === issue.identifier}
                              isBulkSelected={selectedIssueIds?.has(issue.id) ?? false}
                              onSelect={onSelectIssue}
                              onToggleSelection={onToggleIssueSelection}
                           />
                        ))}
                     </div>
                  </div>
               ) : (
                  <div className="text-center py-8 text-muted-foreground">
                     No results found for &quot;{searchQuery}&quot;
                  </div>
               )}
            </div>
         )}
      </div>
   );
}
