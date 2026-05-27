import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnCommentCreateRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { reddit, redis, settings } from '@devvit/web/server';
import { recordComment } from '../core/oracle.js';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('Thread Oracle installed on r/' + input.subreddit?.name);
  console.log(
    '[Oracle][HTTP] Server fetch allowlist from devvit.json: Oracle proxy domain (requires app version upload + domain approval)'
  );

  return c.json<TriggerResponse>({ status: 'success' }, 200);
});

triggers.post('/on-comment-create', async (c) => {
  const input = await c.req.json<OnCommentCreateRequest>();
  const comment = input.comment;
  const postId = comment?.postId ?? input.post?.id;

  if (!comment?.body || !postId || !comment.author) {
    return c.json<TriggerResponse>({ status: 'success' }, 200);
  }

  try {
    const state = await recordComment(
      {
        redis,
        reddit,
        settings,
        subredditName: input.subreddit?.name,
      },
      postId,
      comment.body,
      comment.author
    );

    const flagKey = `oracle:flagged:${comment.author}`;
    const current = await redis.get(flagKey);

    await redis.set(
      flagKey,
      String(Number(current ?? 0) + 1)
    );

    console.log(
      `Oracle tracked comment on ${postId}: chaos=${state.chaosScore} risk=${state.riskLevel}`
    );
  } catch (err) {
    console.error('Oracle onCommentCreate failed:', err);
  }

  return c.json<TriggerResponse>({ status: 'success' }, 200);
});
