'use client';

import { createContext, useContext } from 'react';
import { defaultIssueDisplay, type IssueDisplayConfig } from '@/lib/issue-view';

const IssuesDisplayContext = createContext<IssueDisplayConfig>(defaultIssueDisplay);

export function IssuesDisplayProvider({
   display,
   children,
}: {
   display: IssueDisplayConfig;
   children: React.ReactNode;
}) {
   return <IssuesDisplayContext.Provider value={display}>{children}</IssuesDisplayContext.Provider>;
}

export function useIssueDisplay() {
   return useContext(IssuesDisplayContext);
}
