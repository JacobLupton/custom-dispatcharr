import { lazy } from 'react';
import { ChartLine } from 'lucide-react';

export default {
  id: 'stats',
  label: 'Activity',
  icon: ChartLine,
  path: '/stats',
  component: lazy(() => import('./ActivityPage')),
  adminOnly: true,
  tab: 4,
  order: 50,
  section: 'Manage',
};
