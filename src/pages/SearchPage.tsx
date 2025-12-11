import React, { useState, useCallback, useEffect } from "react";
import { Search, Filter, Clock } from "lucide-react";
import { SearchResult, SearchFilters, SearchResponse } from "../types";
import { SearchResults } from "../components/SearchResults";
import { SearchFiltersComponent } from "../components/SearchFilters";
import { SearchHistory } from "../components/SearchHistory";
import { useI18n } from "../i18n";
import { invoke } from "@tauri-apps/api/core";

export const SearchPage: React.FC = () => {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const t0 = performance.now(); // 搜索开始时间
      try {
        const resp = await invoke<SearchResponse>("search_index", {
          query: searchQuery,
          limit: perPage,
          offset: (currentPage - 1) * perPage,
          filters,
        });
        setSearchResults(resp.results);
        setTotalResults(resp.totalCount || resp.results.length);
        const t1 = performance.now();
        setSearchTime(Number(((t1 - t0) / 1000).toFixed(3))); // 搜索耗时（秒）
      } catch (e) {
        console.error("Search error:", e);
        setSearchResults([]);
        setTotalResults(0);
        setSearchTime(0);
      }

      // 更新搜索历史
      setSearchHistory((prev) =>
        prev.includes(searchQuery) ? prev : [searchQuery, ...prev.slice(0, 9)]
      );

      setIsSearching(false);
    },
    [filters, currentPage, perPage]
  );

  const handleSearchHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    performSearch(historyQuery);
  };

  const gotoPage = (p: number) => {
    if (p < 1) return;
    setCurrentPage(p);
  };

  useEffect(() => {
    if (query.trim() && !isSearching) {
      performSearch(query);
    }
  }, [filters, currentPage, perPage]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t("pages.searchPage.title")}
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSearching) {
                  e.preventDefault();
                  performSearch(query);
                }
              }}
              placeholder={t("pages.searchPage.placeholder")}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1 rounded-md transition-colors ${
                  showFilters
                    ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
        <div
          className={`${
            showFilters ? "w-80" : "w-0"
          } transition-all duration-300 overflow-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}
        >
          <div className="p-4 h-full overflow-y-auto">
            {showFilters && (
              <>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {t("pages.searchPage.history")}
                  </h3>
                  <SearchHistory
                    history={searchHistory}
                    onHistoryClick={handleSearchHistoryClick}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                    <Filter className="w-4 h-4 mr-2" />
                    {t("pages.searchPage.filters")}
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
                      <span>{t("pages.searchPage.searching")}</span>
                    ) : (
                      <span>
                        {t("pages.searchPage.stats", {
                          count: totalResults,
                          time: searchTime,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 dark:text-gray-400">{t('pages.common.perPage') || '每页'}</span>
                    <select
                      value={perPage}
                      onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Search Results */}
              <SearchResults
                results={searchResults}
                isLoading={isSearching}
                query={query}
              />
              {query && (
                <div className="mt-4 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => gotoPage(currentPage - 1)}
                    disabled={currentPage === 1 || isSearching}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    {t("pages.common.prev") || "上一页"}
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => gotoPage(currentPage + 1)}
                    disabled={isSearching || currentPage * perPage >= totalResults}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    {t("pages.common.next") || "下一页"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
