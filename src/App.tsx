import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SearchPage } from './pages/SearchPage';
import { IndexManagementPage } from './pages/IndexManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { Sidebar } from './components/Sidebar';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/index-management" element={<IndexManagementPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;