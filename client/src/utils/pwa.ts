import { useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

/**
 * Register the service worker at the project root (/sw.js).
 * Safe to call in any environment — failures are logged and swallowed.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    logger.info('[PWA] Service Worker not supported by this browser');
    return;
  }

  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration: ServiceWorkerRegistration) => {
          logger.info(
            `[PWA] Service Worker registered successfully (scope: ${registration.scope})`
          );
        })
        .catch((error: unknown) => {
          logger.error('[PWA] Service Worker registration failed', error as Error);
        });
    } catch (error) {
      logger.error('[PWA] Service Worker registration error', error as Error);
    }
  });
}

// --- Install prompt hook types ---

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * React hook that tracks PWA installability and provides an install trigger.
 *
 * Returns:
 *  - canInstall: whether the "beforeinstallprompt" event has fired
 *  - isInstalled: whether the app is already running in standalone mode
 *  - install(): call to prompt the user to install
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check if already running as installed app
  useEffect(() => {
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsInstalled(standalone);

      // Also listen for dynamic changes
      const mqList = window.matchMedia('(display-mode: standalone)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsInstalled(e.matches);
        if (e.matches) {
          setCanInstall(false);
          deferredPromptRef.current = null;
        }
      };
      if (mqList.addEventListener) {
        mqList.addEventListener('change', handleChange);
        return () => mqList.removeEventListener('change', handleChange);
      }
      // Safari fallback
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      mqList.addListener(handleChange);
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        mqList.removeListener(handleChange);
      };
    } catch (error) {
      logger.error('[PWA] display-mode check failed', error as Error);
      return;
    }
  }, []);

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      logger.info('[PWA] Install prompt available');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
      logger.info('[PWA] App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      logger.info('[PWA] No deferred install prompt available');
      return false;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        deferredPromptRef.current = null;
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[PWA] Install prompt error', error as Error);
      return false;
    }
  }, []);

  return { canInstall, isInstalled, install };
}
