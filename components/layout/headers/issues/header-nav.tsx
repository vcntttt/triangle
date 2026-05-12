'use client';

import type { Project } from '@/lib/models';
import { Button } from '@/components/ui/button';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSearchStore } from '@/store/search-store';
import { Plus, SearchIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface HeaderNavProps {
   count: number;
   isConnected: boolean;
   projectTitle?: string;
   project?: Project;
   leftActions?: React.ReactNode;
   rightActions?: React.ReactNode;
}

export default function HeaderNav({
   count,
   isConnected,
   projectTitle,
   project,
   leftActions,
   rightActions,
}: HeaderNavProps) {
   const { openModal } = useCreateIssueStore();
   const { isSearchOpen, toggleSearch, closeSearch, setSearchQuery, searchQuery } =
      useSearchStore();
   const searchInputRef = useRef<HTMLInputElement>(null);
   const searchContainerRef = useRef<HTMLDivElement>(null);
   const previousValueRef = useRef<string>('');

   useEffect(() => {
      if (isSearchOpen && searchInputRef.current) {
         searchInputRef.current.focus();
      }
   }, [isSearchOpen]);

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (
            searchContainerRef.current &&
            !searchContainerRef.current.contains(event.target as Node) &&
            isSearchOpen
         ) {
            if (searchQuery.trim() === '') {
               closeSearch();
            }
         }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
         document.removeEventListener('mousedown', handleClickOutside);
      };
   }, [isSearchOpen, closeSearch, searchQuery]);

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-3">
            <SidebarTrigger className="" />
            <div className="flex items-center gap-1">
               <span className="text-sm font-medium">{projectTitle ?? 'Issues'}</span>
               <span className="text-xs bg-accent rounded-md px-1.5 py-1">{count}</span>
            </div>
            {isSearchOpen ? (
               <div
                  ref={searchContainerRef}
                  className="relative flex items-center justify-center w-64 transition-all duration-200 ease-in-out"
               >
                  <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                     type="search"
                     ref={searchInputRef}
                     value={searchQuery}
                     onChange={(e) => {
                        previousValueRef.current = searchQuery;
                        const newValue = e.target.value;
                        setSearchQuery(newValue);

                        if (previousValueRef.current && newValue === '') {
                           const inputEvent = e.nativeEvent as InputEvent;
                           if (
                              inputEvent.inputType !== 'deleteContentBackward' &&
                              inputEvent.inputType !== 'deleteByCut'
                           ) {
                              closeSearch();
                           }
                        }
                     }}
                     placeholder="Search issues..."
                     className="pl-8 h-7 text-sm"
                     onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                           if (searchQuery.trim() === '') {
                              closeSearch();
                           } else {
                              setSearchQuery('');
                           }
                        }
                     }}
                  />
               </div>
            ) : (
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSearch}
                  className="size-8"
                  aria-label="Search"
               >
                  <SearchIcon className="size-4" />
               </Button>
            )}
            {leftActions}
         </div>

         <div className="flex items-center gap-2">
            {rightActions}
            <Button
               className="relative"
               size="xs"
               variant="secondary"
               onClick={() => openModal(undefined, project)}
               disabled={!isConnected}
            >
               <Plus className="size-4" />
               <span className="hidden sm:inline ml-1">Create issue</span>
            </Button>
         </div>
      </div>
   );
}
