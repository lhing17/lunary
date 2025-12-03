import React from 'react';
import { Clock, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface SearchHistoryProps {
  history: string[];
  onHistoryClick: (query: string) => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({ 
  history, 
  onHistoryClick 
}) => {
  const { t } = useI18n();
  if (history.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        {t('components.searchHistory.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {history.map((query, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 group cursor-pointer"
          onClick={() => onHistoryClick(query)}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {query}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Remove from history
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
};
