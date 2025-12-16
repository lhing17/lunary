import React, { useEffect, useState } from 'react';
import { FileText, Calendar, Folder, ExternalLink } from 'lucide-react';
import { SearchResult } from '../types';
import { useI18n } from '../i18n';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ 
  results, 
  isLoading, 
  query 
}) => {
  const { t, locale } = useI18n();
  const [menu, setMenu] = useState<{ x: number; y: number; visible: boolean; item?: SearchResult }>(() => ({ x: 0, y: 0, visible: false }));
  useEffect(() => {
    const hide = () => setMenu(m => ({ ...m, visible: false }));
    window.addEventListener('click', hide);
    window.addEventListener('contextmenu', hide);
    return () => {
      window.removeEventListener('click', hide);
      window.removeEventListener('contextmenu', hide);
    };
  }, []);
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'txt':
      case 'md':
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return t('components.searchResults.today');
    } else if (diffDays === 1) {
      return t('components.searchResults.yesterday');
    } else if (diffDays < 7) {
      return t('components.searchResults.daysAgo', { days: diffDays });
    } else {
      return date.toLocaleDateString(locale);
    }
  };

  const highlightText = (text: string, highlightQuery: string) => {
    if (!highlightQuery) return text;
    
    const regex = new RegExp(`(${highlightQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('components.searchResults.startTitle')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('components.searchResults.startDesc')}
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {t('components.searchResults.emptyTitle')}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('components.searchResults.emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div
          key={result.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY, visible: true, item: result });
          }}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-1">
              {getFileIcon(result.fileType)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 
                  className="text-lg font-medium text-gray-900 dark:text-white truncate"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(result.title, query)
                  }}
                />
                <div className="flex items-center space-x-2 ml-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(result.score * 100).toFixed(0)}%
                  </span>
                  <ExternalLink 
                    className="w-4 h-4 text-gray-400 hover:text-gray-600"
                    onClick={() => openPath(result.filePath)}
                  />
                </div>
              </div>
              
              <p 
                className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: highlightText(result.content, query)
                }}
              />
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Folder className="w-4 h-4" />
                  <span className="truncate max-w-xs">
                    {result.filePath}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(result.modifiedTime)}</span>
                </div>
              </div>
              
              {result.highlights && result.highlights.length > 0 && (
                <div className="mt-3 space-y-1">
                  {result.highlights.slice(0, 2).map((highlight, index) => (
                    <div 
                      key={index}
                      className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
                      dangerouslySetInnerHTML={{ __html: highlight }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {menu.visible && menu.item && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg"
          style={{ left: menu.x, top: menu.y }}
        >
          <button 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              if (menu.item) revealItemInDir(menu.item.filePath);
              setMenu(m => ({ ...m, visible: false }));
            }}
          >
            {t('components.searchResults.revealInFolder')}
          </button>
          <button 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => {
              if (menu.item) openPath(menu.item.filePath);
              setMenu(m => ({ ...m, visible: false }));
            }}
          >
            {t('components.searchResults.openWithSystem')}
          </button>
        </div>
      )}
    </div>
  );
};
