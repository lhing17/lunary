import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SearchPage } from './pages/SearchPage';
import { IndexManagementPage } from './pages/IndexManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { Modal } from './components/Modal';
import { loadSettings } from './utils/settingsStorage';
import { useI18n } from './i18n';
import { useTheme } from './hooks/useTheme';
import { listen } from '@tauri-apps/api/event';

function App() {
  const { t, setLang } = useI18n();
  // Initialize theme
  useTheme();
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIndexManagerOpen, setIsIndexManagerOpen] = useState(false);

  useEffect(() => {
    loadSettings().then((settings) => {
      if (settings?.ui?.language) {
        setLang(settings.ui.language as any);
      }
    });

    const unlistenMenu = listen('menu://menu/click', (event: any) => {
      // payload: { id: "settings" }
      const id = event.payload;
      if (id === 'settings') {
        setIsSettingsOpen(true);
      } else if (id === 'index_management') {
        setIsIndexManagerOpen(true);
      }
    });

    return () => {
      unlistenMenu.then(f => f());
    };
  }, [setLang]);

  return (
    <Router>
      <div className="flex h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<SearchPage />} />
          </Routes>
        </main>

        <Modal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title={t('pages.settings.title')}
        >
          <SettingsPage />
        </Modal>

        <Modal
          isOpen={isIndexManagerOpen}
          onClose={() => setIsIndexManagerOpen(false)}
          title={t('pages.indexManagement.title')}
        >
          <IndexManagementPage />
        </Modal>
      </div>
    </Router>
  );
}

export default App;