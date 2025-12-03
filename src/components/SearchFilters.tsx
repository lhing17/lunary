import React from 'react';
import { SearchFilters } from '../types';
import { useI18n } from '../i18n';

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export const SearchFiltersComponent: React.FC<SearchFiltersProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const { t } = useI18n();
  const fileTypes = [
    { value: 'txt', label: t('components.searchFilters.types.txt') },
    { value: 'md', label: t('components.searchFilters.types.md') },
    { value: 'pdf', label: t('components.searchFilters.types.pdf') },
    { value: 'doc', label: t('components.searchFilters.types.doc') },
    { value: 'xls', label: t('components.searchFilters.types.xls') },
    { value: 'ppt', label: t('components.searchFilters.types.ppt') },
  ];

  const handleFileTypeChange = (fileType: string, checked: boolean) => {
    const currentTypes = filters.fileTypes || [];
    const newTypes = checked
      ? [...currentTypes, fileType]
      : currentTypes.filter(type => type !== fileType);
    
    onFiltersChange({
      ...filters,
      fileTypes: newTypes.length > 0 ? newTypes : undefined
    });
  };

  return (
    <div className="space-y-4">
      {/* File Type Filter */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('components.searchFilters.fileType')}</h4>
        <div className="space-y-2">
          {fileTypes.map((type) => (
            <label key={type.value} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.fileTypes?.includes(type.value) || false}
                onChange={(e) => handleFileTypeChange(type.value, e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {type.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('components.searchFilters.modifiedTime')}</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="dateRange"
              checked={!filters.dateRange}
              onChange={() => onFiltersChange({ ...filters, dateRange: undefined })}
              className="border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('components.searchFilters.any')}
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="dateRange"
              checked={filters.dateRange?.start === Date.now() - 86400000}
              onChange={() => onFiltersChange({ 
                ...filters, 
                dateRange: { 
                  start: Date.now() - 86400000,
                  end: Date.now()
                }
              })}
              className="border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('components.searchFilters.lastDay')}
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="dateRange"
              checked={filters.dateRange?.start === Date.now() - 604800000}
              onChange={() => onFiltersChange({ 
                ...filters, 
                dateRange: { 
                  start: Date.now() - 604800000,
                  end: Date.now()
                }
              })}
              className="border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('components.searchFilters.lastWeek')}
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="dateRange"
              checked={filters.dateRange?.start === Date.now() - 2592000000}
              onChange={() => onFiltersChange({ 
                ...filters, 
                dateRange: { 
                  start: Date.now() - 2592000000,
                  end: Date.now()
                }
              })}
              className="border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('components.searchFilters.lastMonth')}
            </span>
          </label>
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => onFiltersChange({})}
        className="w-full px-3 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-300 rounded-md transition-colors"
      >
        {t('components.searchFilters.clear')}
      </button>
    </div>
  );
};
