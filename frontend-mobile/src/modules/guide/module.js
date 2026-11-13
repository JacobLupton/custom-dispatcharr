import { lazy } from 'react';
import { LayoutGrid } from 'lucide-react';

export default {
  id: 'guide',
  label: 'TV Guide',
  shortLabel: 'Guide',
  icon: LayoutGrid,
  path: '/guide',
  component: lazy(() => import('./GuidePage')),
  tab: 2,
  order: 20,
  section: 'Watch',
};
