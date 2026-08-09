import HeaderNav from './header-nav';
import { Filter } from './filter';
import { DisplayMenu } from './header-options';
import { SaveViewButton } from '@/components/common/views/saved-view-dialog';
import { IssueInsightsToggle } from '@/components/common/issues/issue-insights-panel';

interface HeaderProps {
   count: number;
   isConnected: boolean;
   projectTitle?: string;
   project?: import('@/lib/models').Project;
   scope?: 'active' | 'backlog' | 'all';
   viewId?: string;
}

export default function Header({
   count,
   isConnected,
   projectTitle,
   project,
   scope,
   viewId,
}: HeaderProps) {
   return (
      <HeaderNav
         count={count}
         isConnected={isConnected}
         projectTitle={projectTitle}
         project={project}
         scope={scope}
         viewId={viewId}
         leftActions={<Filter />}
         rightActions={
            <>
               <SaveViewButton scope={scope} />
               <IssueInsightsToggle />
               <DisplayMenu />
            </>
         }
      />
   );
}
