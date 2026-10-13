import HeaderNav from './header-nav';
import { Filter } from './filter';
import { DisplayMenu } from './header-options';
import { IssueInsightsToggle } from '@/components/common/issues/issue-insights-panel';

interface HeaderProps {
   count: number;
   isConnected: boolean;
   projectTitle?: string;
   project?: import('@/lib/models').Project;
}

export default function Header({ count, isConnected, projectTitle, project }: HeaderProps) {
   return (
      <HeaderNav
         count={count}
         isConnected={isConnected}
         projectTitle={projectTitle}
         project={project}
         leftActions={<Filter />}
         rightActions={
            <>
               <IssueInsightsToggle />
               <DisplayMenu />
            </>
         }
      />
   );
}
