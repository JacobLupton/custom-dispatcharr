/**
 * Module registry.
 *
 * Every folder in src/modules/<name>/ with a `module.js` is a module. A module
 * default-exports a manifest:
 *
 *   export default {
 *     id: 'channels',            // unique; later modules with the same id win
 *     label: 'Channels',
 *     icon: ListOrdered,         // lucide-react icon
 *     path: '/channels',         // route (supports '/x/*' or params)
 *     nav: '/channels',          // link target in menus (defaults to path); false = hidden
 *     component: lazy(() => import('./Page')),
 *     adminOnly: true,           // hide from non-admin users
 *     visible: (user) => bool,   // optional; overrides adminOnly
 *     tab: 1,                    // position in the phone bottom bar (1-4); omit = "More" menu
 *     order: 10,                 // sort order in menus
 *     section: 'Media',          // grouping in the More sheet / desktop sidebar
 *     enabled: true,             // set false to switch a module off
 *     priority: 0,               // higher wins when two modules share an id
 *   }
 *
 * To replace a page: add a module with the same id and a higher priority.
 * To drop back to the stock Dispatcharr page: set `enabled: false` on the
 * custom module - modules/legacy provides the upstream page for every id at
 * priority -100, so it takes over automatically.
 */
const found = import.meta.glob('../modules/*/module.{js,jsx}', { eager: true });

const flatten = (mod) => {
  const value = mod.default ?? mod;
  return Array.isArray(value) ? value : [value];
};

const byId = new Map();
for (const mod of Object.values(found)) {
  for (const manifest of flatten(mod)) {
    if (!manifest || manifest.enabled === false) continue;
    const existing = byId.get(manifest.id);
    if (!existing || (manifest.priority ?? 0) > (existing.priority ?? 0)) {
      byId.set(manifest.id, manifest);
    }
  }
}

export const modules = [...byId.values()].sort(
  (a, b) => (a.order ?? 100) - (b.order ?? 100)
);

import { USER_LEVELS } from '@core/upstream';

export const isVisibleTo = (m, user) =>
  m.visible ? m.visible(user) : !m.adminOnly || user?.user_level >= USER_LEVELS.ADMIN;

export const visibleModules = (user) => modules.filter((m) => isVisibleTo(m, user));

export const navTarget = (m) => (m.nav === undefined ? m.path : m.nav);

export const tabModules = (user) =>
  visibleModules(user)
    .filter((m) => m.tab && navTarget(m))
    .sort((a, b) => a.tab - b.tab)
    .slice(0, 4);

export const menuModules = (user) => visibleModules(user).filter((m) => navTarget(m));
