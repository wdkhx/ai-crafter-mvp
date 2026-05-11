export const FIELD_OPTIONS = ['计算机科学', '电子工程', '机械工程', '其他'];

export const CITATION_OPTIONS = ['GB/T 7714-2015', 'APA', 'MLA'];

export const DEFAULT_PAPER_FORM = {
  topic: '',
  word_count: 3000,
  reference_count: 8,
  field: FIELD_OPTIONS[0],
  citation_style: CITATION_OPTIONS[0],
  special_requirements: ''
};

export const AVAILABLE_TOOLS = [
  {
    id: 'paper-writing',
    marker: '文',
    name: '科研论文写作',
    status: '可用',
    description: '输入一个主题，生成论文初稿、章节结构和参考文献格式。',
    meta: '推荐：3000 字初稿',
    actionText: '开始'
  }
];

export const UPCOMING_TOOLS = [
  { id: 'literature-review', marker: '综', name: '文献综述', description: '整理研究脉络与代表文献' },
  { id: 'slides-outline', marker: '纲', name: '汇报大纲', description: '把研究内容转成汇报结构' },
  { id: 'abstract-polish', marker: '摘', name: '摘要润色', description: '优化摘要表达和关键词' }
];
