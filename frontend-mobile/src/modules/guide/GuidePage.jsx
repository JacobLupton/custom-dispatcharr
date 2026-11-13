import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ActionIcon, Badge, Box, Button, Group, Loader, Stack, Text, UnstyledButton } from '@mantine/core';
import { Circle, LayoutGrid, Play, RefreshCw } from 'lucide-react';
import {
  API,
  ProgramDetailModal,
  appendWindowParams,
  buildChannelIdMap,
  canManageDvr,
  fetchPrograms,
  getShowVideoUrl,
  mapProgramsByChannel,
  showNotification,
  sortChannels,
  useAuthStore,
  useChannelsStore,
  useEPGsStore,
  useSettingsStore,
  useVideoStore,
} from '@core/upstream';
import {
  ChannelLogo,
  ChipScroller,
  EmptyState,
  InfiniteSentinel,
  PageHeader,
  SearchInput,
  Sheet,
  fmtTime,
  useNow,
} from '@core/ui';

const HOUR = 3600 * 1000;
const SLOT = 30 * 60 * 1000;
const RENDER_STEP = 60;

const atTime = (list, t) => list?.find((p) => p.startMs <= t && p.endMs > t);
const after = (list, p) => (p ? list?.find((x) => x.startMs >= p.endMs) : null);

const slotLabel = (ms, now) => {
  if (ms <= now) return 'Now';
  const d = new Date(ms);
  const today = new Date(now).toDateString() === d.toDateString();
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return today ? t : `${d.toLocaleDateString([], { weekday: 'short' })} ${t}`;
};

