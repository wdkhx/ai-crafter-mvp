import axios from 'axios';
import { nanoid } from 'nanoid';
import { AgentComponent } from '../models/AgentComponent.js';
import { TechIntelligence } from '../models/TechIntelligence.js';
import { Workflow } from '../models/Workflow.js';
import { ReviewTask } from '../models/ReviewTask.js';
import { env } from '../config/env.js';

export async function listComponents() {
  return AgentComponent.find().sort({ category: 1, createdAt: 1 }).lean();
}

export async function createComponent(payload) {
  return AgentComponent.create({
    componentId: `component_${nanoid(10)}`,
    name: payload.name,
    category: payload.category,
    description: payload.description,
    inputSchema: payload.inputSchema || {},
    outputSchema: payload.outputSchema || {},
    implementationNote: payload.implementationNote || '',
    testCases: payload.testCases || []
  });
}

export async function listWorkflows() {
  return Workflow.find().sort({ updatedAt: -1 }).lean();
}

export async function updateWorkflow(workflowId, payload) {
  const workflow = await Workflow.findOneAndUpdate(
    { workflowId },
    {
      $set: {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        nodes: payload.nodes,
        edges: payload.edges,
        config: payload.config || {}
      }
    },
    { new: true }
  );
  if (!workflow) {
    const error = new Error('工作流不存在');
    error.status = 404;
    throw error;
  }
  return workflow;
}

export async function listIntelligence() {
  return TechIntelligence.find().sort({ publishedAt: -1, heatScore: -1 }).limit(50).lean();
}

export async function refreshIntelligence() {
  const githubItems = await fetchGithubAgentRepos().catch(() => []);
  const fallback = buildFallbackIntelligence();
  const items = githubItems.length > 0 ? githubItems : fallback;

  for (const item of items) {
    await TechIntelligence.updateOne(
      { itemId: item.itemId },
      { $set: item },
      { upsert: true }
    );
  }

  return listIntelligence();
}

export async function getMetrics() {
  const [totalTasks, successTasks, runningTasks, components, workflows, intelligence] = await Promise.all([
    ReviewTask.countDocuments(),
    ReviewTask.countDocuments({ status: 'succeeded' }),
    ReviewTask.countDocuments({ status: { $in: ['queued', 'running'] } }),
    AgentComponent.countDocuments(),
    Workflow.countDocuments(),
    TechIntelligence.countDocuments()
  ]);

  return {
    total_tasks: totalTasks,
    success_tasks: successTasks,
    running_tasks: runningTasks,
    success_rate: totalTasks ? Number(((successTasks / totalTasks) * 100).toFixed(1)) : 0,
    components,
    workflows,
    intelligence_items: intelligence
  };
}

async function fetchGithubAgentRepos() {
  const query = encodeURIComponent(`${env.intelligenceKeywords.join(' OR ')} stars:>100 pushed:>2025-01-01`);
  const response = await axios.get(`https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=8`, {
    timeout: 8000,
    headers: { Accept: 'application/vnd.github+json' }
  });

  return response.data.items.map((repo) => ({
    itemId: `github_${repo.id}`,
    name: repo.full_name,
    source: 'GitHub',
    url: repo.html_url,
    publishedAt: repo.pushed_at,
    summary: repo.description || '最新 Agent 相关开源项目，建议技术团队进一步评估实现细节。',
    applicationAdvice: '可评估其在前沿综述工具的情报抓取、信号排序、趋势判断或文档生成环节中的复用价值。',
    tags: ['Agent', repo.language || 'Unknown'].filter(Boolean),
    heatScore: repo.stargazers_count,
    rating: Math.min(5, Number((3.8 + Math.log10(Math.max(repo.stargazers_count, 1)) / 3).toFixed(1)))
  }));
}

function buildFallbackIntelligence() {
  const now = new Date();
  return [
    {
      itemId: 'fallback_self_corrective_rag',
      name: 'RAG with Self-Correction',
      source: 'ArXiv',
      url: 'https://arxiv.org',
      publishedAt: now,
      summary: '通过检索、生成、反思和修正循环降低事实性错误。',
      applicationAdvice: '适合用于前沿综述工具的来源核验、证据约束和结论修正环节，帮助降低幻觉率。',
      tags: ['RAG', 'Self-Correction', 'Frontier Review'],
      heatScore: 92,
      rating: 4.8
    },
    {
      itemId: 'fallback_langgraph_workflow',
      name: 'LangGraph Stateful Agent Workflow',
      source: 'LangGraph',
      url: 'https://langchain-ai.github.io/langgraph/',
      publishedAt: now,
      summary: '使用状态图组织多 Agent 流程，适合包含分支、回滚和人工审核的复杂任务。',
      applicationAdvice: '可作为后续版本替换当前最简 LangChain 线性流程的技术底座。',
      tags: ['LangGraph', 'Workflow'],
      heatScore: 88,
      rating: 4.6
    }
  ];
}
