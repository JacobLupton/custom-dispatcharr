import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { ActionIcon, Badge, SegmentedControl, Text } from '@mantine/core';
import { Database, Plus, RefreshCw } from 'lucide-react';
import {
  API,
  RecordingDetailsModal,
  RecordingForm,
  canManageDvr,
  categorizeRecordings,
  getChannelLogoUrl,
  getPosterUrl,
  getRecordingUrl,
  getShowVideoUrl,
  useAuthStore,
  useChannelsStore,
  useSettingsStore,
  useTimeHelpers,
  useVideoStore,
} from '@core/upstream';
import { ChannelLogo, EmptyState, ListRow, PageHeader, SearchInput, StatusDot, useNow } from '@core/ui';

const statusBadge = (rec, tab) => {
  const st = rec.custom_properties?.status;
  if (tab === 'live') return <Badge size="xs" color="red" variant="filled">REC</Badge>;
  if (st === 'interrupted') return <Badge size="xs" color="orange" variant="light">Interrupted</Badge>;
  if (st === 'stopped') return <Badge size="xs" color="gray" variant="light">Stopped</Badge>;
  if (rec._group_count > 1) return <Badge size="xs" variant="light">{rec._group_count} episodes</Badge>;
  return null;
};

const when = (rec, toUserTime) => {
  const s = toUserTime(rec.start_time);
  const e = toUserTime(rec.end_time);
  return `${s.format('ddd MMM D · h:mm A')} – ${e.format('h:mm A')}`;
};

export default function DVRPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = canManageDvr(user);
  const recordings = useChannelsStore((s) => s.recordings);
  const fetchRecordings = useChannelsStore((s) => s.fetchRecordings);
  const envMode = useSettingsStore((s) => s.environment?.env_mode);
  const showVideo = useVideoStore((s) => s.showVideo);
  const { toUserTime, userNow } = useTimeHelpers();
  const tick = useNow(15000);

  const [channelsById, setChannelsById] = useState({});
  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [details, setDetails] = useState(null);
  const [editing, setEditing] = useState(undefined);

  useEffect(() => {
    fetchRecordings();
    API.getChannelsSummary().then((list) => {
      const byId = {};
      for (const ch of list || []) byId[ch.id] = ch;
      setChannelsById(byId);
    });
  }, [fetchRecordings]);

  const buckets = useMemo(
    () => categorizeRecordings(recordings, toUserTime, userNow()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recordings, toUserTime, tick]
  );

  // Default to "Recording" when something is live, else upcoming.
  useEffect(() => {
    if (buckets.inProgress.length) setTab((t) => (t === 'upcoming' ? 'live' : t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets.inProgress.length]);

  const list = { live: buckets.inProgress, upcoming: buckets.upcoming, done: buckets.completed }[tab] || [];
  const q = search.trim().toLowerCase();
  const shown = q
    ? list.filter((r) => {
        const p = r.custom_properties?.program || {};
        const ch = channelsById[r.channel];
        return [p.title, p.sub_title, ch?.name].some((v) => v?.toLowerCase().includes(q));
      })
    : list;

  const watchLive = () => {
    const ch = channelsById[details?.channel];
    if (ch) showVideo(getShowVideoUrl(ch, envMode), 'live', { name: ch.name });
  };
  const watchRecording = () => {
    const url = getRecordingUrl(details?.custom_properties, envMode);
    if (url) {
      showVideo(url, 'vod', {
        name: details.custom_properties?.program?.title || 'Recording',
        description: details.custom_properties?.program?.description,
      });
    }
  };

  return (
    <>
      <PageHeader
        title="DVR"
        subtitle={`${buckets.inProgress.length} recording · ${buckets.upcoming.length} scheduled · ${buckets.completed.length} recorded`}
        actions={
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => fetchRecordings()} aria-label="Refresh">
            <RefreshCw size={18} />
          </ActionIcon>
        }
      >
        <SegmentedControl
          fullWidth
          value={tab}
          onChange={setTab}
          data={[
            { value: 'live', label: `Recording${buckets.inProgress.length ? ` (${buckets.inProgress.length})` : ''}` },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'done', label: 'Recorded' },
          ]}
          mb={8}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search recordings" delay={150} />
      </PageHeader>

      <div className="dm-page-body">
        {shown.length === 0 ? (
          <EmptyState
            icon={Database}
            title={tab === 'live' ? 'Nothing recording' : tab === 'upcoming' ? 'Nothing scheduled' : 'No recordings yet'}
            message={tab === 'upcoming' ? 'Open the TV Guide, tap a program and choose Record.' : undefined}
          />
        ) : (
          <div className="dm-list">
            {shown.map((rec) => {
              const cp = rec.custom_properties || {};
              const p = cp.program || {};
              const ch = channelsById[rec.channel];
              const poster = getPosterUrl(cp.poster_logo_id, cp, getChannelLogoUrl(ch));
              return (
                <ListRow
                  key={rec.id}
                  onClick={() => setDetails(rec)}
                  leading={<ChannelLogo src={poster} size={52} />}
                  title={p.title || cp.title || 'Recording'}
                  meta={
                    <>
                      {tab === 'live' && <StatusDot color="red" pulse />}
                      {statusBadge(rec, tab)}
                    </>
                  }
                  subtitle={`${ch?.name ? `${ch.name} · ` : ''}${when(rec, toUserTime)}`}
                >
                  {p.sub_title && (
                    <Text size="xs" c="dimmed" truncate>
                      {p.sub_title}
                    </Text>
                  )}
                </ListRow>
              );
            })}
          </div>
        )}
      </div>

      {canManage && (
        <ActionIcon className="dm-fab" size={56} radius="xl" onClick={() => setEditing(null)} aria-label="Schedule recording">
          <Plus size={26} />
        </ActionIcon>
      )}

      <Suspense fallback={null}>
        {details && (
          <RecordingDetailsModal
            opened
            onClose={() => setDetails(null)}
            recording={details}
            channel={channelsById[details.channel]}
            posterUrl={getPosterUrl(
              details.custom_properties?.poster_logo_id,
              details.custom_properties,
              getChannelLogoUrl(channelsById[details.channel])
            )}
            env_mode={envMode}
            onWatchLive={watchLive}
            onWatchRecording={watchRecording}
            canManage={canManage}
            onEdit={
              canManage
                ? (rec) => {
                    setDetails(null);
                    setEditing(rec);
                  }
                : undefined
            }
          />
        )}
        {editing !== undefined && (
          <RecordingForm
            isOpen
            recording={editing || undefined}
            onClose={() => {
              setEditing(undefined);
              fetchRecordings();
            }}
          />
        )}
      </Suspense>
    </>
  );
}
