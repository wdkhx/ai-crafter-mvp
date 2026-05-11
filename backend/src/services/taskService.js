import { nanoid } from 'nanoid';
import { z } from 'zod';
import { ReviewTask } from '../models/ReviewTask.js';
import { runFrontierReviewWorkflow } from '../workflows/frontierReviewWorkflow.js';

export const frontierReviewInputSchema = z.object({
  topic: z.string().min(2, '请至少输入 2 个字符').max(80, '技术点名称过长'),
  depth: z.enum(['quick', 'standard', 'deep']).optional().default('standard'),
  audience: z.string().max(80).optional().default('技术负责人 / 研发工程师'),
  focus: z.string().max(240).optional().default('技术趋势、代表项目、落地路径')
});

const blockedWords = ['代写', '作弊', '抄袭', '买论文'];

export async function createFrontierReviewTask(user, payload) {
  const parsed = frontierReviewInputSchema.parse(payload);
  const joined = Object.values(parsed).join(' ');
  if (blockedWords.some((word) => joined.includes(word))) {
    const error = new Error('您输入的内容包含违规信息，请修改后重试');
    error.status = 400;
    error.code = 'CONTENT_BLOCKED';
    throw error;
  }

  const taskId = `review_${nanoid(12)}`;
  await ReviewTask.create({
    taskId,
    userId: user.id,
    input: {
      topic: parsed.topic,
      depth: parsed.depth,
      audience: parsed.audience,
      focus: parsed.focus
    }
  });

  setTimeout(() => {
    runFrontierReviewWorkflow(taskId).catch((error) => console.error(error));
  }, 50);

  return getTaskForUser(user.id, taskId);
}

export async function getTaskForUser(userId, taskId) {
  const task = await ReviewTask.findOne({ userId, taskId }).lean();
  if (!task) {
    const error = new Error('任务不存在');
    error.status = 404;
    error.code = 'TASK_NOT_FOUND';
    throw error;
  }
  return toTaskDto(task);
}

export async function cancelTask(userId, taskId) {
  const task = await ReviewTask.findOne({ userId, taskId });
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
  const tasks = await ReviewTask.find({ userId })
    .sort({ createdAt: -1 })
    .select('taskId status progress currentStep input result.metrics createdAt finishedAt')
    .lean();
  return tasks.map(toHistoryDto);
}

export async function deleteHistoryItem(userId, taskId) {
  await ReviewTask.deleteOne({ userId, taskId });
}

export async function clearHistory(userId) {
  await ReviewTask.deleteMany({ userId });
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
    word_count: task.result?.metrics?.wordCount || 0,
    document_type: 'frontier_review',
    signal_count: task.result?.metrics?.signalCount || 0,
    created_at: task.createdAt,
    finished_at: task.finishedAt
  };
}

function toInputDto(input = {}) {
  return {
    topic: input.topic,
    depth: input.depth,
    audience: input.audience,
    focus: input.focus
  };
}
