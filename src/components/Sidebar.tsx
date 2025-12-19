import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Database, Settings, Moon } from 'lucide-react';
import { useI18n } from '../i18n';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { t } = useI18n();

  const menuItems = [
    { path: '/', icon: Search, label: t('components.sidebar.menu.search') },
    { path: '/index-management', icon: Database, label: t('components.sidebar.menu.index') },
    { path: '/settings', icon: Settings, label: t('components.sidebar.menu.settings') },
  ];

  return (
    <div className="w-20 lg:w-64 flex-shrink-0 bg-surface-light dark:bg-surface-dark backdrop-blur-md border-r border-white/20 dark:border-white/10 flex flex-col transition-all duration-300">
      <div className="p-6 flex items-center justify-center lg:justify-start">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-primary-300 flex items-center justify-center shadow-glow mr-0 lg:mr-3">
            <Moon className="w-5 h-5 text-white fill-current" />
        </div>
        <h1 className="hidden lg:block text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Lunary
        </h1>
      </div>
      
      <nav className="flex-1 px-2 lg:px-4 py-4">
        <ul className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center justify-center lg:justify-start px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-300 shadow-glow'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full lg:hidden" />
                  )}
                  <Icon className={`w-6 h-6 lg:w-5 lg:h-5 lg:mr-3 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="hidden lg:block font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200/50 dark:border-white/5">
        <div className="text-xs text-center lg:text-left text-gray-400 dark:text-gray-500">
          <span className="hidden lg:inline">{t('components.sidebar.version', { version: '0.1.0' })}</span>
          <span className="lg:hidden">v0.1</span>
        </div>
      </div>
    </div>
  );
};
