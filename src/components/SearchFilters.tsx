import React from 'react';
import { SearchFilters } from '../types';

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export const SearchFiltersComponent: React.FC<SearchFiltersProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const fileTypes = [
    { value: 'txt', label: '文本文件 (.txt)' },
    { value: 'md', label: 'Markdown (.md)' },
    { value: 'pdf', label: 'PDF文档 (.pdf)' },
    { value: 'doc', label: 'Word文档 (.doc, .docx)' },
    { value: 'xls', label: 'Excel表格 (.xls, .xlsx)' },
    { value: 'ppt', label: 'PPT演示文稿 (.ppt, .pptx)' },
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
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          文件类型
        </h4>
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
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          修改时间
        </h4>
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
              不限
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
              最近一天
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
              最近一周
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
              最近一月
            </span>
          </label>
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => onFiltersChange({})}
        className="w-full px-3 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-300 rounded-md transition-colors"
      >
        清除所有筛选
      </button>
    </div>
  );
};