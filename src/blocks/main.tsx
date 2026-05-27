/** @jsx Devvit.createElement */
import { Devvit } from '@devvit/public-api';

import {
  analyzePost,
  getTargetPostId,
  loadPostOracleState,
  type RiskLevel,
} from '../core/oracle.js';

const ORACLE_POST_NAME = 'oracle-watch';

function getRiskBadgeColors(
  riskLevel: RiskLevel
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} {
  if (riskLevel === 'CRITICAL') {
    return {
      backgroundColor: '#3f0d12',
      borderColor: '#ff4d4f',
      textColor: '#ffd7d9',
    };
  }

  if (riskLevel === 'HIGH') {
    return {
      backgroundColor: '#4a2500',
      borderColor: '#ff8a00',
      textColor: '#ffe4c2',
    };
  }

  if (riskLevel === 'MEDIUM') {
    return {
      backgroundColor: '#3a3200',
      borderColor: '#f5c400',
      textColor: '#fff4b8',
    };
  }

  return {
    backgroundColor: '#0f3d2e',
    borderColor: '#2fbf71',
    textColor: '#d9ffe9',
  };
}

function getChaosBarColor(
  riskLevel: RiskLevel
): string {
  if (riskLevel === 'CRITICAL') return '#ff4d4f';

  if (riskLevel === 'HIGH') return '#ff8a00';

  if (riskLevel === 'MEDIUM') return '#f5c400';

  return '#2fbf71';
}

function getVerdictColor(verdict: string): string {
  if (verdict === 'explosive') return '#ff4d4f';

  if (verdict === 'heated') return '#ff8a00';

  if (verdict === 'warming') return '#f5c400';

  return '#2fbf71';
}

function formatUpdatedAt(updatedAt: number): string {
  if (!updatedAt) return 'Awaiting first vision';

  return new Date(updatedAt).toLocaleString();
}

function getSafeModWarning(
  modWarning: string
): string {
  const lower = modWarning.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('error') ||
    lower.includes('could not reach')
  ) {
    return 'Oracle resting between visions';
  }

  return (
    modWarning ||
    'No private warning yet. Consult the Oracle when the thread starts to heat up.'
  );
}

function clampText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

Devvit.configure({
  redditAPI: true,
  redis: true,

});

console.log(
  '[Blocks] Registering custom post type:',
  ORACLE_POST_NAME
);

