export interface SearchResult {
  id: string;
  title: string;
  content: string;
  filePath: string;
  fileType: string;
  modifiedTime: number;
  score: number;
  highlights: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  hasMore: boolean;
}

export interface DirectoryConfig {
  path: string;
  enabled: boolean;
  recursive: boolean;
  lastIndexed: number;
}

export interface IndexConfig {
  directories: DirectoryConfig[];
  updateInterval: number; // seconds
  excludePatterns: string[];
  maxFileSize: number; // bytes
  supportedFileTypes: string[];
}

export interface SearchFilters {
  fileTypes?: string[];
  dateRange?: {
    start?: number;
    end?: number;
  };
  datePreset?: 'any' | 'lastDay' | 'lastWeek' | 'lastMonth';
  fileSizeRange?: {
    min?: number;
    max?: number;
  };
}

export interface SearchHistory {
  id: string;
  query: string;
  resultCount: number;
  timestamp: number;
}

export interface IndexStatus {
  isIndexing: boolean;
  progress: number;
  totalFiles: number;
  indexedFiles: number;
  indexSize: number;
  lastUpdated: number;
}

export interface AppSettings {
  search: {
    resultsPerPage: number;
    matchPrecision: number;
    enableHighlighting: boolean;
  };
  indexing: {
    autoUpdate: boolean;
    updateInterval: number;
    excludePatterns: string[];
    maxFileSize: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    showThumbnails: boolean;
  };
}
