import React, { Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import {
  API,
  ErrorBoundary,
  M3URefreshNotification,
  UpstreamLogin,
  WebsocketProvider,
  getSafeNextPath,
  useAuthStore,
} from '@core/upstream';
import theme from '@core/theme';
import Shell from '@core/Shell';
import Player from '@core/Player';
import { PageLoader, useIsDesktop } from '@core/ui';

const LoginRedirect = () => {
  const location = useLocation();
  const target = getSafeNextPath(location.pathname + location.search);
  return <Navigate to={`/login${target ? `?next=${encodeURIComponent(target)}` : ''}`} replace />;
};

/**
 * Auth/bootstrap mirrors upstream App.jsx exactly (same stores, same order),
 * only the layout differs.
 */
export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const logout = useAuthStore((s) => s.logout);
  const initData = useAuthStore((s) => s.initData);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const setSuperuserStatus = useAuthStore((s) => s.setSuperuserStatus);
  const authReady = isAuthenticated && isInitialized;
  const isDesktop = useIsDesktop();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    API.fetchSuperUser()
      .then(setSuperuserStatus)
      .catch((error) => {
        setSuperuserStatus({ superuser_exists: true });
        if (error.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('tokenExpiration');
          window.location.href = '/login';
        }
      });

    (async () => {
      try {
        if (await initializeAuth()) await initData();
        else await logout();
      } catch (error) {
        console.error('Auth check failed:', error);
        await logout();
      }
    })();
  }, [initializeAuth, initData, logout, setSuperuserStatus]);

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <ErrorBoundary name="application">
        <WebsocketProvider>
          <BrowserRouter>
            {isCheckingAuth ? (
              <PageLoader />
            ) : authReady ? (
              <Shell />
            ) : (
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<div className="dm-login"><UpstreamLogin /></div>} />
                  <Route path="*" element={<LoginRedirect />} />
                </Routes>
              </Suspense>
            )}
            <M3URefreshNotification />
            <Notifications
              position={isDesktop ? 'bottom-right' : 'top-center'}
              containerWidth={isDesktop ? 350 : 'calc(100vw - 24px)'}
              zIndex={1000}
            />
          </BrowserRouter>
        </WebsocketProvider>
        <Player />
      </ErrorBoundary>
    </MantineProvider>
  );
}
