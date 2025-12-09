export default {
  sidebar: {
    title: 'Full-Text Search',
    menu: { search: 'Search', index: 'Index Management', settings: 'Settings' },
    version: 'Version {version}',
  },
  searchFilters: {
    fileType: 'File Type',
    types: {
      txt: 'Text (.txt)',
      md: 'Markdown (.md)',
      pdf: 'PDF (.pdf)',
      doc: 'Word (.doc, .docx)',
      xls: 'Excel (.xls, .xlsx)',
      ppt: 'PowerPoint (.ppt, .pptx)',
      plain: 'Other Plain Text (.js, .json, ...)',
    },
    modifiedTime: 'Modified Time',
    any: 'Any',
    lastDay: 'Last Day',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
    clear: 'Clear All Filters',
  },
  searchHistory: {
    empty: 'No search history',
  },
  searchResults: {
    startTitle: 'Start Searching',
    startDesc: 'Enter keywords above to search your documents',
    emptyTitle: 'No Results Found',
    emptyDesc: 'Try different keywords or adjust filters',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: '{days} days ago',
  },
};

