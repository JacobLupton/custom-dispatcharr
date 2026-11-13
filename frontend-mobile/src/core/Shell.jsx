import React, { Suspense, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Box, Group, Image, SimpleGrid, Text, UnstyledButton } from '@mantine/core';
import { LogOut, Menu } from 'lucide-react';
import logo from '@upstream/images/logo.png';
import { ErrorBoundary, useAuthStore, useSettingsStore } from '@core/upstream';
import { menuModules, navTarget, tabModules, visibleModules } from '@core/registry';
import { ClassicPathContext, PageLoader, Sheet } from '@core/ui';

const groupBySection = (mods) => {
  const sections = new Map();
  for (const m of mods) {
    const key = m.section || 'General';
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key).push(m);
  }
  return [...sections.entries()];
};

const isActive = (pathname, m) => {
  const target = navTarget(m);
  return target && (pathname === target || pathname.startsWith(`${target}/`));
};

export default function Shell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const version = useSettingsStore((s) => s.version);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const all = useMemo(() => menuModules(user), [user]);
  const tabs = useMemo(() => tabModules(user), [user]);
  const sections = useMemo(() => groupBySection(all), [all]);
  // Offer "Classic view" when a custom page replaces an upstream one.
  const classicPath = useMemo(() => {
    if (pathname.startsWith('/classic/')) return null;
    const current = all.find((m) => isActive(pathname, m));
    if (!current || current.priority === -100) return null;
    const target = `/classic${navTarget(current)}`;
    return visibleModules(user).some((m) => m.path === target) ? target : null;
  }, [pathname, all, user]);

  const moreActive = !tabs.some((m) => isActive(pathname, m));
  const home = tabs[0] ? navTarget(tabs[0]) : navTarget(all[0]) || '/channels';

  const go = (path) => {
    setMoreOpen(false);
    navigate(path);
  };

  return (
    <div className="dm-app">
      <aside className="dm-sidebar">
        <Group gap="xs" px="md" py="md">
          <Image src={logo} w={28} h={28} alt="" />
          <Text fw={700}>Dispatcharr</Text>
        </Group>
        <nav className="dm-sidebar__nav">
          {sections.map(([section, mods]) => (
            <div key={section} className="dm-sidebar__section">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="md" pt="sm" pb={4}>
                {section}
              </Text>
              {mods.map((m) => (
                <NavLink
                  key={m.id}
                  to={navTarget(m)}
                  className={() => `dm-sidebar__link ${isActive(pathname, m) ? 'is-active' : ''}`}
                >
                  {m.icon && <m.icon size={18} />}
                  <span>{m.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <UnstyledButton className="dm-sidebar__link dm-sidebar__logout" onClick={logout}>
          <LogOut size={18} />
          <span>Sign out {user?.username ? `(${user.username})` : ''}</span>
        </UnstyledButton>
      </aside>

      <main className="dm-main">
        <ClassicPathContext.Provider value={classicPath}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {visibleRoutes(user).map((m) => (
              <Route
                key={m.id}
                path={m.path}
                element={
                  <ErrorBoundary name={m.id}>
                    <m.component />
                  </ErrorBoundary>
                }
              />
            ))}
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </Suspense>
        </ClassicPathContext.Provider>
      </main>

      <nav className="dm-tabbar" aria-label="Main">
        {tabs.map((m) => (
          <NavLink
            key={m.id}
            to={navTarget(m)}
            className={() => `dm-tab ${isActive(pathname, m) ? 'is-active' : ''}`}
          >
            {m.icon && <m.icon size={22} />}
            <span>{m.shortLabel || m.label}</span>
          </NavLink>
        ))}
        <button type="button" className={`dm-tab ${moreActive ? 'is-active' : ''}`} onClick={() => setMoreOpen(true)}>
          <Menu size={22} />
          <span>More</span>
        </button>
      </nav>

      <Sheet opened={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        {sections.map(([section, mods]) => (
          <Box key={section} mb="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={6}>
              {section}
            </Text>
            <SimpleGrid cols={3} spacing="xs">
              {mods.map((m) => (
                <UnstyledButton
                  key={m.id}
                  className={`dm-tile ${isActive(pathname, m) ? 'is-active' : ''}`}
                  onClick={() => go(navTarget(m))}
                >
                  {m.icon && <m.icon size={22} />}
                  <Text size="xs" ta="center" lineClamp={2}>
                    {m.label}
                  </Text>
                </UnstyledButton>
              ))}
            </SimpleGrid>
          </Box>
        ))}
        <UnstyledButton className="dm-sheet-action" onClick={logout}>
          <Group gap="md">
            <LogOut size={20} />
            <Text size="sm">Sign out {user?.username ? `(${user.username})` : ''}</Text>
          </Group>
        </UnstyledButton>
        {version?.version && (
          <Text size="xs" c="dimmed" ta="center" mt="sm">
            Dispatcharr {version.version} · custom UI
          </Text>
        )}
      </Sheet>
    </div>
  );
}

// Routes include modules hidden from menus (nav: false), e.g. /logs/:name.
const visibleRoutes = (user) => visibleModules(user).filter((m) => m.path && m.component);
