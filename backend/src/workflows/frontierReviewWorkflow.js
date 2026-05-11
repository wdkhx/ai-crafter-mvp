import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { ReviewTask } from '../models/ReviewTask.js';
import { callLlm } from '../services/llmService.js';

const workflowSteps = [
  { key: 'topic_scope', name: '技术点定位', progress: 12, miniProgramText: '正在定位技术点' },
  { key: 'frontier_scan', name: '前沿情报抓取', progress: 34, miniProgramText: '正在抓取前沿信号' },
  { key: 'signal_ranking', name: '信号筛选', progress: 52, miniProgramText: '正在筛选高价值信号' },
  { key: 'outline_planning', name: '综述结构规划', progress: 68, miniProgramText: '正在规划综述结构' },
  { key: 'review_writing', name: '综述撰写', progress: 88, miniProgramText: '正在撰写综述文档' },
  { key: 'final_output', name: '格式化输出', progress: 100, miniProgramText: '正在整理最终文档' }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runFrontierReviewWorkflow(taskId) {
  const task = await ReviewTask.findOne({ taskId });
  if (!task) return;

  try {
    await ReviewTask.updateOne(
      { taskId },
      {
        $set: {
          status: 'running',
          currentStep: '准备启动前沿综述工作流',
          progress: 3,
          estimatedRemainingSeconds: 420
        }
      }
    );

    const state = {
      input: task.input,
      scope: null,
      rawSignals: [],
      signals: [],
      outline: [],
      sections: []
    };

    for (const step of workflowSteps) {
      const freshTask = await ReviewTask.findOne({ taskId });
      if (!freshTask || freshTask.status === 'cancelled') return;

      await markStepStarted(taskId, step);

      if (step.key === 'topic_scope') state.scope = await analyzeTopicScope(state.input);
      if (step.key === 'frontier_scan') state.rawSignals = await scanFrontierSignals(state.input, state.scope);
      if (step.key === 'signal_ranking') state.signals = await rankSignals(state.input, state.scope, state.rawSignals);
      if (step.key === 'outline_planning') state.outline = await planOutline(state.input, state.scope, state.signals);
      if (step.key === 'review_writing') state.sections = await writeReviewSections(state);
      if (step.key === 'final_output') state.result = await finalizeReview(state);

      await delay(180);
      await markStepFinished(taskId, step, state);
    }

    await ReviewTask.updateOne(
      { taskId },
      {
        $set: {
          status: 'succeeded',
          progress: 100,
          currentStep: '生成完成',
          estimatedRemainingSeconds: 0,
          result: state.result,
          finishedAt: new Date()
        }
      }
    );
  } catch (error) {
    await ReviewTask.updateOne(
      { taskId },
      {
        $set: {
          status: 'failed',
          currentStep: '生成失败',
          errorMessage: error.message,
          finishedAt: new Date()
        }
      }
    );
  }
}

async function markStepStarted(taskId, step) {
  await ReviewTask.updateOne(
    { taskId },
    {
      $set: {
        currentStep: step.miniProgramText,
        progress: Math.max(5, step.progress - 10),
        estimatedRemainingSeconds: Math.max(20, 420 - step.progress * 4)
      },
      $push: {
        workflowTrace: {
          key: step.key,
          name: step.name,
          status: 'running',
          startedAt: new Date()
        }
      }
    }
  );
}

async function markStepFinished(taskId, step, state) {
  await ReviewTask.updateOne(
    { taskId, 'workflowTrace.key': step.key },
    {
      $set: {
        currentStep: step.progress === 100 ? '正在生成最终文档' : step.miniProgramText,
        progress: step.progress,
        estimatedRemainingSeconds: Math.max(0, 420 - step.progress * 4),
        'workflowTrace.$.status': 'succeeded',
        'workflowTrace.$.finishedAt': new Date(),
        'workflowTrace.$.summary': buildStepSummary(step.key, state)
      }
    }
  );
}

function buildStepSummary(stepKey, state) {
  const summaries = {
    topic_scope: `已确定综述范围：${state.scope?.focus || state.input.topic}`,
    frontier_scan: `已抓取 ${state.rawSignals.length} 条 GitHub / arXiv 前沿信号`,
    signal_ranking: `已筛选 ${state.signals.length} 条高价值信号`,
    outline_planning: `已生成 ${state.outline.length} 个综述章节`,
    review_writing: `已完成 ${state.sections.length} 个章节`,
    final_output: '已完成文档排版与来源整理'
  };
  return summaries[stepKey] || '完成';
}

async function analyzeTopicScope(input) {
  const prompt = [
    '你是技术情报分析师。请把用户输入的技术点扩展成适合前沿综述的检索范围，只输出 JSON。',
    'JSON 字段：canonicalName, focus, keywords, audience, boundaries。',
    'keywords 给出 5-8 个中英文检索关键词，适合查 GitHub、arXiv、技术博客。',
    `用户输入：${input.topic}`,
    `默认读者：${input.audience || '技术负责人 / 研发工程师'}`,
    `关注方向：${input.focus || '技术趋势、代表项目、落地路径'}`
  ].join('\n');

  const raw = await callLlm(prompt, () => ({
    canonicalName: input.topic,
    focus: `${input.topic} 的近期技术演进、代表项目、关键方法和落地路径`,
    keywords: buildDefaultKeywords(input.topic),
    audience: input.audience || '技术负责人 / 研发工程师',
    boundaries: '聚焦近一年公开项目、论文与工程实践，不覆盖基础概念科普'
  }));

  return normalizeScope(raw, input);
}

async function scanFrontierSignals(input, scope) {
  const keywords = scope.keywords?.length ? scope.keywords : buildDefaultKeywords(input.topic);
  const [githubSignals, arxivSignals] = await Promise.all([
    fetchGithubSignals(keywords).catch(() => []),
    fetchArxivSignals(keywords).catch(() => [])
  ]);
  return [...githubSignals, ...arxivSignals].slice(0, 24);
}

async function fetchGithubSignals(keywords) {
  const query = encodeURIComponent(`${keywords.slice(0, 4).join(' OR ')} stars:>50 pushed:>2025-01-01`);
  const response = await axios.get(`https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=10`, {
    timeout: 10000,
    headers: { Accept: 'application/vnd.github+json' }
  });

  return response.data.items.map((repo) => ({
    source: 'GitHub',
    name: repo.full_name,
    url: repo.html_url,
    publishedAt: repo.pushed_at,
    summary: repo.description || '近期活跃的相关开源项目。',
    heatScore: repo.stargazers_count,
    tags: ['repo', repo.language].filter(Boolean)
  }));
}

async function fetchArxivSignals(keywords) {
  const query = encodeURIComponent(`all:(${keywords.slice(0, 4).join(' OR ')})`);
  const response = await axios.get(`https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=10`, {
    timeout: 10000
  });
  const parser = new XMLParser({ ignoreAttributes: false });
  const feed = parser.parse(response.data);
  const entries = Array.isArray(feed.feed?.entry) ? feed.feed.entry : feed.feed?.entry ? [feed.feed.entry] : [];

  return entries.map((entry) => ({
    source: 'arXiv',
    name: entry.title?.replace(/\s+/g, ' ').trim(),
    url: Array.isArray(entry.link) ? entry.link[0]?.['@_href'] : entry.link?.['@_href'],
    publishedAt: entry.published,
    summary: entry.summary?.replace(/\s+/g, ' ').trim(),
    heatScore: 60,
    tags: ['paper']
  }));
}

async function rankSignals(input, scope, rawSignals) {
  const deduped = dedupeSignals(rawSignals);
  if (deduped.length <= 10) return deduped;

  const signalText = deduped
    .slice(0, 20)
    .map((item, index) => `${index + 1}. [${item.source}] ${item.name} - ${item.summary?.slice(0, 180)} (${item.url})`)
    .join('\n');
  const prompt = [
    '请从以下技术信号中筛选最适合写入前沿综述的 8-10 条，只输出 JSON 数组。',
    '每个元素字段：index, reason, trendTag。',
    `综述主题：${input.topic}`,
    `综述范围：${scope.focus}`,
    signalText
  ].join('\n');

  const raw = await callLlm(prompt, () =>
    deduped.slice(0, 10).map((_, index) => ({ index: index + 1, reason: '与主题相关且近期活跃', trendTag: 'frontier' }))
  );
  const selected = parseJsonArray(raw)
    .map((item) => deduped[Number(item.index) - 1])
    .filter(Boolean);
  return selected.length ? selected : deduped.slice(0, 10);
}

async function planOutline(input, scope, signals) {
  const prompt = [
    '请为技术点前沿综述设计 5 个章节标题，只输出 JSON 数组。',
    '标题应适合技术负责人快速阅读，覆盖：概览、关键方向、代表项目/论文、落地路径、风险与建议。',
    `主题：${input.topic}`,
    `范围：${scope.focus}`,
    `可用信号数量：${signals.length}`
  ].join('\n');
  const raw = await callLlm(prompt, () => [
    '一、前沿概览',
    '二、关键技术方向',
    '三、代表项目与研究信号',
    '四、工程落地路径',
    '五、风险判断与下一步建议'
  ]);
  const parsed = parseJsonArray(raw);
  return parsed.length ? parsed.map(String).slice(0, 6) : [
    '一、前沿概览',
    '二、关键技术方向',
    '三、代表项目与研究信号',
    '四、工程落地路径',
    '五、风险判断与下一步建议'
  ];
}

async function writeReviewSections(state) {
  const { input, scope, signals, outline } = state;
  const signalText = signals
    .map((item, index) => `[${index + 1}] ${item.source} · ${item.name}：${item.summary?.slice(0, 220)} ${item.url}`)
    .join('\n');

  const sections = [];
  for (const heading of outline) {
    const prompt = [
      '你是克制、准确的技术前沿分析师。请撰写一个中文综述章节。',
      '只输出 JSON：{"content":"2-4段正文","bullets":["3-5条要点"]}。',
      '要求：信息密度高，避免宣传腔；结论必须能从给定信号或常识性技术判断推出；不要编造不存在的项目指标。',
      `主题：${input.topic}`,
      `章节：${heading}`,
      `读者：${scope.audience}`,
      `综述范围：${scope.focus}`,
      `前沿信号：\n${signalText}`
    ].join('\n');
    const raw = await callLlm(prompt, () => ({
      content: buildFallbackSection(heading, input, scope, signals),
      bullets: buildFallbackBullets(signals)
    }));
    sections.push({ heading, ...normalizeSection(raw, heading, input, scope, signals) });
  }
  return sections;
}

async function finalizeReview(state) {
  const { input, scope, signals, sections } = state;
  const summaryPrompt = [
    '请为技术前沿综述生成 180-240 字执行摘要，只输出正文。',
    `主题：${input.topic}`,
    `范围：${scope.focus}`,
    `章节：${sections.map((item) => item.heading).join('、')}`,
    `信号：${signals.slice(0, 8).map((item) => `${item.source}:${item.name}`).join('；')}`
  ].join('\n');
  const executiveSummary = await callLlm(summaryPrompt, () => `${input.topic} 正处在从概念验证走向工程化分层的阶段。近期信号显示，开源框架、状态化工作流、检索增强、工具调用和评测监控正在形成相对清晰的技术栈。对团队而言，短期更适合围绕可观测、可回滚、可评估的任务型场景落地，而不是直接追求完全自治。`);
  const title = `${scope.canonicalName || input.topic} 前沿综述`;
  const subtitle = `基于 GitHub / arXiv 近期公开信号生成 · ${new Date().toLocaleDateString('zh-CN')}`;
  const fullText = [
    `# ${title}`,
    subtitle,
    '',
    `## 执行摘要`,
    executiveSummary,
    '',
    ...sections.flatMap((section) => [
      `## ${section.heading}`,
      section.content,
      ...(section.bullets?.length ? ['', ...section.bullets.map((item) => `- ${item}`)] : []),
      ''
    ]),
    '## 来源信号',
    ...signals.map((item, index) => `[${index + 1}] ${item.source}. ${item.name}. ${item.url}`)
  ].join('\n');

  return {
    title,
    subtitle,
    executiveSummary,
    sections,
    signals,
    fullText,
    metrics: {
      wordCount: countChineseWords(fullText),
      signalCount: signals.length,
      generatedAt: new Date()
    }
  };
}

function normalizeScope(raw, input) {
  const fallback = {
    canonicalName: input.topic,
    focus: `${input.topic} 的近期技术演进、代表项目、关键方法和落地路径`,
    keywords: buildDefaultKeywords(input.topic),
    audience: input.audience || '技术负责人 / 研发工程师',
    boundaries: '聚焦近一年公开项目、论文与工程实践'
  };
  if (typeof raw !== 'string') return { ...fallback, ...raw, keywords: raw.keywords || fallback.keywords };
  const parsed = parseJsonObject(raw);
  return { ...fallback, ...parsed, keywords: parsed.keywords || fallback.keywords };
}

function normalizeSection(raw, heading, input, scope, signals) {
  const fallback = {
    content: buildFallbackSection(heading, input, scope, signals),
    bullets: buildFallbackBullets(signals)
  };
  if (typeof raw !== 'string') return { ...fallback, ...raw };
  const parsed = parseJsonObject(raw);
  return {
    content: parsed.content || raw.replace(/^```json|```$/g, '').trim() || fallback.content,
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : fallback.bullets
  };
}

function parseJsonObject(text) {
  if (typeof text !== 'string') return text || {};
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return {};
  try {
    return JSON.parse(jsonText);
  } catch {
    return {};
  }
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const jsonText = value.match(/\[[\s\S]*\]/)?.[0];
  if (!jsonText) return [];
  try {
    return JSON.parse(jsonText);
  } catch {
    return [];
  }
}

function dedupeSignals(signals) {
  const seen = new Set();
  return signals.filter((item) => {
    const key = `${item.source}:${item.name}`.toLowerCase();
    if (seen.has(key) || !item.name) return false;
    seen.add(key);
    return true;
  });
}

function buildDefaultKeywords(topic) {
  const normalized = topic.trim();
  const map = {
    Agent: ['AI Agent', 'LLM Agent', 'agent workflow', 'tool calling', 'multi-agent', 'LangGraph', 'RAG agent'],
    agent: ['AI Agent', 'LLM Agent', 'agent workflow', 'tool calling', 'multi-agent', 'LangGraph', 'RAG agent']
  };
  return map[normalized] || [normalized, `${normalized} agent`, `${normalized} framework`, `${normalized} workflow`, `${normalized} survey`];
}

function buildFallbackSection(heading, input, scope, signals) {
  const signalNames = signals.slice(0, 4).map((item) => item.name).join('、') || '近期公开项目与论文';
  return `${heading}部分围绕${scope.focus}展开。近期可观察信号包括${signalNames}。这些信号表明，${input.topic} 的前沿探索正在从单点能力展示转向可组合、可评估、可监控的工程体系。对研发团队而言，更关键的问题不再是模型能否完成单次任务，而是任务分解、上下文管理、工具调用、结果验证和失败恢复是否形成稳定闭环。`;
}

function buildFallbackBullets(signals) {
  return [
    `优先关注近期活跃且有清晰工程边界的项目，当前已抓取 ${signals.length} 条公开信号。`,
    '落地时应先选低风险、可验收、可回滚的任务型场景。',
    '需要同步建设评测、日志、人工审核和成本监控。'
  ];
}

function countChineseWords(text) {
  const chinese = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
  const english = text.match(/[a-zA-Z0-9]+/g)?.length || 0;
  return chinese + english;
}
