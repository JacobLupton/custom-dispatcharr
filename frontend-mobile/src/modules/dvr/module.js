import { lazy } from 'react';
import { Database } from 'lucide-react';
import { canViewDvr } from '@core/upstream';

export default {
  id: 'dvr',
  label: 'DVR',
  icon: Database,
  path: '/dvr',
  component: lazy(() => import('./DVRPage')),
  visible: canViewDvr,
  tab: 3,
  order: 40,
  section: 'Watch',
};
