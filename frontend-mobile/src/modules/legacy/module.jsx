/**
 * Legacy layer: every upstream Dispatcharr page, wrapped in the new shell.
 *
 * Priority -100 means any custom module with the same id replaces it. Disable a
 * custom module (enabled: false) and the stock upstream page comes back.
 * New upstream pages can be exposed here with a single entry.
 */
import React from 'react';
import {
  Database,
  Download,
  FileImage,
  LayoutGrid,
  ListOrdered,
  Package,
  Play,
  ScrollText,
  Settings,
  ChartLine,
  User,
  Video,
  Webhook,
} from 'lucide-react';
import { canViewDvr, canViewVod, legacyPages, useSettingsStore } from '@core/upstream';
import LegacyPage from './LegacyPage';

const wrap = (Page, title) =>
  function Legacy() {
    return (
      <LegacyPage title={title}>
        <Page />
      </LegacyPage>
    );
  };

// Logs page only exists when log persistence is on (same rule as upstream Sidebar).
const logsVisible = (user) =>
  user?.user_level >= 10 &&
  useSettingsStore.getState().settings?.system_settings?.value?.log_persist !== false;

const entry = (id, label, icon, path, page, extra = {}) => ({
  id,
  label,
  icon,
  path,
  component: wrap(page, label),
  priority: -100,
  ...extra,
});

const pages = [
  entry('channels', 'Channels', ListOrdered, '/channels', legacyPages.channels, { tab: 1, order: 10, section: 'Watch' }),
  entry('guide', 'TV Guide', LayoutGrid, '/guide', legacyPages.guide, { tab: 2, order: 20, section: 'Watch', shortLabel: 'Guide' }),
  entry('vods', 'Movies & Series', Video, '/vods', legacyPages.vods, { order: 30, section: 'Watch', visible: canViewVod }),
  entry('dvr', 'DVR', Database, '/dvr', legacyPages.dvr, { tab: 3, order: 40, section: 'Watch', visible: canViewDvr }),
  entry('stats', 'Activity', ChartLine, '/stats', legacyPages.stats, { tab: 4, order: 50, section: 'Manage', adminOnly: true }),
  entry('sources', 'M3U & EPG', Play, '/sources', legacyPages.sources, { order: 60, section: 'Manage', adminOnly: true }),
  entry('logos', 'Logos', FileImage, '/logos', legacyPages.logos, { order: 70, section: 'Manage', adminOnly: true }),
  entry('users', 'Users', User, '/users', legacyPages.users, { order: 80, section: 'Manage', adminOnly: true }),
  entry('plugins', 'My Plugins', Package, '/plugins', legacyPages.plugins, { order: 90, section: 'Plugins', adminOnly: true }),
  entry('plugin-browse', 'Find Plugins', Download, '/plugins/browse', legacyPages.pluginBrowse, { order: 91, section: 'Plugins', adminOnly: true }),
  entry('connect', 'Integrations', Webhook, '/connect', legacyPages.connect, { order: 100, section: 'System', adminOnly: true }),
  entry('logs', 'Logs', ScrollText, '/logs', legacyPages.logs, { order: 110, section: 'System', adminOnly: true, visible: logsVisible }),
  entry('log-view', 'Log', ScrollText, '/logs/:name', legacyPages.logView, { nav: false, adminOnly: true }),
  entry('settings', 'Settings', Settings, '/settings', legacyPages.settings, { order: 120, section: 'System' }),
];

// Every upstream page is also reachable at /classic/<path> (hidden from menus),
// so custom pages can offer a "Classic view" link via PageHeader.
const classic = pages
  .filter((p) => p.id !== 'log-view')
  .map((p) => ({
    ...p,
    id: `classic-${p.id}`,
    path: `/classic${p.path}`,
    nav: false,
    tab: undefined,
    priority: 0,
  }));

export default [...pages, ...classic];
