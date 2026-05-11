import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: '接口不存在'
  });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: err.errors.map((item) => item.message).join('；'),
      details: err.errors
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || '服务暂时不可用'
  });
}
