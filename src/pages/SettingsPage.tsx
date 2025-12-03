import React, { useState } from 'react';
import { Save, RotateCcw, Palette, Search, Database, Globe } from 'lucide-react';
import { AppSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    search: {
      resultsPerPage: 20,
      matchPrecision: 0.8,
      enableHighlighting: true,
    },
    indexing: {
      autoUpdate: true,
      updateInterval: 3600, // 1 hour
      excludePatterns: ['*.tmp', '*.log', 'node_modules/*'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
    },
    ui: {
      theme: 'system',
      language: 'zh-CN',
      showThumbnails: true,
    },
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (section: keyof AppSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    // TODO: Save settings to Tauri backend
    console.log('Saving settings:', settings);
    setHasChanges(false);
  };

  const handleResetSettings = () => {
    setSettings({
      search: {
        resultsPerPage: 20,
        matchPrecision: 0.8,
        enableHighlighting: true,
      },
      indexing: {
        autoUpdate: true,
        updateInterval: 3600,
        excludePatterns: ['*.tmp', '*.log', 'node_modules/*'],
        maxFileSize: 50 * 1024 * 1024,
      },
      ui: {
        theme: 'system',
        language: 'zh-CN',
        showThumbnails: true,
      },
    });
    setHasChanges(true);
  };

  const handleAddExcludePattern = () => {
    const newPattern = prompt('输入要排除的文件模式 (例如: *.tmp):');
    if (newPattern && !settings.indexing.excludePatterns.includes(newPattern)) {
      handleSettingChange('indexing', 'excludePatterns', [
        ...settings.indexing.excludePatterns,
        newPattern,
      ]);
    }
  };

  const handleRemoveExcludePattern = (pattern: string) => {
    handleSettingChange(
      'indexing',
      'excludePatterns',
      settings.indexing.excludePatterns.filter(p => p !== pattern)
    );
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            设置
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            配置搜索、索引和界面选项
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Search Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Search className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                搜索设置
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  每页结果数
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.search.resultsPerPage}
                  onChange={(e) => handleSettingChange('search', 'resultsPerPage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  匹配精度
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={settings.search.matchPrecision}
                  onChange={(e) => handleSettingChange('search', 'matchPrecision', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {(settings.search.matchPrecision * 100).toFixed(0)}%
                </div>
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.search.enableHighlighting}
                  onChange={(e) => handleSettingChange('search', 'enableHighlighting', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  启用搜索结果高亮显示
                </span>
              </label>
            </div>
          </div>

          {/* Indexing Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Database className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                索引设置
              </h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.indexing.autoUpdate}
                  onChange={(e) => handleSettingChange('indexing', 'autoUpdate', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  启用自动更新索引
                </span>
              </label>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  更新间隔 (秒)
                </label>
                <input
                  type="number"
                  min="300"
                  max="86400"
                  value={settings.indexing.updateInterval}
                  onChange={(e) => handleSettingChange('indexing', 'updateInterval', parseInt(e.target.value))}
                  disabled={!settings.indexing.autoUpdate}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  建议设置为 3600 秒 (1小时)
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  最大文件大小 (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={settings.indexing.maxFileSize / (1024 * 1024)}
                  onChange={(e) => handleSettingChange('indexing', 'maxFileSize', parseInt(e.target.value) * 1024 * 1024)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  排除文件模式
                </label>
                <div className="space-y-2">
                  {settings.indexing.excludePatterns.map((pattern, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                        {pattern}
                      </span>
                      <button
                        onClick={() => handleRemoveExcludePattern(pattern)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddExcludePattern}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    添加排除模式
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* UI Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Palette className="w-5 h-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                界面设置
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  主题
                </label>
                <select
                  value={settings.ui.theme}
                  onChange={(e) => handleSettingChange('ui', 'theme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="system">跟随系统</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  语言
                </label>
                <select
                  value={settings.ui.language}
                  onChange={(e) => handleSettingChange('ui', 'language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.ui.showThumbnails}
                  onChange={(e) => handleSettingChange('ui', 'showThumbnails', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  显示文件缩略图
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleResetSettings}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 inline mr-2" />
            重置为默认值
          </button>
          
          <button
            onClick={handleSaveSettings}
            disabled={!hasChanges}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4 inline mr-2" />
            保存设置
          </button>
        </div>

        {/* About Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            关于
          </h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>应用名称:</span>
              <span>全文检索工具</span>
            </div>
            <div className="flex justify-between">
              <span>版本:</span>
              <span>0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span>构建时间:</span>
              <span>{new Date().toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="flex justify-between">
              <span>开源协议:</span>
              <span>MIT License</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};