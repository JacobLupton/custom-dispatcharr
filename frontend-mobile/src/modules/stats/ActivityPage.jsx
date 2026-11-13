import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionIcon, Badge, Box, Button, Collapse, Group, SegmentedControl, SimpleGrid, Stack, Text } from '@mantine/core';
import { Activity, ChevronDown, Film, Square, Tv, UserX } from 'lucide-react';
import {
  API,
  formatBytes,
  useChannelsStore,
  useUsersStore,
} from '@core/upstream';
import { ChannelLogo, EmptyState, PageHeader, StatusDot, fmtDuration } from '@core/ui';

const POLL_OPTIONS = [
  { value: '3', label: '3s' },
  { value: '5', label: '5s' },
  { value: '15', label: '15s' },
  { value: '0', label: 'Off' },
];

const shortUA = (ua) => {
  if (!ua || ua === 'unknown') return 'Unknown client';
  const m = ua.match(/(VLC|Kodi|TiviMate|Plex|Jellyfin|Emby|Chrome|Firefox|Safari|Edg|ffmpeg|Lavf|okhttp|IPTV[^/ ]*)/i);
  return m ? m[1] : ua.slice(0, 40);
};

function StatTile({ label, value }) {
  return (
    <div className="dm-stat">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="lg">
        {value}
      </Text>
    </div>
  );
}

function ClientRow({ name, ua, ip, since, onStop }) {
  return (
    <Group wrap="nowrap" gap="sm" py={8} style={{ borderTop: '1px solid var(--dm-border)' }}>
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={500} truncate>
          {name || ip || 'Client'}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {[shortUA(ua), name ? ip : null, since ? `${fmtDuration(Date.now() / 1000 - since)}` : null].filter(Boolean).join(' · ')}
        </Text>
      </Box>
      <ActionIcon variant="light" color="red" size="lg" onClick={onStop} aria-label="Disconnect client">
        <UserX size={16} />
      </ActionIcon>
    </Group>
  );
}

