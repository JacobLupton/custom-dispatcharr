import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Badge, Box, Button, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { Copy, Pencil, Play, Plus, RefreshCw, Trash2, Tv, Zap } from 'lucide-react';
import {
  API,
  ChannelForm,
  USER_LEVELS,
  getShowVideoUrl,
  showNotification,
  useAuthStore,
  useChannelsStore,
  useSettingsStore,
  useVideoStore,
} from '@core/upstream';
import {
  ChannelLogo,
  ChipScroller,
  EmptyState,
  InfiniteSentinel,
  ListRow,
  PageHeader,
  Sheet,
  SheetAction,
  SearchInput,
  StatusDot,
  fmtTime,
  useNow,
} from '@core/ui';

const PAGE_SIZE = 60;

function useCurrentPrograms(channels) {
  const [byUuid, setByUuid] = useState({});
  const fetched = useRef(new Set());
  useEffect(() => {
    const missing = channels.map((c) => c.uuid).filter((u) => !fetched.current.has(u));
    if (!missing.length) return;
    missing.forEach((u) => fetched.current.add(u));
    API.getCurrentPrograms(missing).then((list) => {
      if (!Array.isArray(list)) return;
      setByUuid((prev) => {
        const next = { ...prev };
        for (const p of list) if (p.channel_uuid) next[p.channel_uuid] = p;
        return next;
      });
    });
  }, [channels]);
  // Refresh "now playing" every 5 minutes.
  useEffect(() => {
    const t = setInterval(() => {
      fetched.current = new Set();
      setByUuid({});
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return byUuid;
}

// Prefer backend-resolved override values, like upstream's ChannelsTable.
export const eff = (ch) => ({
  ...ch,
  name: ch.effective_name ?? ch.name,
  channel_number: ch.effective_channel_number ?? ch.channel_number,
  channel_group_id: ch.effective_channel_group_id ?? ch.channel_group_id,
  logo_id: ch.effective_logo_id ?? ch.logo_id,
});

const progressPct = (prog, now) => {
  if (!prog?.start_time || !prog?.end_time) return null;
  const s = new Date(prog.start_time).getTime();
  const e = new Date(prog.end_time).getTime();
  if (!(e > s)) return null;
  return Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
};

export default function ChannelsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.user_level >= USER_LEVELS.ADMIN;
  const channelGroups = useChannelsStore((s) => s.channelGroups);
  const profiles = useChannelsStore((s) => s.profiles);
  const selectedProfileId = useChannelsStore((s) => s.selectedProfileId);
  const setSelectedProfileId = useChannelsStore((s) => s.setSelectedProfileId);
  const activeChannels = useChannelsStore((s) => s.activeChannels);
  const envMode = useSettingsStore((s) => s.environment?.env_mode);
  const showVideo = useVideoStore((s) => s.showVideo);
  const now = useNow(30000);

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryKey = `${search}|${group}|${selectedProfileId}|${reloadKey}`;
  const keyRef = useRef(queryKey);

  const groupItems = useMemo(() => {
    const groups = Object.values(channelGroups || {})
      .filter((g) => g?.hasChannels)
      .sort((a, b) => a.name.localeCompare(b.name));
    return [{ value: 'all', label: 'All' }, ...groups.map((g) => ({ value: g.name, label: g.name }))];
  }, [channelGroups]);

  const profileOptions = useMemo(
    () => Object.values(profiles || {}).map((p) => ({ value: String(p.id), label: p.name })),
    [profiles]
  );

  const load = useCallback(
    async (pageNum, key) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        page_size: String(PAGE_SIZE),
        ordering: 'channel_number',
        include_streams: 'false',
      });
      if (search) params.set('search', search);
      if (group !== 'all') params.set('channel_group', group);
      if (selectedProfileId && selectedProfileId !== '0') params.set('channel_profile_id', selectedProfileId);
      const res = await API.queryChannels(params);
      if (keyRef.current !== key) return;
      const results = Array.isArray(res?.results) ? res.results.map(eff) : [];
      setItems((prev) => (pageNum === 1 ? results : [...prev, ...results]));
      setTotal(res?.count ?? 0);
      setLoading(false);
    },
    [search, group, selectedProfileId]
  );

  useEffect(() => {
    keyRef.current = queryKey;
    setPage(1);
    load(1, queryKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const loadMore = useCallback(() => {
    if (loading || items.length >= total) return;
    const next = page + 1;
    setPage(next);
    load(next, keyRef.current);
  }, [loading, items.length, total, page, load]);

  const programs = useCurrentPrograms(items);

  const play = (ch) => {
    setSelected(null);
    showVideo(getShowVideoUrl(ch, envMode), 'live', { name: ch.name, logo: ch.logo_id });
  };

  const copyUrl = async (ch) => {
    const url = `${window.location.origin}/proxy/ts/stream/${ch.uuid}`;
    try {
      await navigator.clipboard.writeText(url);
      showNotification({ title: 'Stream URL copied' });
    } catch {
      showNotification({ title: 'Stream URL', message: url, autoClose: false });
    }
  };

  const openEdit = async (ch) => {
    setSelected(null);
    const full = await API.getChannel(ch.id);
    if (full) setEditing(full);
  };

  const remove = async (ch) => {
    await API.deleteChannel(ch.id);
    setConfirmDelete(false);
    setSelected(null);
    setReloadKey((k) => k + 1);
  };

  const sel = selected;
  const selProgram = sel ? programs[sel.uuid] : null;

  return (
    <>
      <PageHeader
        title="Channels"
        subtitle={total ? `${total.toLocaleString()} channels` : undefined}
        actions={
          <>
            {profileOptions.length > 1 && (
              <Select
                size="xs"
                w={120}
                data={profileOptions}
                value={String(selectedProfileId)}
                onChange={(v) => v && setSelectedProfileId(v)}
                allowDeselect={false}
                aria-label="Channel profile"
              />
            )}
            <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => setReloadKey((k) => k + 1)} aria-label="Refresh">
              <RefreshCw size={18} />
            </ActionIcon>
          </>
        }
      >
        <Stack gap={8}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search channels or groups" />
          {groupItems.length > 1 && <ChipScroller items={groupItems} value={group} onChange={setGroup} />}
        </Stack>
      </PageHeader>

      <div className="dm-page-body">
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={Tv}
            title="No channels"
            message={search || group !== 'all' ? 'Nothing matches these filters.' : 'Add an M3U source, then create channels from its streams.'}
          />
        ) : (
          <div className="dm-list">
            {items.map((ch) => {
              const prog = programs[ch.uuid];
              const pct = progressPct(prog, now);
              const live = !!activeChannels?.[ch.uuid];
              return (
                <ListRow
                  key={ch.id}
                  onClick={() => setSelected(ch)}
                  leading={
                    <>
                      <span className="dm-chnum">{ch.channel_number ?? '–'}</span>
                      <ChannelLogo logoId={ch.logo_id} />
                    </>
                  }
                  title={ch.name}
                  meta={live && <StatusDot color="green" pulse />}
                  subtitle={prog?.title || (prog?.parsing ? 'Loading guide…' : channelGroups?.[ch.channel_group_id]?.name || '')}
                  trailing={
                    <ActionIcon
                      variant="light"
                      radius="xl"
                      size={40}
                      onClick={(e) => {
                        e.stopPropagation();
                        play(ch);
                      }}
                      aria-label={`Play ${ch.name}`}
                    >
                      <Play size={18} fill="currentColor" />
                    </ActionIcon>
                  }
                >
                  {pct !== null && (
                    <div className="dm-progress">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </ListRow>
              );
            })}
          </div>
        )}
        {loading && (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        )}
        <InfiniteSentinel onReach={loadMore} disabled={loading || items.length >= total} />
      </div>

      {isAdmin && (
        <ActionIcon className="dm-fab" size={56} radius="xl" onClick={() => setEditing(null)} aria-label="Add channel">
          <Plus size={26} />
        </ActionIcon>
      )}

      <Sheet opened={!!sel} onClose={() => { setSelected(null); setConfirmDelete(false); }} title={sel?.name}>
        {sel && (
          <Stack gap="sm">
            <Group wrap="nowrap" align="flex-start">
              <ChannelLogo logoId={sel.logo_id} size={64} />
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Group gap={6}>
                  {sel.channel_number != null && <Badge variant="light">#{sel.channel_number}</Badge>}
                  {activeChannels?.[sel.uuid] && (
                    <Badge color="green" variant="light" leftSection={<Zap size={10} />}>
                      Streaming
                    </Badge>
                  )}
                </Group>
                {selProgram?.title ? (
                  <>
                    <Text fw={600} mt={6}>
                      {selProgram.title}
                    </Text>
                    {selProgram.start_time && (
                      <Text size="xs" c="dimmed">
                        {fmtTime(new Date(selProgram.start_time).getTime())} – {fmtTime(new Date(selProgram.end_time).getTime())}
                      </Text>
                    )}
                    {selProgram.description && (
                      <Text size="sm" c="dimmed" mt={4} lineClamp={4}>
                        {selProgram.description}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text size="sm" c="dimmed" mt={6}>
                    No guide data
                  </Text>
                )}
              </Box>
            </Group>
            <Button size="md" leftSection={<Play size={18} fill="currentColor" />} onClick={() => play(sel)} fullWidth>
              Watch now
            </Button>
            <Box>
              <SheetAction icon={Copy} label="Copy stream URL" description="Open in VLC or another player" onClick={() => copyUrl(sel)} />
              {isAdmin && <SheetAction icon={Pencil} label="Edit channel" description="Name, number, group, EPG, logo, streams" onClick={() => openEdit(sel)} />}
              {isAdmin &&
                (confirmDelete ? (
                  <Group grow mt="xs">
                    <Button variant="default" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                    <Button color="red" onClick={() => remove(sel)}>
                      Delete
                    </Button>
                  </Group>
                ) : (
                  <SheetAction icon={Trash2} color="red" label="Delete channel" onClick={() => setConfirmDelete(true)} />
                ))}
            </Box>
          </Stack>
        )}
      </Sheet>

      {editing !== undefined && (
        <Suspense fallback={null}>
          <ChannelForm
            channel={editing}
            isOpen
            onClose={() => {
              setEditing(undefined);
              setReloadKey((k) => k + 1);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
