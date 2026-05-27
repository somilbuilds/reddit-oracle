import { Hono } from 'hono';
import { redis, settings } from '@devvit/web/server';
import { loadPostOracleState } from '../core/oracle.js';

export const api = new Hono();

api.get('/health', (c) => c.json({ ok: true, app: 'thread-oracle' }));

api.get('/post/:postId', async (c) => {
  const postId = c.req.param('postId');
  const state = await loadPostOracleState({ redis, settings }, postId);
  return c.json(state);
});

api.get('/post/:postId/state', async (c) => {
  const postId = c.req.param('postId');
  const state = await loadPostOracleState({ redis, settings }, postId);
  return c.json(state);
});
