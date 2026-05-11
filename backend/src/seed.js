import { connectDb } from './config/db.js';
import { AgentComponent } from './models/AgentComponent.js';
import { Workflow } from './models/Workflow.js';
import { TechIntelligence } from './models/TechIntelligence.js';
import { refreshIntelligence } from './services/platformService.js';

const components = [
  ['literature-search', '文献检索 Agent', '检索类', '根据论文主题、学科领域和参考文献数量检索候选学术文献。'],
  ['pdf-parser', 'PDF 解析 Agent', '阅读类', '解析 PDF 正文、摘要、作者、年份和核心图表说明。'],
  ['literature-reader', '文献阅读 Agent', '阅读类', '提取文献核心观点、方法、实验结论和可引用证据。'],
  ['outline-generator', '大纲生成 Agent', '写作类', '基于主题和文献证据生成论文详细大纲。'],
  ['content-writer', '内容写作 Agent', '写作类', '按章节生成学术论文初稿，保持结构严谨和表达规范。'],
  ['citation-formatter', '引用格式生成 Agent', '格式类', '按 APA、MLA 或 GB/T 7714-2015 输出参考文献。'],
  ['duplication-checker', '查重 Agent', '验证类', '估算重复率并对高风险段落进行改写。'],
  ['result-validator', '结果验证 Agent', '验证类', '检查论文逻辑一致性、引用覆盖度和输出完整性。']
];

const workflowNodes = [
  { id: 'start', label: '开始', type: 'event' },
  { id: 'topic-analysis', label: '主题解析', type: 'agent' },
  { id: 'literature-search', label: '文献检索', type: 'agent' },
  { id: 'outline-generation', label: '大纲生成', type: 'agent' },
  { id: 'content-writing', label: '内容写作', type: 'agent' },
  { id: 'citation-formatting', label: '引用格式化', type: 'agent' },
  { id: 'final-output', label: '最终输出', type: 'agent' },
  { id: 'end', label: '结束', type: 'event' }
];

async function seed() {
  await connectDb();

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
    { workflowId: 'paper-writing-fixed-v1' },
    {
      $set: {
        workflowId: 'paper-writing-fixed-v1',
        name: '科研论文写作工作流',
        description: '主题解析 → 文献检索 → 大纲生成 → 内容写作 → 引用格式化 → 最终输出',
        version: '1.0.0',
        status: 'published',
        nodes: workflowNodes,
        edges: workflowNodes.slice(0, -1).map((node, index) => ({
          source: node.id,
          target: workflowNodes[index + 1].id
        })),
        config: {
          maxDurationMinutes: 10,
          allowCancel: true,
          complianceNotice: '仅用于辅助写作，禁止学术不端。'
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
