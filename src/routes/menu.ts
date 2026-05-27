import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { Devvit } from '@devvit/public-api';
import { reddit, redis, settings } from '@devvit/web/server';
import { recordComment } from '../core/oracle.js';

export const menu = new Hono();

type TargetPostId = `t3_${string}`;

type CustomPostSubmitter = typeof reddit & {
  submitCustomPost(options: {
    subredditName: string;
    title: string;
    postType: string;
    postData: {
      targetPostId: string;
      targetPostTitle: string;
    };
    preview: ReturnType<typeof Devvit.createElement>;
  }): Promise<{
    id: string;
    permalink: string;
  }>;
};

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack || err.message || 'Unknown Error';
  }
  return typeof err === 'string' ? err : JSON.stringify(err);
}

menu.post('/summon-oracle', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  const targetId = request.targetId;

  if (!targetId) {
    return c.json<UiResponse>(
      { showToast: 'Could not determine which post to watch.' },
      200
    );
  }

  try {
    const subreddit = await reddit.getCurrentSubreddit();
    const invokingUser = await reddit.getCurrentUser();

    if (!invokingUser) {
      return c.json<UiResponse>(
        { showToast: 'Only moderators may summon the Oracle.' },
        200
      );
    }

    const mods = await reddit.getModerators({ subredditName: subreddit.name }).all();
    const isMod = mods.some(
      (mod) => mod.id === invokingUser.id || mod.username.toLowerCase() === invokingUser.username.toLowerCase()
    );

    if (!isMod) {
      return c.json<UiResponse>(
        { showToast: 'Only moderators may summon the Oracle.' },
        200
      );
    }

    const summonedKey = `oracle:summoned:${targetId}`;
    const alreadySummoned = await redis.get(summonedKey);

    if (alreadySummoned) {
      let shouldBlockSummon = false;

      if (alreadySummoned.startsWith('t3_')) {
        try {
          const existingOraclePost =
            await reddit.getPostById(
              alreadySummoned as TargetPostId
            );

          shouldBlockSummon =
            !!existingOraclePost &&
            !existingOraclePost.removed;
        } catch {
          shouldBlockSummon = false;
        }
      }

      if (shouldBlockSummon) {
        return c.json<UiResponse>(
          {
            showToast:
              'Oracle is already watching this thread.',
          },
          200
        );
      }

      await redis.del(summonedKey);
    }

    const targetPost = await reddit.getPostById(targetId as TargetPostId);
    const targetTitle = targetPost?.title ?? 'this thread';
    const postTitle = '🔮 Oracle Watching: ' + targetTitle;
    const postData = {
      targetPostId: targetId,
      targetPostTitle: targetTitle,
    };

    // Preview is required for the experience-style post render.
    const preview = Devvit.createElement(
      'vstack',
      { height: '100%', width: '100%', alignment: 'middle center' },
      Devvit.createElement(
        'vstack',
        { gap: 'small', alignment: 'middle center' },
        Devvit.createElement('text', { size: 'large' }, postTitle),
        Devvit.createElement('text', { size: 'small', color: 'neutral-content-weak' }, 'Consult the dashboard for prophecies.')
      )
    );

    const payloadForLogs = {
      subreddit: subreddit.name,
      title: postTitle,
      postData,
    };

    console.log('[Menu][summon-oracle] validated moderator', {
      subreddit: subreddit.name,
      invokingUserId: invokingUser.id,
      invokingUsername: invokingUser.username,
      targetPostId: targetId,
    });

    console.log('[Menu][summon-oracle] submitting experience post', payloadForLogs);

    const submitted = await (reddit as CustomPostSubmitter).submitCustomPost({
      subredditName: subreddit.name,
    
      title: postTitle,
    
      postType: 'oracle-watch',
    
      postData,
    
      preview,
    });

    await Promise.all([
      redis.set(summonedKey, submitted.id),
      redis.set(
        `oracle:post:${targetId}:postTitle`,
        targetTitle
      ),
    ]);

    const oraclePostUrl = `https://www.reddit.com${submitted.permalink}`;
    const modComment = await reddit.submitComment({
      id: targetId as TargetPostId,
      text:
        '🔮 The Oracle has been summoned to watch this thread.\n' +
        `Chaos is being tracked in real time. [View the Oracle Dashboard](${oraclePostUrl})`,
    });

    await modComment.distinguish(true);

    try {
      const comments = await reddit
        .getComments({
          postId: targetId as TargetPostId,
          limit: 25,
        })
        .all();

      comments.sort(
        (a, b) =>
          a.createdAt.getTime() -
          b.createdAt.getTime()
      );

      for (const comment of comments) {
        if (!comment.body || !comment.authorName) continue;

        await recordComment(
          {
            redis,
            settings,
            reddit,
            subredditName: subreddit.name,
          },
          targetId,
          comment.body,
          comment.authorName
        );
      }
    } catch (err) {
      console.error(
        '[Menu][summon-oracle] historical seed failed:',
        formatError(err)
      );
    }

    console.log('[Menu][summon-oracle] submitPost success', {
      id: submitted?.id,
      modCommentId: modComment.id,
    });

    return c.json<UiResponse>(
      {
        showToast: 'The Oracle has been summoned to watch this thread.',
      },
      200
    );
  } catch (err) {
    const errorText = formatError(err);
    console.error('[Menu][summon-oracle] submit failed:', errorText);
    return c.json<UiResponse>(
      {
        showToast: `Oracle refused to appear: ${errorText.slice(0, 220)}`,
      },
      200
    );
  }
});

menu.post('/consult-oracle', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  const postId = request.targetId;

  if (!postId) {
    return c.json<UiResponse>(
      { showToast: 'No post selected for consultation.' },
      200
    );
  }

  return c.json<UiResponse>(
    {
      showToast:
        'Summon the Oracle dashboard (mod menu) or open it and tap "🔮 Consult the Oracle".',
    },
    200
  );
});
