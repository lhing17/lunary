import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Folder, Clock, CheckCircle, AlertCircle, Pause, Play } from 'lucide-react';
import { DirectoryConfig, IndexStatus } from '../types';

export const IndexManagementPage: React.FC = () => {
  const [directories, setDirectories] = useState<DirectoryConfig[]>([]);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>({
    isIndexing: false,
    progress: 0,
    totalFiles: 0,
    indexedFiles: 0,
    indexSize: 0,
    lastUpdated: 0
  });

  // Mock data - will be replaced with Tauri backend calls
  useEffect(() => {
    setDirectories([
      {
        path: '/Users/documents',
        enabled: true,
        recursive: true,
        lastIndexed: Date.now() - 3600000
      },
      {
        path: '/Users/projects',
        enabled: false,
        recursive: false,
        lastIndexed: Date.now() - 86400000
      }
    ]);
  }, []);

  const handleAddDirectory = async () => {
    // TODO: Implement directory picker with Tauri
    console.log('Add directory');
  };

  const handleRemoveDirectory = (path: string) => {
    setDirectories(directories.filter(dir => dir.path !== path));
  };

  const handleToggleDirectory = (path: string) => {
    setDirectories(directories.map(dir => 
      dir.path === path ? { ...dir, enabled: !dir.enabled } : dir
    ));
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return '从未';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            索引管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            管理需要索引的文档目录，监控索引状态和进度
          </p>
        </div>

        {/* Index Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              索引状态
            </h2>
            <div className="flex items-center space-x-2">
              {indexStatus.isIndexing ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">索引中...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">索引完成</span>
                </div>
              )}
            </div>
          </div>

          {indexStatus.isIndexing && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>进度</span>
                <span>{indexStatus.progress}% ({indexStatus.indexedFiles}/{indexStatus.totalFiles} 文件)</span>
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
              <div className="text-gray-500 dark:text-gray-400">总文件数</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {indexStatus.totalFiles}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">索引大小</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatFileSize(indexStatus.indexSize)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">最后更新</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDate(indexStatus.lastUpdated)}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRebuildIndex}
                disabled={indexStatus.isIndexing}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                重建索引
              </button>
            </div>
          </div>
        </div>

        {/* Directories List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                索引目录
              </h2>
              <button
                onClick={handleAddDirectory}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加目录</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {directories.length === 0 ? (
              <div className="p-8 text-center">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无索引目录
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  添加需要索引的文档目录以开始搜索
                </p>
                <button
                  onClick={handleAddDirectory}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  添加目录
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
                            <span>最后索引: {formatDate(directory.lastIndexed)}</span>
                          </span>
                          <span>
                            {directory.recursive ? '递归子目录' : '仅当前目录'}
                          </span>
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
                        title={directory.enabled ? '暂停索引' : '启用索引'}
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
                        title="删除目录"
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