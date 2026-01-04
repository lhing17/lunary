import { useState, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings } from '../utils/settingsStorage';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('system');

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = window.document.documentElement;
    const isDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    applyTheme(mode);
    
    // Update settings in storage
    loadSettings().then(settings => {
      if (settings) {
        const newSettings = {
          ...settings,
          ui: {
            ...settings.ui,
            theme: mode
          }
        };
        saveSettings(newSettings);
      }
    });
  }, [applyTheme]);

  // Initialize theme from settings
  useEffect(() => {
    loadSettings().then(settings => {
      if (settings?.ui?.theme) {
        const savedTheme = settings.ui.theme as ThemeMode;
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        // Default to system if no setting found
        applyTheme('system');
      }
    });
  }, [applyTheme]);

  // Listen for system theme changes if mode is 'system'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return { theme, setTheme };
}
