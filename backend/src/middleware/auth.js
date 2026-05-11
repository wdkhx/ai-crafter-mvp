import { env } from '../config/env.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');

  if (!token || token !== env.apiDemoToken) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: '请提供有效的访问令牌'
    });
  }

  req.user = {
    id: req.headers['x-user-id'] || 'demo-user',
    nickname: req.headers['x-user-nickname'] || 'AI Crafter 用户'
  };
  next();
}
