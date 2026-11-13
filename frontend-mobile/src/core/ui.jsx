/**
 * Shared touch-friendly building blocks used by modules.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Drawer,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { History, Search, Tv, X } from 'lucide-react';

/** Provided by Shell: path of the stock upstream page for the current route, if any. */
export const ClassicPathContext = createContext(null);

/** Sticky page header: title on the left, actions on the right, optional row below. */
export function PageHeader({ title, subtitle, actions, children }) {
  const classicPath = useContext(ClassicPathContext);
  const classicLink = classicPath ? (
    <ActionIcon
      component={Link}
      to={classicPath}
      variant="subtle"
      color="gray"
      size="lg"
      title="Classic view"
      aria-label="Open classic Dispatcharr view"
    >
      <History size={18} />
    </ActionIcon>
  ) : null;
  return (
    <header className="dm-page-header">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Box style={{ minWidth: 0 }}>
          <Title order={1} className="dm-page-title">
            {title}
          </Title>
          {subtitle && (
            <Text size="xs" c="dimmed" truncate>
              {subtitle}
            </Text>
          )}
        </Box>
        {(actions || classicLink) && (
          <Group gap={4} wrap="nowrap">
            {actions}
            {classicLink}
          </Group>
        )}
      </Group>
      {children && <Box mt="xs">{children}</Box>}
    </header>
  );
}

/** Search box that debounces onChange so large lists don't re-query per keystroke. */
export function SearchInput({ value, onChange, placeholder = 'Search', delay = 300 }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => setLocal(value ?? ''), [value]);
  useEffect(() => {
    if (local === (value ?? '')) return undefined;
    const t = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return (
    <TextInput
      value={local}
      onChange={(e) => setLocal(e.currentTarget.value)}
      placeholder={placeholder}
      leftSection={<Search size={16} />}
      rightSection={
        local ? (
          <ActionIcon variant="subtle" color="gray" onClick={() => { setLocal(''); onChange(''); }} aria-label="Clear search">
            <X size={14} />
          </ActionIcon>
        ) : null
      }
      size="md"
      radius="md"
      inputMode="search"
      enterKeyHint="search"
    />
  );
}

/** Horizontally scrolling chip row (groups, filters). */
export function ChipScroller({ items, value, onChange }) {
  return (
    <div className="dm-chip-scroller" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          className={`dm-chip ${item.value === value ? 'dm-chip--active' : ''}`}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span className="dm-chip__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** One tappable list row: leading visual, title/subtitle, trailing content. */
export function ListRow({ leading, title, subtitle, meta, trailing, onClick, active, children }) {
  const body = (
    <Group wrap="nowrap" gap="sm" align="center" className="dm-row__inner">
      {leading}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} wrap="nowrap">
          <Text fw={600} size="sm" truncate>
            {title}
          </Text>
          {meta}
        </Group>
        {subtitle && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {subtitle}
          </Text>
        )}
        {children}
      </Box>
      {trailing}
    </Group>
  );
  return onClick ? (
    <UnstyledButton className={`dm-row ${active ? 'dm-row--active' : ''}`} onClick={onClick}>
      {body}
    </UnstyledButton>
  ) : (
    <div className={`dm-row ${active ? 'dm-row--active' : ''}`}>{body}</div>
  );
}

export const logoUrl = (logoId) => (logoId ? `/api/channels/logos/${logoId}/cache/` : null);

/** Channel logo with a TV-icon fallback. */
export function ChannelLogo({ logoId, src, size = 44, alt = '' }) {
  const [failed, setFailed] = useState(false);
  const url = src || logoUrl(logoId);
  useEffect(() => setFailed(false), [url]);
  return (
    <div className="dm-logo" style={{ width: size, height: size }}>
      {url && !failed ? (
        <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <Tv size={size * 0.45} opacity={0.5} />
      )}
    </div>
  );
}

/** Bottom sheet on phones, right drawer on desktop. */
export function Sheet({ opened, onClose, title, children, size }) {
  const isDesktop = useIsDesktop();
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position={isDesktop ? 'right' : 'bottom'}
      size={isDesktop ? size || 'md' : 'auto'}
      radius={isDesktop ? 0 : 'lg'}
      classNames={{ content: isDesktop ? undefined : 'dm-sheet', title: 'dm-sheet__title' }}
      overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
      zIndex={300}
    >
      {children}
    </Drawer>
  );
}

/** Big tap target used inside sheets. */
export function SheetAction({ icon: Icon, label, description, color, onClick, disabled }) {
  return (
    <UnstyledButton className="dm-sheet-action" onClick={onClick} disabled={disabled} data-color={color}>
      <Group wrap="nowrap" gap="md">
        {Icon && <Icon size={20} color={color ? `var(--mantine-color-${color}-5)` : undefined} />}
        <Box style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} c={color ? `${color}.4` : undefined}>
            {label}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Box>
      </Group>
    </UnstyledButton>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <Center py={60} px="md">
      <Stack align="center" gap="xs" maw={320}>
        {Icon && <Icon size={40} opacity={0.4} />}
        <Text fw={600}>{title}</Text>
        {message && (
          <Text size="sm" c="dimmed" ta="center">
            {message}
          </Text>
        )}
        {action}
      </Stack>
    </Center>
  );
}

export function PageLoader() {
  return (
    <Center py={80}>
      <Loader />
    </Center>
  );
}

export function StatusDot({ color = 'green', pulse }) {
  return <span className={`dm-dot ${pulse ? 'dm-dot--pulse' : ''}`} style={{ background: `var(--mantine-color-${color}-5)` }} />;
}

export function CountBadge({ children, color = 'gray' }) {
  return (
    <Badge size="sm" variant="light" color={color} radius="sm">
      {children}
    </Badge>
  );
}

const DESKTOP_QUERY = '(min-width: 900px)';
export function useIsDesktop() {
  const [match, setMatch] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}

/** Re-renders every `ms` so "now" based UI (progress bars) stays fresh. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Fires `onReach` when the sentinel scrolls into view (infinite lists). */
export function InfiniteSentinel({ onReach, disabled }) {
  const ref = React.useRef(null);
  useEffect(() => {
    if (disabled || !ref.current) return undefined;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && onReach(), {
      rootMargin: '600px',
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [onReach, disabled]);
  return <div ref={ref} style={{ height: 1 }} />;
}

export const fmtTime = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const fmtDuration = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${s}s`;
};
