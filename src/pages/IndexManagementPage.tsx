import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Folder, Clock, CheckCircle, Pause, Play } from 'lucide-react';
import { DirectoryConfig, IndexStatus } from '../types';
import { useI18n } from '../i18n';
import { loadDirectories, saveDirectories } from '../utils/directoriesStorage';
import { open } from '@tauri-apps/plugin-dialog';

export const IndexManagementPage: React.FC = () => {
  const { t, locale } = useI18n();
  const [directories, setDirectories] = useState<DirectoryConfig[]>([]);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>({
    isIndexing: false,
    progress: 0,
    totalFiles: 0,
    indexedFiles: 0,
    indexSize: 0,
    lastUpdated: 0
  });

  useEffect(() => {
    (async () => {
      const dirs = await loadDirectories();
      setDirectories(dirs ?? []);
    })();
  }, []);

  const handleAddDirectory = async () => {
    const picked = await open({ directory: true, multiple: true });
    const paths = Array.isArray(picked) ? picked : picked ? [picked] : [];
    if (paths.length === 0) return;
    const existing = new Set(directories.map(d => d.path));
    const toAdd: DirectoryConfig[] = paths
      .filter(p => !existing.has(p))
      .map(p => ({ path: p, enabled: true, recursive: true, lastIndexed: 0 }));
    const next = [...directories, ...toAdd];
    setDirectories(next);
    await saveDirectories(next);
  };

  const handleRemoveDirectory = async (path: string) => {
    const next = directories.filter(dir => dir.path !== path);
    setDirectories(next);
    await saveDirectories(next);
  };

  const handleToggleDirectory = async (path: string) => {
    const next = directories.map(dir => dir.path === path ? { ...dir, enabled: !dir.enabled } : dir);
    setDirectories(next);
    await saveDirectories(next);
  };

  const handleToggleRecursive = async (path: string) => {
    const next = directories.map(dir => dir.path === path ? { ...dir, recursive: !dir.recursive } : dir);
    setDirectories(next);
    await saveDirectories(next);
  };

  const handleRebuildIndex = async () => {
    setIndexStatus({
      isIndexing: true,
      progress: 0,
      totalFiles: 1250,
      indexedFiles: 0,
      indexSize: 0,
      lastUpdated: Date.now()
    });

    // Simulate indexing progress
    const interval = setInterval(() => {
      setIndexStatus(prev => {
        const newProgress = Math.min(prev.progress + 5, 100);
        const newIndexedFiles = Math.floor((newProgress / 100) * prev.totalFiles);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          return {
            ...prev,
            isIndexing: false,
            progress: 100,
            indexedFiles: prev.totalFiles,
            indexSize: 156 * 1024 * 1024, // 156MB
            lastUpdated: Date.now()
          };
        }
        
        return {
          ...prev,
          progress: newProgress,
          indexedFiles: newIndexedFiles
        };
      });
    }, 200);
  };

  /* 将文件大小变为可读格式 */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  /* 如果时间戳为0，返回“从未”，否则返回本地时间字符串 */
  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return t('pages.indexManagement.never');
    const date = new Date(timestamp);
    return date.toLocaleString(locale);
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('pages.indexManagement.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('pages.indexManagement.subtitle')}</p>
        </div>

        {/* Index Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pages.indexManagement.status')}</h2>
            <div className="flex items-center space-x-2">
              {indexStatus.isIndexing ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t('pages.indexManagement.indexing')}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{t('pages.indexManagement.done')}</span>
                </div>
              )}
            </div>
          </div>

          {indexStatus.isIndexing && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>{t('pages.indexManagement.progress')}</span>
                <span>{t('pages.indexManagement.progressDetail', { progress: indexStatus.progress, indexed: indexStatus.indexedFiles, total: indexStatus.totalFiles })}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${indexStatus.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">{t('pages.indexManagement.totalFiles')}</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{indexStatus.totalFiles}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">{t('pages.indexManagement.indexSize')}</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatFileSize(indexStatus.indexSize)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">{t('pages.indexManagement.lastUpdated')}</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(indexStatus.lastUpdated)}</div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRebuildIndex}
                disabled={indexStatus.isIndexing}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('pages.indexManagement.rebuild')}
              </button>
            </div>
          </div>
        </div>

        {/* Directories List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pages.indexManagement.directories')}</h2>
              <button
                onClick={handleAddDirectory}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('pages.indexManagement.addDir')}</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {directories.length === 0 ? (
              <div className="p-8 text-center">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('pages.indexManagement.emptyTitle')}</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">{t('pages.indexManagement.emptyDesc')}</p>
                <button
                  onClick={handleAddDirectory}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {t('pages.indexManagement.addDir')}
                </button>
              </div>
            ) : (
              directories.map((directory, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {directory.path}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{t('pages.indexManagement.lastIndexed', { date: formatDate(directory.lastIndexed) })} </span>
                          </span>
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={directory.recursive}
                              onChange={() => handleToggleRecursive(directory.path)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>
                              {directory.recursive ? t('pages.indexManagement.recursive') : t('pages.indexManagement.onlyCurrent')}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleDirectory(directory.path)}
                        className={`p-2 rounded-md transition-colors ${
                          directory.enabled
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={directory.enabled ? t('pages.indexManagement.pause') : t('pages.indexManagement.enable')}
                      >
                        {directory.enabled ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveDirectory(directory.path)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title={t('pages.indexManagement.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
