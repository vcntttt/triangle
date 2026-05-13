'use client';

import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { useSearchStore } from '@/store/search-store';
import { useShortcutsHelpStore } from '@/store/shortcuts-help-store';
import { hasOpenKeyboardBlockingLayer, isEditableTarget } from './keyboard-utils';

export function GlobalShortcuts() {
   const location = useRouterState({ select: (state) => state.location });
   const { openModal } = useCreateIssueStore();
   const { openSearch } = useSearchStore();
   const { open } = useShortcutsHelpStore();

   useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
         const pathname = location.pathname;
         const search = location.search as { tab?: string };
         const isIssuesRoute = pathname === '/issues' || pathname.startsWith('/issues/');
         const isProjectIssuesRoute = pathname.startsWith('/projects/') && search.tab === 'issues';
         const isProjectDetailRoute = pathname.startsWith('/projects/');

         if (!isIssuesRoute && !isProjectDetailRoute) {
            return;
         }

         if (
            event.key === '?' &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.repeat
         ) {
            if (isEditableTarget(event.target) || hasOpenKeyboardBlockingLayer()) {
               return;
            }

            event.preventDefault();
            open();
            return;
         }

         if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat) {
            return;
         }

         if (isEditableTarget(event.target) || hasOpenKeyboardBlockingLayer()) {
            return;
         }

         const normalizedKey = event.key.toLowerCase();
         const isCreateIssueKey = normalizedKey === 'c' || event.code === 'KeyC';

         if (isCreateIssueKey) {
            event.preventDefault();
            openModal();
            return;
         }

         if (event.key === '/' && (isIssuesRoute || isProjectIssuesRoute)) {
            event.preventDefault();
            openSearch();
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [location, open, openModal, openSearch]);

   return null;
}
