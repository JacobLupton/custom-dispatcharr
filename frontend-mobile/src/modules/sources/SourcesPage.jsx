import React, { Suspense, useMemo, useState } from 'react';
import { ActionIcon, Badge, Box, Button, Group, Progress, SegmentedControl, Stack, Switch, Text } from '@mantine/core';
import { CalendarClock, ListVideo, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { API, EPGForm, M3UForm, useEPGsStore, usePlaylistsStore } from '@core/upstream';
import { EmptyState, ListRow, PageHeader, Sheet, SheetAction } from '@core/ui';

const ago = (iso) => {
  if (!iso) return 'never';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const statusColor = (st) =>
  ({ success: 'green', error: 'red', fetching: 'blue', parsing: 'blue', pending_setup: 'yellow', disabled: 'gray' })[st] || 'gray';

const progressLabel = (p) => {
  if (!p) return null;
  const pct = Math.round(Number(p.progress) || 0);
  if (p.status === 'success' || pct >= 100) return null;
  return { pct, label: `${p.action || 'Refreshing'}${pct ? ` · ${pct}%` : ''}` };
};

function SourceRow({ src, kind, progress, onOpen, onToggle }) {
  const prog = progressLabel(progress);
  const typeLabel =
    kind === 'm3u'
      ? src.account_type === 'XC'
        ? 'Xtream Codes'
        : 'M3U'
      : src.source_type === 'xmltv'
        ? 'XMLTV'
        : src.source_type === 'schedules_direct'
          ? 'Schedules Direct'
          : src.source_type === 'dummy'
            ? 'Dummy'
            : src.source_type;
  return (
    <ListRow
      onClick={onOpen}
      leading={kind === 'm3u' ? <ListVideo size={22} opacity={0.7} /> : <CalendarClock size={22} opacity={0.7} />}
      title={src.name}
      meta={
        src.status && src.status !== 'idle' ? (
          <Badge size="xs" variant="light" color={statusColor(src.status)}>
            {src.status}
          </Badge>
        ) : null
      }
      subtitle={`${typeLabel} · updated ${ago(src.updated_at)}`}
      trailing={
        <Switch
          checked={!!src.is_active}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle(e.currentTarget.checked)}
          aria-label={`Enable ${src.name}`}
          size="md"
        />
      }
    >
      {prog && (
        <>
          <Progress value={prog.pct} size="xs" mt={6} animated />
          <Text size="xs" c="dimmed" mt={2}>
            {prog.label}
          </Text>
        </>
      )}
      {!prog && src.status === 'error' && src.last_message && (
        <Text size="xs" c="red.4" lineClamp={2}>
          {src.last_message}
        </Text>
      )}
    </ListRow>
  );
}

export default function SourcesPage() {
  const playlists = usePlaylistsStore((s) => s.playlists);
  const m3uProgress = usePlaylistsStore((s) => s.refreshProgress);
  const fetchPlaylists = usePlaylistsStore((s) => s.fetchPlaylists);
  const epgMap = useEPGsStore((s) => s.epgs);
  const epgProgress = useEPGsStore((s) => s.refreshProgress);
  const fetchEPGs = useEPGsStore((s) => s.fetchEPGs);

  const [tab, setTab] = useState('m3u');
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(undefined); // undefined closed; null new

  const m3us = useMemo(
    () => (playlists || []).filter((p) => !p.locked).sort((a, b) => a.name.localeCompare(b.name)),
    [playlists]
  );
  const epgs = useMemo(() => Object.values(epgMap || {}).sort((a, b) => a.name.localeCompare(b.name)), [epgMap]);
  const list = tab === 'm3u' ? m3us : epgs;

  const toggle = (src, is_active) =>
    tab === 'm3u'
      ? API.updatePlaylist({ id: src.id, is_active }, true)
      : API.updateEPG({ id: src.id, is_active }, true).then(() => fetchEPGs());

  const refresh = async (src) => {
    if (tab === 'm3u') {
      usePlaylistsStore.getState().setRefreshProgress(src.id, { action: 'initializing', progress: 0, account: src.id });
      await API.refreshPlaylist(src.id);
    } else {
      await API.refreshEPG(src.id);
    }
    setSelected(null);
  };

  const refreshAll = async () => {
    if (tab === 'm3u') await API.refreshAllPlaylist();
    else await Promise.all(epgs.filter((e) => e.is_active && e.source_type !== 'dummy').map((e) => API.refreshEPG(e.id)));
  };

  const remove = async (src) => {
    if (tab === 'm3u') {
      await API.deletePlaylist(src.id);
      fetchPlaylists();
    } else {
      await API.deleteEPG(src.id);
      fetchEPGs();
    }
    setConfirmDelete(false);
    setSelected(null);
  };

  const openEdit = (src) => {
    setSelected(null);
    setEditing(src);
  };

  return (
    <>
      <PageHeader
        title="M3U & EPG"
        subtitle={`${m3us.length} playlists · ${epgs.length} guides`}
        actions={
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={refreshAll} aria-label="Refresh all">
            <RefreshCw size={18} />
          </ActionIcon>
        }
      >
        <SegmentedControl
          fullWidth
          value={tab}
          onChange={setTab}
          data={[
            { value: 'm3u', label: 'Playlists' },
            { value: 'epg', label: 'EPG' },
          ]}
        />
      </PageHeader>

      <div className="dm-page-body">
        {list.length === 0 ? (
          <EmptyState
            icon={tab === 'm3u' ? ListVideo : CalendarClock}
            title={tab === 'm3u' ? 'No playlists yet' : 'No EPG sources yet'}
            message={tab === 'm3u' ? 'Add an M3U URL or Xtream Codes account.' : 'Add an XMLTV URL or Schedules Direct account.'}
            action={
              <Button leftSection={<Plus size={16} />} onClick={() => setEditing(null)}>
                Add
              </Button>
            }
          />
        ) : (
          <div className="dm-list">
            {list.map((src) => (
              <SourceRow
                key={src.id}
                src={src}
                kind={tab}
                progress={(tab === 'm3u' ? m3uProgress : epgProgress)?.[src.id]}
                onOpen={() => setSelected(src)}
                onToggle={(v) => toggle(src, v)}
              />
            ))}
          </div>
        )}
        <Text size="xs" c="dimmed" ta="center" mt="md">
          Group filters, profiles and auto-sync live inside each playlist's editor.
        </Text>
      </div>

      <ActionIcon className="dm-fab" size={56} radius="xl" onClick={() => setEditing(null)} aria-label="Add source">
        <Plus size={26} />
      </ActionIcon>

      <Sheet opened={!!selected} onClose={() => { setSelected(null); setConfirmDelete(false); }} title={selected?.name}>
        {selected && (
          <Stack gap={0}>
            {selected.last_message && (
              <Box mb="sm">
                <Text size="xs" c="dimmed">
                  Last message
                </Text>
                <Text size="sm">{selected.last_message}</Text>
              </Box>
            )}
            <SheetAction icon={RefreshCw} label="Refresh now" onClick={() => refresh(selected)} disabled={tab === 'epg' && selected.source_type === 'dummy'} />
            <SheetAction
              icon={Pencil}
              label="Edit"
              description={tab === 'm3u' ? 'URL, credentials, groups, profiles, filters, schedule' : 'URL, schedule, settings'}
              onClick={() => openEdit(selected)}
            />
            {confirmDelete ? (
              <Group grow mt="xs">
                <Button variant="default" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button color="red" onClick={() => remove(selected)}>
                  Delete
                </Button>
              </Group>
            ) : (
              <SheetAction icon={Trash2} color="red" label="Delete" onClick={() => setConfirmDelete(true)} />
            )}
          </Stack>
        )}
      </Sheet>

      <Suspense fallback={null}>
        {editing !== undefined && tab === 'm3u' && (
          <M3UForm m3uAccount={editing} isOpen onClose={() => { setEditing(undefined); fetchPlaylists(); }} />
        )}
        {editing !== undefined && tab === 'epg' && (
          <EPGForm epg={editing} isOpen onClose={() => { setEditing(undefined); fetchEPGs(); }} />
        )}
      </Suspense>
    </>
  );
}
