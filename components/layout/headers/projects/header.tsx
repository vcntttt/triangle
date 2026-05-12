import HeaderNav from './header-nav';
import { Filter } from './filter';
import { DisplayMenu } from './header-options';

interface HeaderProps {
   count: number;
   isConnected: boolean;
}

export default function Header({ count, isConnected }: HeaderProps) {
   return (
      <HeaderNav
         count={count}
         isConnected={isConnected}
         leftActions={<Filter />}
         rightActions={<DisplayMenu />}
      />
   );
}
