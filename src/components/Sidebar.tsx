import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Database, Settings } from 'lucide-react';
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
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('components.sidebar.title')}</h1>
      </div>
      
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">{t('components.sidebar.version', { version: '0.1.0' })}</div>
      </div>
    </div>
  );
};
