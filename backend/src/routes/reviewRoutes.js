import express from 'express';
import {
  cancelTask,
  clearHistory,
  createFrontierReviewTask,
  deleteHistoryItem,
  getTaskForUser,
  listHistory
} from '../services/taskService.js';
import { buildReviewDocx } from '../services/exportService.js';

export const reviewRouter = express.Router();

reviewRouter.post('/tools/frontier-review', async (req, res, next) => {
  try {
    const task = await createFrontierReviewTask(req.user, req.body);
    res.status(202).json({ data: task });
  } catch (error) {
    next(error);
  }
});

reviewRouter.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const task = await getTaskForUser(req.user.id, req.params.taskId);
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

reviewRouter.get('/tasks/:taskId/export.docx', async (req, res, next) => {
  try {
    const { buffer, filename } = await buildReviewDocx(req.user.id, req.params.taskId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

reviewRouter.post('/tasks/:taskId/cancel', async (req, res, next) => {
  try {
    const task = await cancelTask(req.user.id, req.params.taskId);
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

reviewRouter.get('/history', async (req, res, next) => {
  try {
    const history = await listHistory(req.user.id);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
});

reviewRouter.get('/history/:taskId', async (req, res, next) => {
  try {
    const task = await getTaskForUser(req.user.id, req.params.taskId);
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

reviewRouter.delete('/history/:taskId', async (req, res, next) => {
  try {
    await deleteHistoryItem(req.user.id, req.params.taskId);
    res.json({ data: true });
  } catch (error) {
    next(error);
  }
});

reviewRouter.delete('/history', async (req, res, next) => {
  try {
    await clearHistory(req.user.id);
    res.json({ data: true });
  } catch (error) {
    next(error);
  }
});
