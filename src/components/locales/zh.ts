export default {
  sidebar: {
    title: '全文检索工具',
    menu: { search: '搜索', index: '索引管理', settings: '设置' },
    version: '版本 {version}',
  },
  searchFilters: {
    fileType: '文件类型',
    types: {
      txt: '文本文件 (.txt)',
      md: 'Markdown (.md)',
      pdf: 'PDF文档 (.pdf)',
      doc: 'Word文档 (.doc, .docx)',
      xls: 'Excel表格 (.xls, .xlsx)',
      ppt: 'PPT演示文稿 (.ppt, .pptx)',
      plain: '其他文本文件(.js, .json, ...)',
    },
    modifiedTime: '修改时间',
    any: '不限',
    lastDay: '最近一天',
    lastWeek: '最近一周',
    lastMonth: '最近一月',
    clear: '清除所有筛选',
  },
  searchHistory: {
    empty: '暂无搜索历史',
  },
  searchResults: {
    startTitle: '开始搜索',
    startDesc: '在上方输入框中输入关键词开始搜索您的文档',
    emptyTitle: '未找到结果',
    emptyDesc: '尝试使用不同的关键词或调整筛选条件',
    today: '今天',
    yesterday: '昨天',
    daysAgo: '{days}天前',
  },
};

