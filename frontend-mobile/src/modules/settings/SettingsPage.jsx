import React, { Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActionIcon, Box, Text } from '@mantine/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ErrorBoundary, USER_LEVELS, getVisibleSettingsGroups, useAuthStore } from '@core/upstream';
import { ListRow, PageHeader, PageLoader, useIsDesktop } from '@core/ui';

// Upstream "Navigation" orders upstream's sidebar, which this UI doesn't use.
const HIDDEN = new Set(['nav-order']);

/**
 * Settings index built from upstream's settingsNav config, so new upstream
 * settings sections show up here automatically. Each section renders the
 * upstream form component unchanged.
 */
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.user_level >= USER_LEVELS.ADMIN;
  const { hash } = useLocation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const groups = getVisibleSettingsGroups(isAdmin)
    .map((g) => ({ ...g, sections: g.sections.filter((s) => !HIDDEN.has(s.id)) }))
    .filter((g) => g.sections.length);
  const all = groups.flatMap((g) => g.sections);
  const activeId = hash.replace('#', '') || (isDesktop ? all[0]?.id : null);
  const active = all.find((s) => s.id === activeId);

  const index = (
    <Box>
      {groups.map((g) => (
        <Box key={g.id} mb="md">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={6} px={4}>
            {g.label}
          </Text>
          <div className="dm-list">
            {g.sections.map((s) => (
              <ListRow
                key={s.id}
                active={isDesktop && s.id === activeId}
                onClick={() => navigate(`/settings#${s.id}`)}
                leading={s.icon ? <s.icon size={20} opacity={0.75} /> : null}
                title={s.label}
                trailing={!isDesktop && <ChevronRight size={18} opacity={0.5} />}
              />
            ))}
          </div>
        </Box>
      ))}
    </Box>
  );

  const section = active && (
    <ErrorBoundary inline>
      <Suspense fallback={<PageLoader />}>
        <active.Component active />
      </Suspense>
    </ErrorBoundary>
  );

  if (isDesktop) {
    return (
      <>
        <PageHeader title="Settings" />
        <div className="dm-page-body dm-settings">
          <aside className="dm-settings__nav">{index}</aside>
          <section className="dm-settings__body dm-card">
            {active && (
              <Text fw={700} size="lg" mb="md">
                {active.label}
              </Text>
            )}
            {section}
          </section>
        </div>
      </>
    );
  }

  return active ? (
    <>
      <PageHeader
        title={active.label}
        actions={
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => navigate('/settings')} aria-label="Back to settings">
            <ChevronLeft size={22} />
          </ActionIcon>
        }
      />
      <div className="dm-page-body dm-legacy-body">{section}</div>
    </>
  ) : (
    <>
      <PageHeader title="Settings" />
      <div className="dm-page-body">{index}</div>
    </>
  );
}
