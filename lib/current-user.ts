import type { User } from '@/lib/models';

export const statusUserColors = {
   online: '#00cc66',
   offline: '#969696',
   away: '#ffcc00',
};

export const currentUser: User = {
   id: 'me',
   name: 'vcntttt',
   avatarUrl: 'https://i.pinimg.com/736x/bd/1f/b6/bd1fb6cf9d218514d9ed9a8022153dd2.jpg',
   email: 'local@triangle.dev',
   status: 'online',
   role: 'Admin',
   joinedDate: '2026-01-01',
   teamIds: [],
};

export const personalAssigneeOptions: User[] = [currentUser];

export const personalMemberOptions: User[] = [currentUser];

export function resolveCurrentAssignee(assigneeId: string | null | undefined): User | null {
   if (!assigneeId) {
      return null;
   }

   return currentUser;
}