Devvit.addCustomPostType({
  name: ORACLE_POST_NAME,

  description:
    '🔮 The Oracle is Watching — live thread chaos dashboard',

  height: 'tall',

  render: (context) => {
    const targetPostId = getTargetPostId(
      context.postData as
        | Record<string, unknown>
        | undefined,
      context.postId ?? ''
    );

    const [snapshot, setSnapshot] =
      context.useState(async () => {
        const deps = {
          redis: context.redis,
          reddit: context.reddit,
          settings: context.settings,
        };

        return loadPostOracleState(
          deps,
          targetPostId
        );
      });

    const [isMod] = context.useState(async () => {
      try {
        const user =
          await context.reddit.getCurrentUser();

        if (!user) return false;

        const subredditName =
          context.subredditName ??
          (
            await context.reddit.getCurrentSubreddit()
          ).name;

        const mods = await context.reddit
          .getModerators({ subredditName })
          .all();

        return mods.some(
          (mod) =>
            mod.id === user.id ||
            mod.username.toLowerCase() ===
              user.username.toLowerCase()
        );
      } catch (err) {
        console.error(
          '[Blocks] mod check failed',
          err
        );

        return false;
      }
    });

    const consultOracle = async () => {
      try {
        const deps = {
          redis: context.redis,
          reddit: context.reddit,
          settings: context.settings,
        };

        const updated = await analyzePost(
          deps,
          targetPostId,
          true
        );

        setSnapshot(updated);

        context.ui.showToast(
          '🔮 Oracle updated'
        );
      } catch (err) {
        console.error(
          '[Blocks] consult failed',
          err
        );

        context.ui.showToast(
          'Oracle ritual failed'
        );
      }
    };

    const requestSlowMode = async () => {
      context.ui.navigateTo(
        `https://www.reddit.com/r/${context.subredditName}/about/edit/#lockposts`
      );
    };

    const requestLockThread = async () => {
      context.ui.navigateTo(
        `https://www.reddit.com/r/${context.subredditName}/comments/${targetPostId.replace(
          't3_',
          ''
        )}`
      );
    };

    const riskColors = getRiskBadgeColors(
      snapshot.riskLevel
    );

    const safeModWarning = getSafeModWarning(
      snapshot.modWarning
    );

    const postData = context.postData as
      | Record<string, unknown>
      | undefined;

    const watchedPostLabel: string =
      snapshot.postTitle ||
      (typeof postData?.targetPostTitle === 'string'
        ? postData.targetPostTitle
        : 'this thread');

    const chaosWidth = `${Math.max(
      4,
      Math.min(snapshot.chaosScore, 100)
    )}%` as `${number}%`;
    const modHistory = snapshot.modHistory ?? [];
    const filteredRadar = modHistory.filter(
      (entry) =>
        entry.username !== 'prophecy-oracle' &&
        (entry.removals > 0 || entry.isBanned)
    );
    const compactProphecy = clampText(
      snapshot.prophecy,
      135
    );
    const compactModWarning = clampText(
      safeModWarning,
      125
    );

    return (
      <vstack
        padding="small"
        gap="small"
        backgroundColor="#101114"
      >
        <vstack
          padding="small"
          gap="small"
          cornerRadius="medium"
          border="thin"
          borderColor="#2b2d35"
          backgroundColor="#191b22"
        >
          <vstack gap="small">
            <hstack alignment="middle" gap="small">
              <vstack grow gap="none">
                <text
                  size="small"
                  weight="bold"
                  color="#f6f1ff"
                  wrap={true}
                  overflow="ellipsis"
                >
                  {watchedPostLabel}
                </text>

                <text
                  size="xsmall"
                  color={getChaosBarColor(snapshot.riskLevel)}
                  weight="bold"
                >
                  Chaos {snapshot.chaosScore}
                </text>
              </vstack>

              <vstack
                padding="small"
                cornerRadius="medium"
                border="thin"
                backgroundColor={riskColors.backgroundColor}
                borderColor={riskColors.borderColor}
                alignment="center middle"
              >
                <text
                  size="xsmall"
                  weight="bold"
                  color={riskColors.textColor}
                >
                  {snapshot.riskLevel}
                </text>
              </vstack>
            </hstack>

            <vstack
              height="8px"
              cornerRadius="full"
              backgroundColor="#2b2d35"
            >
              <hstack
                width={chaosWidth}
                height="100%"
                cornerRadius="full"
                backgroundColor={getChaosBarColor(
                  snapshot.riskLevel
                )}
              />
            </vstack>

            <hstack gap="small" alignment="middle">
              <text size="xsmall" color="#a8adbd">
                {snapshot.commentCount} comments
              </text>
 
              <text size="xsmall" color="#7f8494">
                Updated: {formatUpdatedAt(snapshot.updatedAt)}
              </text>
 
              {snapshot.verdict ? (
                <text
                  size="xsmall"
                  weight="bold"
                  color={getVerdictColor(snapshot.verdict)}
                >
                  {snapshot.verdict}
                </text>
              ) : null}
            </hstack>
          </vstack>
        </vstack>

        {isMod ? (
          <vstack
            padding="small"
            gap="small"
            cornerRadius="medium"
            border="thin"
            borderColor="#2b2d35"
            backgroundColor="#171a20"
          >
            <text
              size="xsmall"
              weight="bold"
              color="#f6f1ff"
            >
              User Radar
            </text>

            {filteredRadar.length ? (
              <vstack gap="small">
                {filteredRadar.slice(0, 3).map((entry) => (
                  <text
                    key={entry.username}
                    size="xsmall"
                    color={
                      entry.isBanned
                        ? '#ff4d4f'
                        : entry.removals >= 2
                          ? '#ffb25c'
                          : '#d8dce8'
                    }
                    overflow="ellipsis"
                  >
                    {entry.isBanned
                      ? `u/${entry.username} - unbanned`
                      : `u/${entry.username} - ${entry.removals} removals`}
                  </text>
                ))}
              </vstack>
            ) : (
              <text size="xsmall" color="#a8adbd">
                No flagged users detected yet
              </text>
            )}
          </vstack>
        ) : null}

        {isMod ? (
          <vstack
            grow
            padding="small"
            gap="small"
            cornerRadius="medium"
            border="thin"
            borderColor="#5f4bc4"
            backgroundColor="#201a33"
          >
            <text
              size="small"
              weight="bold"
              color="#e7ddff"
            >
              Public Prophecy
            </text>

            <text
              size="xsmall"
              color="#f7f2ff"
              wrap={true}
              overflow="ellipsis"
              maxHeight="34px"
            >
              {compactProphecy}
            </text>
          </vstack>
        ) : (
          <vstack
            grow
            padding="small"
            gap="small"
            cornerRadius="medium"
            border="thin"
            borderColor="#5f4bc4"
            backgroundColor="#201a33"
          >
            <text
              size="medium"
              weight="bold"
              color="#e7ddff"
            >
              Public Prophecy
            </text>

            <text
              size="small"
              color="#f7f2ff"
              wrap={true}
              overflow="ellipsis"
              maxHeight="34px"
            >
              {compactProphecy}
            </text>
          </vstack>
        )}

        {isMod ? (
          <vstack
            grow
            padding="small"
            gap="small"
            cornerRadius="medium"
            border="thin"
            borderColor="#653100"
            backgroundColor="#21170e"
          >
            <hstack alignment="middle" gap="small">
              <icon
                name="mod"
                size="small"
                color="#ffb25c"
              />

              <text
                size="small"
                weight="bold"
                color="#ffd9ad"
              >
                Mod Warning
              </text>
            </hstack>

            <text
              size="xsmall"
              color="#ffe8cf"
              wrap={true}
              overflow="ellipsis"
              maxHeight="34px"
            >
              {compactModWarning}
            </text>
          </vstack>
        ) : null}

        {isMod ? (
          <vstack gap="small">
            <hstack gap="medium">
              <button
                grow
                appearance="primary"
                icon="refresh"
                size="small"
                onPress={consultOracle}
              >
                Consult Oracle
              </button>

              <button
                grow
                appearance="caution"
                icon="pause"
                size="small"
                onPress={requestSlowMode}
              >
                Enable Slow Mode
              </button>
            </hstack>

            <vstack gap="small">
              <button
                grow
                appearance="destructive"
                icon="lock"
                size="small"
                onPress={requestLockThread}
              >
                Lock Thread
              </button>
            </vstack>
          </vstack>
        ) : null}
      </vstack>
    );
  },
});

export default Devvit;
