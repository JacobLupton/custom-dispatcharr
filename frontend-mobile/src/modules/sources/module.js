import { lazy } from 'react';
import { Play } from 'lucide-react';

export default {
  id: 'sources',
  label: 'M3U & EPG',
  icon: Play,
  path: '/sources',
  component: lazy(() => import('./SourcesPage')),
  adminOnly: true,
  order: 60,
  section: 'Manage',
};
