import { lazy } from 'react';
import { ListOrdered } from 'lucide-react';

export default {
  id: 'channels',
  label: 'Channels',
  icon: ListOrdered,
  path: '/channels',
  component: lazy(() => import('./ChannelsPage')),
  tab: 1,
  order: 10,
  section: 'Watch',
};
