import { connectDb } from './config/db.js';
import { AgentComponent } from './models/AgentComponent.js';
import { Workflow } from './models/Workflow.js';
import { TechIntelligence } from './models/TechIntelligence.js';
import { refreshIntelligence } from './services/platformService.js';

const components = [
  ['topic-scope', '技术点定位 Agent', '解析类', '将用户输入的技术点扩展为可检索、可分析的前沿综述范围。'],
  ['frontier-scan', '前沿情报抓取 Agent', '检索类', '抓取 GitHub、arXiv 等公开来源中的近期技术信号。'],
  ['signal-ranker', '技术信号筛选 Agent', '分析类', '按相关性、时效性、工程价值和热度筛选高价值信号。'],
  ['review-planner', '综述结构规划 Agent', '写作类', '生成适合技术负责人阅读的综述章节结构。'],
  ['review-writer', '综述撰写 Agent', '写作类', '围绕趋势、代表项目、落地路径和风险建议生成正文。'],
  ['source-formatter', '来源格式化 Agent', '格式类', '整理公开来源信号，形成可追溯来源列表。'],
  ['review-validator', '结论校验 Agent', '验证类', '检查结论是否由公开信号支持，标记待复核内容。'],
  ['docx-exporter', '文档排版 Agent', '输出类', '生成结构清晰的在线结果和格式化 Word 文档。']
];

const legacyComponentIds = [
  'literature-search',
  'pdf-parser',
  'literature-reader',
  'outline-generator',
  'content-writer',
  'duplication-checker',
  'result-validator'
];

const workflowNodes = [
  { id: 'start', label: '开始', type: 'event' },
  { id: 'topic-scope', label: '技术点定位', type: 'agent' },
  { id: 'frontier-scan', label: '前沿情报抓取', type: 'agent' },
  { id: 'signal-ranking', label: '信号筛选', type: 'agent' },
  { id: 'outline-planning', label: '综述结构规划', type: 'agent' },
  { id: 'review-writing', label: '综述撰写', type: 'agent' },
  { id: 'final-output', label: '格式化输出', type: 'agent' },
  { id: 'end', label: '结束', type: 'event' }
];

async function seed() {
  await connectDb();

  await AgentComponent.deleteMany({ componentId: { $in: legacyComponentIds } });
  await Workflow.deleteOne({ workflowId: 'paper-writing-fixed-v1' });

  for (const [componentId, name, category, description] of components) {
    await AgentComponent.updateOne(
      { componentId },
      {
        $set: {
          componentId,
          name,
          category,
          description,
          version: '1.0.0',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          implementationNote: 'MVP 使用后端内置最简 Agent 函数，后续可替换为独立沙箱组件。'
        }
      },
      { upsert: true }
    );
  }

  await Workflow.updateOne(
    { workflowId: 'frontier-review-v1' },
    {
      $set: {
        workflowId: 'frontier-review-v1',
        name: '技术点前沿综述工作流',
        description: '技术点定位 → 前沿情报抓取 → 信号筛选 → 综述结构规划 → 综述撰写 → 格式化输出',
        version: '1.0.0',
        status: 'published',
        nodes: workflowNodes,
        edges: workflowNodes.slice(0, -1).map((node, index) => ({
          source: node.id,
          target: workflowNodes[index + 1].id
        })),
        config: {
          maxDurationMinutes: 8,
          allowCancel: true,
          complianceNotice: '综述基于公开技术信号和模型分析生成，请结合原始来源复核事实。'
        }
      }
    },
    { upsert: true }
  );

  const existingIntelligence = await TechIntelligence.countDocuments();
  if (!existingIntelligence) {
    await refreshIntelligence();
  }

  console.log('Seed completed.');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
