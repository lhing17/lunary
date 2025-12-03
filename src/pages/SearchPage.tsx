import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, Clock, FileText, X } from 'lucide-react';
import { SearchResult, SearchResponse, SearchFilters } from '../types';
import { SearchResults } from '../components/SearchResults';
import { SearchFiltersComponent } from '../components/SearchFilters';
import { SearchHistory } from '../components/SearchHistory';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Mock search function - will be replaced with Tauri backend call
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock results
    const mockResults: SearchResult[] = [
      {
        id: '1',
        title: '示例文档1.txt',
        content: '这是一个包含搜索关键词的示例文档内容。文档中包含了重要的信息和数据。',
        filePath: '/Users/documents/示例文档1.txt',
        fileType: 'txt',
        modifiedTime: Date.now() - 86400000,
        score: 0.95,
        highlights: ['这是一个包含<em>搜索</em>关键词的示例文档内容']
      },
      {
        id: '2',
        title: '项目说明.md',
        content: '搜索功能是本项目的核心特性之一，它允许用户快速找到所需的文档和信息。',
        filePath: '/Users/documents/项目说明.md',
        fileType: 'md',
        modifiedTime: Date.now() - 172800000,
        score: 0.87,
        highlights: ['<em>搜索</em>功能是本项目的核心特性之一']
      }
    ];

    setSearchResults(mockResults);
    setTotalResults(mockResults.length);
    setSearchTime(0.125);
    
    // Update search history
    if (!searchHistory.includes(searchQuery)) {
      setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
    }
    
    setIsSearching(false);
  }, [searchHistory]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleSearchHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            全文搜索
          </h1>
          
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入搜索关键词..."
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1 rounded-md transition-colors ${
                  showFilters 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Search History & Filters */}
        <div className={`${showFilters ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
          <div className="p-4 h-full overflow-y-auto">
            {showFilters && (
              <>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    搜索历史
                  </h3>
                  <SearchHistory
                    history={searchHistory}
                    onHistoryClick={handleSearchHistoryClick}
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    筛选条件
                  </h3>
                  <SearchFiltersComponent
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content - Search Results */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {/* Search Stats */}
              {query && (
                <div className="mb-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    {isSearching ? (
                      <span>搜索中...</span>
                    ) : (
                      <span>
                        找到 {totalResults} 个结果，用时 {searchTime} 秒
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Search Results */}
              <SearchResults
                results={searchResults}
                isLoading={isSearching}
                query={query}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};