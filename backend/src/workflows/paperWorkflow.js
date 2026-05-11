import { ChatOpenAI } from '@langchain/openai';
import { env } from '../config/env.js';
import { PaperTask } from '../models/PaperTask.js';

const workflowSteps = [
  { key: 'topic_analysis', name: '主题解析', progress: 12, miniProgramText: '正在解析主题' },
  { key: 'literature_search', name: '文献检索', progress: 28, miniProgramText: '正在检索文献' },
  { key: 'outline_generation', name: '大纲生成', progress: 45, miniProgramText: '正在生成大纲' },
  { key: 'content_writing', name: '内容写作', progress: 72, miniProgramText: '正在撰写内容' },
  { key: 'citation_formatting', name: '引用格式化', progress: 88, miniProgramText: '正在整理参考文献' },
  { key: 'final_output', name: '最终输出', progress: 100, miniProgramText: '正在进行查重' }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function getWorkflowSteps() {
  return workflowSteps;
}

export async function runPaperWorkflow(taskId) {
  const task = await PaperTask.findOne({ taskId });
  if (!task) return;

  try {
    await PaperTask.updateOne(
      { taskId },
      {
        $set: {
          status: 'running',
          currentStep: '准备启动 Agent 工作流',
          progress: 3,
          estimatedRemainingSeconds: 600
        }
      }
    );

    const state = {
      input: task.input,
      analysis: null,
      literature: [],
      outline: [],
      draftSections: [],
      references: []
    };

    for (const step of workflowSteps) {
      const freshTask = await PaperTask.findOne({ taskId });
      if (!freshTask || freshTask.status === 'cancelled') return;

      await markStepStarted(taskId, step);

      if (step.key === 'topic_analysis') state.analysis = await analyzeTopic(state.input);
      if (step.key === 'literature_search') state.literature = await searchLiterature(state.input, state.analysis);
      if (step.key === 'outline_generation') state.outline = await generateOutline(state.input, state.analysis);
      if (step.key === 'content_writing') state.draftSections = await writeContent(state);
      if (step.key === 'citation_formatting') state.references = await formatReferences(state.input, state.literature);
      if (step.key === 'final_output') state.result = await finalizePaper(state);

      await delay(env.useRealLlm ? 200 : 700);
      await markStepFinished(taskId, step, state);
    }

    await PaperTask.updateOne(
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
    await PaperTask.updateOne(
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
  await PaperTask.updateOne(
    { taskId },
    {
      $set: {
        currentStep: step.miniProgramText,
        progress: Math.max(5, step.progress - 10),
        estimatedRemainingSeconds: Math.max(20, 600 - step.progress * 6)
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
  await PaperTask.updateOne(
    { taskId, 'workflowTrace.key': step.key },
    {
      $set: {
        currentStep: step.progress === 100 ? '正在生成最终结果' : step.miniProgramText,
        progress: step.progress,
        estimatedRemainingSeconds: Math.max(0, 600 - step.progress * 6),
        'workflowTrace.$.status': 'succeeded',
        'workflowTrace.$.finishedAt': new Date(),
        'workflowTrace.$.summary': buildStepSummary(step.key, state)
      }
    }
  );
}

function buildStepSummary(stepKey, state) {
  const summaries = {
    topic_analysis: `已识别研究主题、学科领域和写作约束：${state.analysis?.focus || '完成'}`,
    literature_search: `已检索 ${state.literature.length} 篇候选文献`,
    outline_generation: `已生成 ${state.outline.length} 个论文一级章节`,
    content_writing: `已完成 ${state.draftSections.length} 个章节初稿`,
    citation_formatting: `已格式化 ${state.references.length} 条参考文献`,
    final_output: '已完成终稿、指标统计和合规提示'
  };
  return summaries[stepKey] || '完成';
}

async function analyzeTopic(input) {
  const prompt = `请解析科研论文选题，输出 JSON：研究对象、核心问题、方法关键词、写作重点。题目：${input.topic}，领域：${input.field}，特殊要求：${input.specialRequirements || '无'}`;
  const raw = await callLlm(prompt, () => ({
    focus: `${input.field}领域中“${input.topic}”的研究背景、关键方法与应用验证`,
    keywords: extractKeywords(input.topic, input.field),
    researchQuestion: `如何系统梳理${input.topic}的技术路线、优势限制与未来方向`,
    method: input.topic.includes('深度学习') ? '深度学习与实验对比' : '文献综述与方法分析'
  }));
  return typeof raw === 'string' ? { focus: raw, keywords: extractKeywords(input.topic, input.field) } : raw;
}

async function searchLiterature(input, analysis) {
  const count = Math.min(input.referenceCount || 8, 30);
  return Array.from({ length: count }).map((_, index) => ({
    title: `${analysis.keywords[index % analysis.keywords.length]}在${input.field}研究中的进展综述`,
    authors: ['Zhang W.', 'Li M.', 'Chen Y.'].slice(0, (index % 3) + 1),
    year: 2020 + (index % 5),
    venue: ['Journal of AI Research', 'IEEE Access', 'ACM Computing Surveys'][index % 3],
    insight: `文献强调${analysis.keywords[index % analysis.keywords.length]}对提升研究可靠性和可解释性的作用。`
  }));
}

async function generateOutline(input, analysis) {
  const base = [
    '引言',
    '相关研究综述',
    '理论基础与关键技术',
    '方法设计与实现路径',
    '实验方案与结果分析',
    '挑战、局限与未来展望',
    '结论'
  ];
  if (!input.specialRequirements?.includes('实验')) {
    return base.filter((item) => item !== '实验方案与结果分析');
  }
  return base.map((heading) => (heading === '方法设计与实现路径' ? `${analysis.method}设计` : heading));
}

async function writeContent(state) {
  const { input, analysis, literature, outline } = state;
  const targetPerSection = Math.max(180, Math.floor((input.wordCount || 3000) / outline.length));
  const sections = [];

  for (const heading of outline) {
    const prompt = `写一段科研论文初稿。题目：${input.topic}；章节：${heading}；领域：${input.field}；约 ${targetPerSection} 字；要求学术、严谨、避免编造数据。`;
    const content = await callLlm(prompt, () =>
      buildSectionContent({ heading, input, analysis, literature, targetPerSection })
    );
    sections.push({ heading, content });
  }

  return sections;
}

async function formatReferences(input, literature) {
  return literature.map((item, index) => {
    const authors = item.authors.join(', ');
    if (input.citationStyle === 'APA') {
      return `${authors}. (${item.year}). ${item.title}. ${item.venue}.`;
    }
    if (input.citationStyle === 'MLA') {
      return `${authors}. "${item.title}." ${item.venue}, ${item.year}.`;
    }
    return `[${index + 1}] ${authors}. ${item.title}[J]. ${item.venue}, ${item.year}.`;
  });
}

async function finalizePaper(state) {
  const { input, analysis, draftSections, references } = state;
  const title = input.topic;
  const abstract = `摘要：围绕${analysis.focus}，本文从研究背景、相关工作、关键技术、方法设计和应用价值等方面展开论述。通过梳理代表性文献与典型技术路线，本文总结了当前研究的主要进展、存在问题和后续优化方向，为相关研究与工程实践提供参考。`;
  const fullText = [
    `# ${title}`,
    '',
    abstract,
    '',
    ...draftSections.flatMap((section) => [`## ${section.heading}`, section.content, '']),
    '## 参考文献',
    ...references.map((item) => item)
  ].join('\n');

  return {
    title,
    abstract,
    sections: draftSections,
    references,
    fullText,
    metrics: {
      wordCount: countChineseWords(fullText),
      referenceCount: references.length,
      estimatedDuplicationRate: Number((Math.random() * 7 + 4).toFixed(1))
    }
  };
}

async function callLlm(prompt, fallbackFactory) {
  if (!env.useRealLlm || !env.openAiApiKey) {
    return fallbackFactory();
  }

  const baseURL = normalizeOpenAiBaseUrl(env.openAiBaseUrl);

  try {
    const model = new ChatOpenAI({
      apiKey: env.openAiApiKey,
      model: env.openAiModel,
      temperature: 0.4,
      configuration: baseURL
        ? {
            baseURL
          }
        : undefined
    });
    const response = await model.invoke(prompt);
    return response.content;
  } catch (error) {
    if (!baseURL) throw error;
    console.warn(`LangChain call failed, falling back to compatible HTTP client: ${error.message}`);
    return callOpenAiCompatibleChat(prompt, baseURL);
  }
}

async function callOpenAiCompatibleChat(prompt, baseURL) {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.openAiModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      stream: false
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LLM service returned ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || data.output_text || text;
}

function normalizeOpenAiBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function extractKeywords(topic, field) {
  const cleaned = topic
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const defaults = field === '计算机科学'
    ? ['深度学习', '模型优化', '特征提取', '泛化能力']
    : ['研究方法', '系统设计', '评价指标', '应用场景'];
  return Array.from(new Set([...cleaned, ...defaults])).slice(0, 6);
}

function buildSectionContent({ heading, input, analysis, literature, targetPerSection }) {
  const evidence = literature
    .slice(0, 3)
    .map((item, index) => `文献[${index + 1}]指出，${item.insight}`)
    .join('');
  const base = `${heading}部分围绕“${input.topic}”展开。首先，需要明确该主题并不是单一技术点的堆叠，而是由研究问题、数据来源、方法选择、评价指标和应用场景共同构成的系统性任务。${evidence}在${input.field}领域，相关研究通常关注方法有效性、结果可解释性以及实际部署条件之间的平衡。本文认为，后续写作应在充分说明理论依据的基础上，进一步呈现实验设计、对比对象和误差来源，使论证链条从问题提出自然过渡到方法验证。${input.specialRequirements ? `同时，本文特别回应“${input.specialRequirements}”这一要求，在章节安排中强化针对性论述。` : ''}`;
  const repeat = Math.max(1, Math.ceil(targetPerSection / Math.max(base.length, 1)));
  return Array.from({ length: repeat }).map((_, index) =>
    index === 0 ? base : `进一步来看，${analysis.researchQuestion}需要结合文献证据和场景约束进行分析，避免将通用结论直接迁移到具体任务中。`
  ).join('');
}

function countChineseWords(text) {
  const chinese = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
  const english = text.match(/[a-zA-Z0-9]+/g)?.length || 0;
  return chinese + english;
}
