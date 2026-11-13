import { lazy } from 'react';
import { Video } from 'lucide-react';
import { canViewVod } from '@core/upstream';

export default {
  id: 'vods',
  label: 'Movies & Series',
  icon: Video,
  path: '/vods',
  component: lazy(() => import('./VODsPage')),
  visible: canViewVod,
  order: 30,
  section: 'Watch',
};