export default function GuidePage() {
  const user = useAuthStore((s) => s.user);
  const canRecord = canManageDvr(user);
  const tvgsById = useEPGsStore((s) => s.tvgsById);
  const epgs = useEPGsStore((s) => s.epgs);
  const channelGroups = useChannelsStore((s) => s.channelGroups);
  const selectedProfileId = useChannelsStore((s) => s.selectedProfileId);
  const recordings = useChannelsStore((s) => s.recordings);
  const fetchRecordings = useChannelsStore((s) => s.fetchRecordings);
  const envMode = useSettingsStore((s) => s.environment?.env_mode);
  const showVideo = useVideoStore((s) => s.showVideo);
  const now = useNow(60000);

  const [channels, setChannels] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const [slot, setSlot] = useState(0); // 0 = now
  const [limit, setLimit] = useState(RENDER_STEP);
  const [openChannel, setOpenChannel] = useState(null);
  const [detail, setDetail] = useState(null); // { program, channel }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams();
      const programParams = new URLSearchParams();
      if (selectedProfileId && selectedProfileId !== '0') {
        params.set('channel_profile_id', selectedProfileId);
        programParams.set('channel_profile_id', selectedProfileId);
      }
      const start = Date.now() - HOUR;
      appendWindowParams(programParams, start, start + 25 * HOUR);
      const [ch, progs] = await Promise.all([
        API.getChannelsSummary(params),
        fetchPrograms(programParams).catch(() => []),
      ]);
      if (cancelled) return;
      setChannels(sortChannels(ch || []));
      setPrograms(progs || []);
      setLoading(false);
    })();
    if (canRecord) fetchRecordings?.();
    return () => {
      cancelled = true;
    };
  }, [selectedProfileId, reload, canRecord, fetchRecordings]);

  const programsByChannel = useMemo(
    () => mapProgramsByChannel(programs, buildChannelIdMap(channels, tvgsById, epgs)),
    [programs, channels, tvgsById, epgs]
  );

  const recordedProgramIds = useMemo(() => {
    const set = new Set();
    for (const r of recordings || []) {
      const pid = r?.custom_properties?.program?.id;
      if (pid) set.add(pid);
    }
    return set;
  }, [recordings]);

  const groupItems = useMemo(() => {
    const ids = new Set(channels.map((c) => c.channel_group_id));
    const groups = Object.values(channelGroups || {})
      .filter((g) => ids.has(g.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [{ value: 'all', label: 'All' }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))];
  }, [channels, channelGroups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter(
      (c) =>
        (group === 'all' || String(c.channel_group_id) === group) &&
        (!q || c.name?.toLowerCase().includes(q) || String(c.channel_number ?? '').startsWith(q))
    );
  }, [channels, search, group]);

  useEffect(() => setLimit(RENDER_STEP), [search, group]);

  const slots = useMemo(() => {
    const base = Math.floor(now / SLOT) * SLOT;
    return Array.from({ length: 48 }, (_, i) => (i === 0 ? now : base + i * SLOT));
  }, [now]);
  const t = slot === 0 ? now : slots[slot] ?? now;
  const slotItems = slots.map((ms, i) => ({ value: String(i), label: slotLabel(ms, now) }));

  const play = useCallback(
    (ch) => showVideo(getShowVideoUrl(ch, envMode), 'live', { name: ch.name }),
    [showVideo, envMode]
  );

  const record = async (program, channel) => {
    await API.createRecording({
      channel: `${channel.id}`,
      start_time: program.start_time,
      end_time: program.end_time,
      custom_properties: { program },
    });
    showNotification({ title: 'Recording scheduled', message: program.title });
    fetchRecordings?.();
  };

  const schedule = openChannel ? programsByChannel.get(openChannel.id) || [] : [];

  return (
    <>
      <PageHeader
        title="TV Guide"
        subtitle={slot === 0 ? 'On now' : `On at ${slotLabel(t, now)}`}
        actions={
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => setReload((r) => r + 1)} aria-label="Refresh guide">
            <RefreshCw size={18} />
          </ActionIcon>
        }
      >
        <Stack gap={8}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search channels" delay={150} />
          <ChipScroller items={slotItems} value={String(slot)} onChange={(v) => setSlot(Number(v))} />
          {groupItems.length > 2 && <ChipScroller items={groupItems} value={group} onChange={setGroup} />}
        </Stack>
      </PageHeader>

      <div className="dm-page-body">
        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : filtered.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="Nothing to show" message="No channels match, or no guide data is loaded yet." />
        ) : (
          <div className="dm-list">
            {filtered.slice(0, limit).map((ch) => {
              const list = programsByChannel.get(ch.id);
              const cur = atTime(list, t);
              const next = after(list, cur);
              const pct = cur ? ((t - cur.startMs) / (cur.endMs - cur.startMs)) * 100 : null;
              return (
                <UnstyledButton key={ch.id} className="dm-row" onClick={() => setOpenChannel(ch)}>
                  <Group wrap="nowrap" gap="sm">
                    <span className="dm-chnum">{ch.channel_number ?? '–'}</span>
                    <ChannelLogo logoId={ch.logo_id} size={40} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="xs" c="dimmed" truncate>
                        {ch.name}
                      </Text>
                      <Group gap={6} wrap="nowrap">
                        <Text fw={600} size="sm" truncate>
                          {cur?.title || 'No information'}
                        </Text>
                        {cur && recordedProgramIds.has(cur.id) && <Circle size={9} fill="var(--mantine-color-red-6)" color="var(--mantine-color-red-6)" />}
                      </Group>
                      {cur && (
                        <div className="dm-progress">
                          <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                        </div>
                      )}
                      {next && (
                        <Text size="xs" c="dimmed" truncate mt={3}>
                          Next {fmtTime(next.startMs)} · {next.title}
                        </Text>
                      )}
                    </Box>
                    <ActionIcon
                      variant="light"
                      radius="xl"
                      size={38}
                      onClick={(e) => {
                        e.stopPropagation();
                        play(ch);
                      }}
                      aria-label={`Play ${ch.name}`}
                    >
                      <Play size={16} fill="currentColor" />
                    </ActionIcon>
                  </Group>
                </UnstyledButton>
              );
            })}
          </div>
        )}
        <InfiniteSentinel onReach={() => setLimit((l) => l + RENDER_STEP)} disabled={limit >= filtered.length} />
      </div>

      <Sheet opened={!!openChannel} onClose={() => setOpenChannel(null)} title={openChannel?.name} size="lg">
        {openChannel && (
          <Stack gap="sm">
            <Button leftSection={<Play size={16} fill="currentColor" />} onClick={() => play(openChannel)}>
              Watch live
            </Button>
            {schedule.length === 0 && (
              <Text c="dimmed" size="sm" ta="center" py="md">
                No guide data for this channel.
              </Text>
            )}
            <div className="dm-list">
              {schedule
                .filter((p) => p.endMs > now)
                .map((p) => {
                  const live = p.startMs <= now && p.endMs > now;
                  return (
                    <UnstyledButton key={`${p.id}-${p.startMs}`} className="dm-row" onClick={() => setDetail({ program: p, channel: openChannel })}>
                      <Group wrap="nowrap" align="flex-start" gap="sm">
                        <Text size="xs" c={live ? 'blue.4' : 'dimmed'} w={62} fw={600} style={{ flexShrink: 0 }}>
                          {live ? 'NOW' : fmtTime(p.startMs)}
                        </Text>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={6} wrap="nowrap">
                            <Text size="sm" fw={600} truncate>
                              {p.title}
                            </Text>
                            {recordedProgramIds.has(p.id) && (
                              <Badge size="xs" color="red" variant="light">
                                REC
                              </Badge>
                            )}
                          </Group>
                          {(p.sub_title || p.description) && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                              {p.sub_title || p.description}
                            </Text>
                          )}
                        </Box>
                      </Group>
                    </UnstyledButton>
                  );
                })}
            </div>
          </Stack>
        )}
      </Sheet>

      {detail && (
        <Suspense fallback={null}>
          <ProgramDetailModal
            program={detail.program}
            channel={detail.channel}
            opened
            onClose={() => setDetail(null)}
            onRecord={canRecord ? (p) => record(p, detail.channel) : undefined}
          />
        </Suspense>
      )}
    </>
  );
}
