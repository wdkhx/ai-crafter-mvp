import { nanoid } from 'nanoid';
import { z } from 'zod';
import { PaperTask } from '../models/PaperTask.js';
import { runPaperWorkflow } from '../workflows/paperWorkflow.js';

export const paperInputSchema = z.object({
  topic: z.string().min(4, '论文主题至少 4 个字符').max(120, '论文主题过长'),
  word_count: z.coerce.number().min(1000).max(10000),
  reference_count: z.coerce.number().min(5).max(30),
  field: z.enum(['计算机科学', '电子工程', '机械工程', '其他']),
  citation_style: z.enum(['APA', 'MLA', 'GB/T 7714-2015']),
  special_requirements: z.string().max(500).optional().default('')
});

const blockedWords = ['代写', '作弊', '抄袭', '买论文'];

export async function createPaperTask(user, payload) {
  const parsed = paperInputSchema.parse(payload);
  const joined = Object.values(parsed).join(' ');
  if (blockedWords.some((word) => joined.includes(word))) {
    const error = new Error('您输入的内容包含违规信息，请修改后重试');
    error.status = 400;
    error.code = 'CONTENT_BLOCKED';
    throw error;
  }

  const taskId = `paper_${nanoid(12)}`;
  await PaperTask.create({
    taskId,
    userId: user.id,
    input: {
      topic: parsed.topic,
      wordCount: parsed.word_count,
      referenceCount: parsed.reference_count,
      field: parsed.field,
      citationStyle: parsed.citation_style,
      specialRequirements: parsed.special_requirements
    }
  });

  setTimeout(() => {
    runPaperWorkflow(taskId).catch((error) => console.error(error));
  }, 50);

  return getTaskForUser(user.id, taskId);
}

export async function getTaskForUser(userId, taskId) {
  const task = await PaperTask.findOne({ userId, taskId }).lean();
  if (!task) {
    const error = new Error('任务不存在');
    error.status = 404;
    error.code = 'TASK_NOT_FOUND';
    throw error;
  }
  return toTaskDto(task);
}

export async function cancelTask(userId, taskId) {
  const task = await PaperTask.findOne({ userId, taskId });
  if (!task) {
    const error = new Error('任务不存在');
    error.status = 404;
    error.code = 'TASK_NOT_FOUND';
    throw error;
  }
  if (['succeeded', 'failed', 'cancelled'].includes(task.status)) {
    return toTaskDto(task.toObject());
  }
  task.status = 'cancelled';
  task.currentStep = '已取消';
  task.cancelledAt = new Date();
  task.finishedAt = new Date();
  await task.save();
  return toTaskDto(task.toObject());
}

export async function listHistory(userId) {
  const tasks = await PaperTask.find({ userId })
    .sort({ createdAt: -1 })
    .select('taskId status progress currentStep input result.metrics createdAt finishedAt')
    .lean();
  return tasks.map(toHistoryDto);
}

export async function deleteHistoryItem(userId, taskId) {
  await PaperTask.deleteOne({ userId, taskId });
}

export async function clearHistory(userId) {
  await PaperTask.deleteMany({ userId });
}

function toTaskDto(task) {
  return {
    task_id: task.taskId,
    status: task.status,
    progress: task.progress,
    current_step: task.currentStep,
    estimated_remaining_seconds: task.estimatedRemainingSeconds,
    input: toInputDto(task.input),
    workflow_trace: task.workflowTrace || [],
    result: task.result || null,
    error_message: task.errorMessage || '',
    created_at: task.createdAt,
    finished_at: task.finishedAt
  };
}

function toHistoryDto(task) {
  return {
    task_id: task.taskId,
    status: task.status,
    progress: task.progress,
    current_step: task.currentStep,
    topic: task.input?.topic,
    word_count: task.result?.metrics?.wordCount || task.input?.wordCount,
    created_at: task.createdAt,
    finished_at: task.finishedAt
  };
}

function toInputDto(input = {}) {
  return {
    topic: input.topic,
    word_count: input.wordCount,
    reference_count: input.referenceCount,
    field: input.field,
    citation_style: input.citationStyle,
    special_requirements: input.specialRequirements
  };
}