export default function ActivityPage() {
  const setChannelStats = useChannelsStore((s) => s.setChannelStats);
  const setVodStats = useChannelsStore((s) => s.setVodStats);
  const users = useUsersStore((s) => s.users);
  const [live, setLive] = useState([]);
  const [vod, setVod] = useState([]);
  const [catchup, setCatchup] = useState([]);
  const [interval, setIntervalSec] = useState(() => localStorage.getItem('dm-activity-poll') || '5');
  const [open, setOpen] = useState({});
  const [loaded, setLoaded] = useState(false);

  const userName = useCallback(
    (id) => (id && id !== '0' ? users.find((u) => String(u.id) === String(id))?.username : null),
    [users]
  );

  const refresh = useCallback(async () => {
    const res = await API.getAllConnectionStats();
    if (!res) return;
    if (res.live) {
      setChannelStats(res.live);
      setLive(res.live.channels || []);
    }
    if (res.vod) {
      setVodStats(res.vod);
      setVod(res.vod.vod_connections || []);
    }
    if (res.catchup) setCatchup(res.catchup.sessions || res.catchup.timeshift_sessions || []);
    setLoaded(true);
  }, [setChannelStats, setVodStats]);

  useEffect(() => {
    refresh();
    const sec = Number(interval);
    if (!sec) return undefined;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, sec * 1000);
    return () => clearInterval(t);
  }, [interval, refresh]);

  const totals = useMemo(() => {
    const liveClients = live.reduce((n, c) => n + (c.client_count ?? c.clients?.length ?? 0), 0);
    const vodClients = vod.reduce((n, c) => n + (c.connection_count ?? c.connections?.length ?? 0), 0);
    const bitrate = live.reduce((n, c) => n + (Number(c.avg_bitrate_kbps ?? c.avg_bitrate) || 0), 0);
    return { liveClients, vodClients, bitrate };
  }, [live, vod]);

  const stopChannel = async (uuid) => {
    await API.stopChannel(uuid);
    refresh();
  };
  const stopClient = async (uuid, clientId) => {
    await API.stopClient(uuid, clientId);
    refresh();
  };
  const stopVod = async (clientId) => {
    await API.stopVODClient(clientId);
    refresh();
  };

  const nothing = loaded && !live.length && !vod.length && !catchup.length;

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="Live streams and connected clients"
        actions={
          <SegmentedControl
            size="xs"
            data={POLL_OPTIONS}
            value={interval}
            onChange={(v) => {
              setIntervalSec(v);
              localStorage.setItem('dm-activity-poll', v);
            }}
            aria-label="Refresh interval"
          />
        }
      />
      <div className="dm-page-body">
        <SimpleGrid cols={{ base: 3, sm: 3 }} spacing="xs" mb="md">
          <StatTile label="Channels" value={live.length} />
          <StatTile label="Viewers" value={totals.liveClients + totals.vodClients} />
          <StatTile label="VOD" value={vod.length} />
        </SimpleGrid>

        {nothing && <EmptyState icon={Activity} title="Nothing is streaming" message="Active channels and viewers show up here." />}

        <div className="dm-grid">
          {live.map((ch) => {
            const uuid = ch.channel_id;
            const isOpen = open[uuid] ?? true;
            const clients = ch.clients || [];
            const bitrate = ch.avg_bitrate_kbps ?? ch.avg_bitrate;
            return (
              <div key={uuid} className="dm-card">
                <Group wrap="nowrap" gap="sm" align="flex-start">
                  <ChannelLogo logoId={ch.logo_id} size={48} />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6} wrap="nowrap">
                      <StatusDot color={ch.state === 'active' || !ch.state ? 'green' : 'yellow'} pulse />
                      <Text fw={600} truncate>
                        {ch.channel_name || ch.name || 'Channel'}
                      </Text>
                    </Group>
                    <Group gap={6} mt={4}>
                      <Badge size="xs" variant="light" leftSection={<Tv size={10} />}>
                        {fmtDuration(ch.uptime)}
                      </Badge>
                      {ch.resolution && <Badge size="xs" variant="light" color="gray">{ch.resolution}</Badge>}
                      {ch.video_codec && <Badge size="xs" variant="light" color="gray">{String(ch.video_codec).toUpperCase()}</Badge>}
                      {bitrate ? <Badge size="xs" variant="light" color="gray">{Math.round(bitrate)} kbps</Badge> : null}
                      {ch.total_bytes ? <Badge size="xs" variant="light" color="gray">{formatBytes(ch.total_bytes)}</Badge> : null}
                      {ch.stream_profile && <Badge size="xs" variant="light" color="gray">{ch.stream_profile}</Badge>}
                    </Group>
                  </Box>
                </Group>
                <Group mt="sm" gap="xs" grow>
                  <Button
                    variant="default"
                    size="sm"
                    rightSection={<ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />}
                    onClick={() => setOpen((o) => ({ ...o, [uuid]: !isOpen }))}
                  >
                    {clients.length || ch.client_count || 0} viewer{(clients.length || ch.client_count) === 1 ? '' : 's'}
                  </Button>
                  <Button color="red" variant="light" size="sm" leftSection={<Square size={14} />} onClick={() => stopChannel(uuid)}>
                    Stop
                  </Button>
                </Group>
                <Collapse in={isOpen}>
                  <Stack gap={0} mt="xs">
                    {clients.map((c) => (
                      <ClientRow
                        key={c.client_id}
                        name={userName(c.user_id)}
                        ua={c.user_agent}
                        ip={c.ip_address}
                        since={c.connected_at}
                        onStop={() => stopClient(uuid, c.client_id)}
                      />
                    ))}
                  </Stack>
                </Collapse>
              </div>
            );
          })}

          {vod.map((v) => (
            <div key={`${v.content_type}:${v.content_uuid}`} className="dm-card">
              <Group wrap="nowrap" gap="sm">
                <ChannelLogo src={v.content_metadata?.logo_url || v.content_metadata?.poster} size={48} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={6} wrap="nowrap">
                    <Film size={14} />
                    <Text fw={600} truncate>
                      {v.content_name}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {v.content_type === 'episode' ? 'Episode' : 'Movie'} · {v.connection_count} viewer{v.connection_count === 1 ? '' : 's'}
                  </Text>
                </Box>
              </Group>
              <Stack gap={0} mt="xs">
                {(v.connections || []).map((c) => (
                  <ClientRow
                    key={c.client_id}
                    name={userName(c.user_id)}
                    ua={c.user_agent}
                    ip={c.client_ip}
                    since={c.connected_at ? Number(c.connected_at) : null}
                    onStop={() => stopVod(c.client_id)}
                  />
                ))}
              </Stack>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
