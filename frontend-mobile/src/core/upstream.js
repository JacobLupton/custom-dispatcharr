/**
 * THE ONLY BRIDGE TO THE UPSTREAM FRONTEND.
 *
 * Everything this UI uses from ../frontend/src (Dispatcharr's own frontend) is
 * re-exported from this file. Modules import from '@core/upstream', never from
 * '@upstream/...' directly.
 *
 * Why: after `git merge upstream/main`, if upstream renames or moves something,
 * `npm run build` fails here (one file) instead of across every page. Fix the
 * path below and every module keeps working.
 */
import { lazy } from 'react';

// ── Data layer ────────────────────────────────────────────────────────────
export { default as API } from '@upstream/api';
export { WebsocketProvider, useWebSocket } from '@upstream/WebSocket';
export { default as useAuthStore } from '@upstream/store/auth';
export { default as useChannelsStore } from '@upstream/store/channels';
export { default as useChannelsTableStore } from '@upstream/store/channelsTable';
export { default as useSettingsStore } from '@upstream/store/settings';
export { default as usePlaylistsStore } from '@upstream/store/playlists';
export { default as useEPGsStore } from '@upstream/store/epgs';
export { default as useLogosStore } from '@upstream/store/logos';
export { default as useStreamProfilesStore } from '@upstream/store/streamProfiles';
export { default as useUsersStore } from '@upstream/store/users';
export { default as useVideoStore } from '@upstream/store/useVideoStore';
export { default as useVODStore } from '@upstream/store/useVODStore';

// ── Constants & helpers ───────────────────────────────────────────────────
export { USER_LEVELS, USER_LEVEL_LABELS } from '@upstream/constants';
export { default as mantineTheme } from '@upstream/mantineTheme';
export { defaultRoute, getSafeNextPath } from '@upstream/utils/loginRedirect';
export { showNotification } from '@upstream/utils/notificationUtils.js';
export {
  buildLiveStreamUrl,
  getPlayerPrefs,
  savePlayerPrefs,
  getLivePlayerErrorMessage,
} from '@upstream/utils/components/FloatingVideoUtils.js';
export {
  getShowVideoUrl,
  getRecordingUrl,
  getPosterUrl,
  getChannelLogoUrl,
  removeRecording,
  stopRecordingById,
} from '@upstream/utils/cards/RecordingCardUtils.js';
export { categorizeRecordings } from '@upstream/utils/pages/DVRUtils.js';
export { useTimeHelpers } from '@upstream/utils/dateTimeUtils.js';
export { vodLogoSrc } from '@upstream/utils/cards/VODCardUtils.js';
export { formatBytes, formatSpeed } from '@upstream/utils/networkUtils.js';
export { canViewDvr, canManageDvr } from '@upstream/utils/dvrAccess';
export {
  canViewVod,
  isVodMoviesEnabled,
  isVodSeriesEnabled,
} from '@upstream/utils/vodAccess';
export {
  filterCategoriesToEnabled,
  getCategoryOptions,
} from '@upstream/utils/pages/VODsUtils.js';
export {
  buildChannelIdMap,
  mapProgramsByChannel,
  fetchPrograms,
  sortChannels,
} from '@upstream/utils/guideUtils.js';
export { getVisibleSettingsGroups } from '@upstream/config/settingsNav';
export { appendWindowParams } from '@upstream/utils/guideWindow.js';

// ── Upstream components reused as-is (forms, modals, global helpers) ──────
export { default as ErrorBoundary } from '@upstream/components/ErrorBoundary';
export { default as M3URefreshNotification } from '@upstream/components/M3URefreshNotification';
export { default as ConfirmationDialog } from '@upstream/components/ConfirmationDialog';

export const UpstreamLogin = lazy(() => import('@upstream/pages/Login'));
export const ChannelForm = lazy(() => import('@upstream/components/forms/Channel'));
export const M3UForm = lazy(() => import('@upstream/components/forms/M3U'));
export const EPGForm = lazy(() => import('@upstream/components/forms/EPG'));
export const VODModal = lazy(() => import('@upstream/components/VODModal'));
export const SeriesModal = lazy(() => import('@upstream/components/SeriesModal'));
export const RecordingDetailsModal = lazy(() => import('@upstream/components/forms/RecordingDetailsModal'));
export const RecordingForm = lazy(() => import('@upstream/components/forms/Recording'));
export const ProgramDetailModal = lazy(() => import('@upstream/components/ProgramDetailModal'));

// ── Full upstream pages, used by "legacy" modules (see modules/legacy) ────
export const legacyPages = {
  channels: lazy(() => import('@upstream/pages/Channels')),
  sources: lazy(() => import('@upstream/pages/ContentSources')),
  guide: lazy(() => import('@upstream/pages/Guide')),
  dvr: lazy(() => import('@upstream/pages/DVR')),
  stats: lazy(() => import('@upstream/pages/Stats')),
  vods: lazy(() => import('@upstream/pages/VODs')),
  settings: lazy(() => import('@upstream/pages/Settings')),
  users: lazy(() => import('@upstream/pages/Users')),
  logos: lazy(() => import('@upstream/pages/Logos')),
  plugins: lazy(() => import('@upstream/pages/Plugins')),
  pluginBrowse: lazy(() => import('@upstream/pages/PluginBrowse')),
  connect: lazy(() => import('@upstream/pages/Connect')),
  logs: lazy(() => import('@upstream/pages/LogFiles')),
  logView: lazy(() => import('@upstream/pages/LogFileView')),
};
