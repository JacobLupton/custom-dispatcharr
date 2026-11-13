import { lazy } from 'react';
import { Settings } from 'lucide-react';

export default {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  path: '/settings',
  component: lazy(() => import('./SettingsPage')),
  order: 120,
  section: 'System',
};
