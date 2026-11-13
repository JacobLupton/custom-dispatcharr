import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Group, Loader, SegmentedControl, Select, Stack, Text, UnstyledButton } from '@mantine/core';
import { Film } from 'lucide-react';
import {
  SeriesModal,
  VODModal,
  filterCategoriesToEnabled,
  getCategoryOptions,
  isVodMoviesEnabled,
  isVodSeriesEnabled,
  useAuthStore,
  useVODStore,
  vodLogoSrc,
} from '@core/upstream';
import { EmptyState, InfiniteSentinel, PageHeader, SearchInput } from '@core/ui';

const PAGE_SIZE = 36;

function Poster({ item, onClick }) {
  const [failed, setFailed] = useState(false);
  const src = vodLogoSrc(item.logo);
  return (
    <UnstyledButton className="dm-poster" onClick={onClick}>
      <div className="dm-poster__img">
        {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <Film size={28} opacity={0.4} />}
        {item.contentType === 'series' && (
          <Badge className="dm-poster__badge" size="xs" variant="filled" color="dark">
            Series
          </Badge>
        )}
      </div>
      <Text size="xs" fw={600} mt={6} lineClamp={2}>
        {item.name}
      </Text>
      <Text size="xs" c="dimmed">
        {[item.year, item.rating ? `★ ${item.rating}` : null].filter(Boolean).join(' · ')}
      </Text>
    </UnstyledButton>
  );
}

export default function VODsPage() {
  const user = useAuthStore((s) => s.user);
  const moviesOn = isVodMoviesEnabled(user);
  const seriesOn = isVodSeriesEnabled(user);
  const content = useVODStore((s) => s.currentPageContent);
  const currentPage = useVODStore((s) => s.currentPage);
  const totalCount = useVODStore((s) => s.totalCount);
  const loading = useVODStore((s) => s.loading);
  const filters = useVODStore((s) => s.filters);
  const allCategories = useVODStore((s) => s.categories);
  const setFilters = useVODStore((s) => s.setFilters);
  const setPage = useVODStore((s) => s.setPage);
  const setPageSize = useVODStore((s) => s.setPageSize);
  const fetchContent = useVODStore((s) => s.fetchContent);
  const fetchCategories = useVODStore((s) => s.fetchCategories);

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const ready = useRef(false);

  const typeOptions = useMemo(() => {
    const o = [];
    if (moviesOn && seriesOn) o.push({ label: 'All', value: 'all' });
    if (moviesOn) o.push({ label: 'Movies', value: 'movies' });
    if (seriesOn) o.push({ label: 'Series', value: 'series' });
    return o;
  }, [moviesOn, seriesOn]);

  useEffect(() => {
    setPageSize(PAGE_SIZE);
    const forced = moviesOn && !seriesOn ? 'movies' : seriesOn && !moviesOn ? 'series' : null;
    if (forced && filters.type !== forced) setFilters({ type: forced, category: '' });
    fetchCategories();
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready.current) fetchContent();
  }, [filters, currentPage, fetchContent]);

  // Accumulate pages into one scrolling grid.
  useEffect(() => {
    setItems((prev) => {
      const next = (content || []).map((i) => ({ ...i, contentType: i.contentType || i.content_type }));
      return currentPage === 1 ? next : [...prev, ...next.filter((n) => !prev.some((p) => p.id === n.id && p.contentType === n.contentType))];
    });
  }, [content, currentPage]);

  const categoryOptions = useMemo(
    () => getCategoryOptions(filterCategoriesToEnabled(allCategories || {}), filters),
    [allCategories, filters]
  );

  const loadMore = useCallback(() => {
    if (!loading && items.length < totalCount) setPage(currentPage + 1);
  }, [loading, items.length, totalCount, currentPage, setPage]);

  if (!moviesOn && !seriesOn) {
    return <EmptyState icon={Film} title="VOD is not enabled for your account" />;
  }

  return (
    <>
      <PageHeader title="Movies & Series" subtitle={totalCount ? `${totalCount.toLocaleString()} titles` : undefined}>
        <Stack gap={8}>
          <SearchInput value={filters.search} onChange={(v) => setFilters({ search: v })} placeholder="Search titles" />
          <Group gap="xs" wrap="nowrap">
            {typeOptions.length > 1 && (
              <SegmentedControl
                size="sm"
                data={typeOptions}
                value={filters.type}
                onChange={(v) => setFilters({ type: v, category: '' })}
              />
            )}
            <Select
              size="sm"
              style={{ flex: 1, minWidth: 0 }}
              data={categoryOptions}
              value={filters.category}
              onChange={(v) => setFilters({ category: v || '' })}
              searchable
              placeholder="Category"
              aria-label="Category"
            />
          </Group>
        </Stack>
      </PageHeader>

      <div className="dm-page-body">
        {!loading && items.length === 0 ? (
          <EmptyState icon={Film} title="No titles" message="Nothing matches, or your M3U accounts have no VOD content." />
        ) : (
          <div className="dm-poster-grid">
            {items.map((item) => (
              <Poster key={`${item.contentType}-${item.id}`} item={item} onClick={() => setSelected(item)} />
            ))}
          </div>
        )}
        {loading && (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        )}
        <InfiniteSentinel onReach={loadMore} disabled={loading || items.length >= totalCount} />
      </div>

      <Suspense fallback={null}>
        {selected?.contentType === 'series' && <SeriesModal series={selected} opened onClose={() => setSelected(null)} />}
        {selected && selected.contentType !== 'series' && <VODModal vod={selected} opened onClose={() => setSelected(null)} />}
      </Suspense>
    </>
  );
}
