export const DEPTH_OPTIONS = ['standard', 'quick', 'deep'];

export const DEPTH_LABELS = {
  quick: '快速浏览',
  standard: '标准综述',
  deep: '深入分析'
};

export const DEPTH_DISPLAY_OPTIONS = DEPTH_OPTIONS.map((item) => DEPTH_LABELS[item]);

export const DEFAULT_REVIEW_FORM = {
  topic: '',
  depth: 'standard',
  audience: '技术负责人 / 研发工程师',
  focus: '技术趋势、代表项目、落地路径'
};

export const AVAILABLE_TOOLS = [
  {
    id: 'frontier-review',
    marker: '综',
    name: '技术点前沿综述',
    status: '可用',
    description: '输入一个技术点，自动抓取近期公开信号并生成结构化综述文档。',
    meta: '示例：Agent',
    actionText: '开始'
  }
];

export const UPCOMING_TOOLS = [
  { id: 'tech-brief', marker: '报', name: '技术简报', description: '把一个方向整理成一页式简报' },
  { id: 'slides-outline', marker: '纲', name: '汇报大纲', description: '把研究内容转成汇报结构' },
  { id: 'tech-compare', marker: '比', name: '技术对比', description: '对比多个方案的适用场景与风险' }
];
