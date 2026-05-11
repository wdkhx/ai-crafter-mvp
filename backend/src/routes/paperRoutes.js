import express from 'express';
import {
  cancelTask,
  clearHistory,
  createPaperTask,
  deleteHistoryItem,
  getTaskForUser,
  listHistory
} from '../services/taskService.js';
import { buildPaperDocx } from '../services/exportService.js';

export const paperRouter = express.Router();

paperRouter.post('/tools/paper-writing', async (req, res, next) => {
  try {
    const task = await createPaperTask(req.user, req.body);
    res.status(202).json({ data: task });
  } catch (error) {
    next(error);
  }
});

paperRouter.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const task = await getTaskForUser(req.user.id, req.params.taskId);
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

paperRouter.get('/tasks/:taskId/export.docx', async (req, res, next) => {
  try {
    const { buffer, filename } = await buildPaperDocx(req.user.id, req.params.taskId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

paperRouter.post('/tasks/:taskId/cancel', async (req, res, next) => {
  try {
    const task = await cancelTask(req.user.id, req.params.taskId);
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

paperRouter.get('/history', async (req, res, next) => {
  try {
    const history = await listHistory(req.user.id);
    res.json({ data: history });
  } catch (error) {
    next(error);
  }
});

paperRouter.get('/history/:taskId', async (req, res, next) => {
  try {
    const task = await getTaskForUser(req.user.id, req.params.taskId);
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

paperRouter.delete('/history/:taskId', async (req, res, next) => {
  try {
    await deleteHistoryItem(req.user.id, req.params.taskId);
    res.json({ data: true });
  } catch (error) {
    next(error);
  }
});

paperRouter.delete('/history', async (req, res, next) => {
  try {
    await clearHistory(req.user.id);
    res.json({ data: true });
  } catch (error) {
    next(error);
  }
});
