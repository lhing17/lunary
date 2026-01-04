import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SearchPage } from './pages/SearchPage';
import { IndexManagementPage } from './pages/IndexManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { Modal } from './components/Modal';
import { loadSettings } from './utils/settingsStorage';
import { useI18n } from './i18n';
import { listen } from '@tauri-apps/api/event';

function App() {
  const { t, setLang } = useI18n();
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

  // For Tauri v2 menu events, sometimes we need to ensure the event name is correct.
  // Standard menu events usually come from the menu plugin or main process emitting them.
  // If we used `MenuItem::with_id`, we might need to listen to `tauri://menu`.
  // However, simpler way is to listen to the specific ID if we emit it from Rust,
  // OR rely on the fact that Tauri emits menu events. 
  // Let's try catching the window menu event.
  
  useEffect(() => {
    // Alternatively, using the window event listener if standard
    const handleMenu = (event: any) => {
       // This might need adjustment depending on how Tauri v2 sends menu events to webview.
       // It seems Tauri v2 automatically emits events for menu items if configured?
       // Actually, in Tauri v2, we usually use `Window.onMenuClicked` or similar if using the JS API,
       // but since we created the menu in Rust, we need to handle the event in Rust and emit to frontend,
       // OR use the default event propagation.
       
       // Let's modify Rust to emit an event when menu is clicked, OR assume standard behavior.
       // Standard behavior: 
       // In Tauri v1: `listen(id, ...)`
       // In Tauri v2: We should check if we need to manually emit.
    };
  }, []);

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