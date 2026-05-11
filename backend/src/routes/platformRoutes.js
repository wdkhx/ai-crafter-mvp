import express from 'express';
import {
  createComponent,
  getMetrics,
  listComponents,
  listIntelligence,
  listWorkflows,
  refreshIntelligence,
  updateWorkflow
} from '../services/platformService.js';

export const platformRouter = express.Router();

platformRouter.get('/components', async (req, res, next) => {
  try {
    res.json({ data: await listComponents() });
  } catch (error) {
    next(error);
  }
});

platformRouter.post('/components', async (req, res, next) => {
  try {
    res.status(201).json({ data: await createComponent(req.body) });
  } catch (error) {
    next(error);
  }
});

platformRouter.get('/workflows', async (req, res, next) => {
  try {
    res.json({ data: await listWorkflows() });
  } catch (error) {
    next(error);
  }
});

platformRouter.put('/workflows/:workflowId', async (req, res, next) => {
  try {
    res.json({ data: await updateWorkflow(req.params.workflowId, req.body) });
  } catch (error) {
    next(error);
  }
});

platformRouter.get('/intelligence', async (req, res, next) => {
  try {
    res.json({ data: await listIntelligence() });
  } catch (error) {
    next(error);
  }
});

platformRouter.post('/intelligence/refresh', async (req, res, next) => {
  try {
    res.json({ data: await refreshIntelligence() });
  } catch (error) {
    next(error);
  }
});

platformRouter.get('/metrics', async (req, res, next) => {
  try {
    res.json({ data: await getMetrics() });
  } catch (error) {
    next(error);
  }
});
