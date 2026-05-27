type OracleRedis = {
  get(key: string): Promise<string | undefined>;
  set(
    key: string,
    value: string,
    options?: {
      nx?: boolean;
      xx?: boolean;
      expiration?: Date;
    }
  ): Promise<string>;
};

type OracleSettings = {
  get<T = string>(name: string): Promise<T | undefined>;
};

type ModHistoryEntry = {
  username: string;
  removals: number;
  isBanned: boolean;
};

type VerdictHistoryEntry = {
  score: number;
  verdict: string;
  timestamp: number;
};

type OracleReddit = {
  getPostById(
    postId: string
  ): Promise<{ title: string } | undefined>;
  getModLog?(options: {
    subredditName: string;
    type: 'removecomment';
  }): { all(): Promise<unknown[]> };
  getModerationLog?(options: {
    subredditName: string;
    type: 'removecomment';
  }): { all(): Promise<unknown[]> };
  getBannedUsers(options: {
    subredditName: string;
    username?: string;
  }): { all(): Promise<unknown[]> };
};

const CONFLICT_KEYWORDS = [
  'actually',
  'wrong',
  'cope',
  'ratio',
  'skill issue',
  'you people',
  'typical',
  'lol no',
] as const;

const SARCASM_PATTERNS = [
  '/s',
  'sure jan',
  'oh totally',
  'clearly',
  'obviously',
  'suuure',
  'riiight',
  'wow so',
  'great logic',
  'genius',
  'big brain',
  'congratulations',
  'wow thanks',
  'oh wow',
  'totally not',
  'definitely not',
  'sure buddy',
  'k buddy',
  'cool story',
  'sure thing',
] as const;

const CHAOS_THRESHOLD = 55;
const ORACLE_PROXY_DEFAULT_URL = 'https://groq-api-proxy-server-36dd.onrender.com/oracle';
const AI_COOLDOWN_MS = 2 * 60 * 1000;
const FORCE_AI_COOLDOWN_MS = 30 * 1000;
const AI_DEBOUNCE_MS = 30 * 1000;
const AI_LOCK_MS = 90 * 1000;
const MEANINGFUL_CHAOS_DELTA = 15;
const VELOCITY_WINDOW_MS = 2 * 60 * 1000;
const VELOCITY_HIGH_COUNT = 5;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PostOracleState = {
  commentCount: number;
  timestamps: number[];
  conflictScore: number;
  sarcasmScore: number;
  commenters: string[];
  chaosScore: number;
  riskLevel: RiskLevel;
  modWarning: string;
  prophecy: string;
  updatedAt: number;
  postTitle?: string;
  recentCommentSnippets?: string[];
  verdict?: string;
  aiTemperature?: number;
  aiAggression?: number;
  aiSarcasm?: number;
  commentsSinceAi?: number;
  modHistory?: ModHistoryEntry[];
  verdictHistory?: VerdictHistoryEntry[];
  peakChaos?: number;
  threadAge?: number;
  lastAiRunAt?: number;
  lastAiChaosScore?: number;
  lastAiRiskLevel?: RiskLevel;
  pendingAnalysisAt?: number;
};

export type OracleDeps = {
  redis: OracleRedis;
  settings: OracleSettings;
  reddit?: OracleReddit;
  subredditName?: string | undefined;
};

function postKey(postId: string, field: string): string {
  return `oracle:post:${postId}:${field}`;
}

function countKeywordHits(
  text: string,
  keywords: readonly string[]
): number {
  const lower = text.toLowerCase();

  let hits = 0;

  for (const keyword of keywords) {
    if (lower.includes(keyword)) hits += 1;
  }

  return hits;
}

function countRecentComments(
  timestamps: number[],
  now: number
): number {
  const cutoff = now - VELOCITY_WINDOW_MS;

  return timestamps.filter((ts) => ts >= cutoff).length;
}

function detectDogpile(commenters: string[]): boolean {
  if (commenters.length < 4) return false;

  const counts = new Map<string, number>();

  for (const name of commenters) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const sorted = [...counts.values()].sort((a, b) => b - a);

  const topThree = sorted
    .slice(0, 3)
    .reduce((sum, n) => sum + n, 0);

  return topThree / commenters.length >= 0.6;
}

export function calculateChaosScore(state: {
  timestamps: number[];
  conflictScore: number;
  sarcasmScore: number;
  commenters: string[];
  flaggedUsers: string[];
  extras: {
    capsScore: number;
    angerPunct: number;
    dismissive: number;
    aiTemp: number;
    aiAgg: number;
  };
}): number {
  const now = Date.now();

  const recentCount = countRecentComments(
    state.timestamps,
    now
  );

  let score = 0;

  if (recentCount > VELOCITY_HIGH_COUNT) {
    score += 30;
  } else {
    score += Math.min(recentCount * 5, 25);
  }

  score += Math.min(state.conflictScore * 5, 25);

  score += Math.min(state.sarcasmScore * 4, 20);

  if (detectDogpile(state.commenters)) {
    score += 25;
  }

  if (state.flaggedUsers.length >= 3) {
    score += 20;
  } else if (state.flaggedUsers.length > 0) {
    score += 10;
  }

  score += Math.min(state.extras.capsScore, 10);
  score += Math.min(state.extras.angerPunct, 8);
  score += Math.min(state.extras.dismissive, 8);
  score += Math.min(state.extras.aiTemp, 15);
  score += Math.min(state.extras.aiAgg, 10);

  return Math.min(100, Math.round(score));
}

export function riskLevelFromChaos(
  chaosScore: number
): RiskLevel {
  if (chaosScore >= 80) return 'CRITICAL';

  if (chaosScore >= 60) return 'HIGH';

  if (chaosScore >= 40) return 'MEDIUM';

  return 'LOW';
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return (
    value === 'LOW' ||
    value === 'MEDIUM' ||
    value === 'HIGH' ||
    value === 'CRITICAL'
  );
}

export function suggestedActionForChaos(
  chaosScore: number
): string {
  if (chaosScore >= 80) {
    return 'Consider locking thread, mod intervention likely needed';
  }

  if (chaosScore >= 60) {
    return 'Enable slow mode, watch for brigading';
  }

  if (chaosScore >= 40) {
    return 'Monitor thread closely, consider slow mode';
  }

  return 'Thread is calm — no mod action needed yet';
}

export function modActionSuggestions(): string[] {
  return [
    'Enable Slow Mode',
    'Monitor Brigading',
    'Prepare Lock',
  ];
}

export function describeChaos(
  state: PostOracleState
): string {
  const recentCount = countRecentComments(
    state.timestamps,
    Date.now()
  );

  const parts: string[] = [];

  if (recentCount > VELOCITY_HIGH_COUNT) {
    parts.push('reply velocity is spiking');
  } else if (recentCount > 0) {
    parts.push('conversation is warming up');
  }

  if (state.conflictScore >= 6) {
    parts.push('arguments are entrenched and combative');
  } else if (state.conflictScore >= 3) {
    parts.push('tone is getting argumentative');
  }

  if (state.sarcasmScore >= 5) {
    parts.push('sarcasm is dripping from every reply');
  } else if (state.sarcasmScore >= 2) {
    parts.push('sarcasm and side-eye are showing up');
  }

  if (detectDogpile(state.commenters)) {
    parts.push(
      'a small cluster of users is circling the thread'
    );
  }

  if (!parts.length) {
    return 'The thread hums quietly; the storm has not yet formed.';
  }

  return parts.join('; ') + '.';
}

async function readJsonArray(
  redis: OracleRedis,
  key: string
): Promise<string[]> {
  const raw = await redis.get(key);

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (v): v is string => typeof v === 'string'
        )
      : [];
  } catch {
    return [];
  }
}

async function readModHistory(
  redis: OracleRedis,
  key: string
): Promise<ModHistoryEntry[]> {
  const raw = await redis.get(key);

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is ModHistoryEntry =>
            !!entry &&
            typeof entry === 'object' &&
            typeof (
              entry as ModHistoryEntry
            ).username === 'string' &&
            typeof (
              entry as ModHistoryEntry
            ).removals === 'number' &&
            typeof (
              entry as ModHistoryEntry
            ).isBanned === 'boolean'
        )
      : [];
  } catch {
    return [];
  }
}

async function readVerdictHistory(
  redis: OracleRedis,
  key: string
): Promise<VerdictHistoryEntry[]> {
  const raw = await redis.get(key);

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is VerdictHistoryEntry =>
            !!entry &&
            typeof entry === 'object' &&
            typeof (
              entry as VerdictHistoryEntry
            ).score === 'number' &&
            typeof (
              entry as VerdictHistoryEntry
            ).verdict === 'string' &&
            typeof (
              entry as VerdictHistoryEntry
            ).timestamp === 'number'
        )
      : [];
  } catch {
    return [];
  }
}

async function readTimestamps(
  redis: OracleRedis,
  key: string
): Promise<number[]> {
  const raw = await redis.get(key);

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter(
          (v): v is number => typeof v === 'number'
        )
      : [];
  } catch {
    return [];
  }
}

async function readFlaggedUsers(
  redis: OracleRedis,
  commenters: string[]
): Promise<string[]> {
  const flaggedUsers: string[] = [];

  for (const commenter of commenters) {
    const flagCount = Number(
      (await redis.get(`oracle:flagged:${commenter}`)) ?? 0
    );

    if (flagCount > 0) {
      flaggedUsers.push(commenter);
    }
  }

  return flaggedUsers;
}

export async function checkUserModHistory(
  reddit: OracleReddit | undefined,
  subredditName: string | undefined,
  username: string
): Promise<ModHistoryEntry> {
  if (!reddit || !subredditName) {
    return {
      username,
      removals: 0,
      isBanned: false,
    };
  }

  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const modLog = reddit.getModLog
      ? reddit.getModLog({
          subredditName,
          type: 'removecomment',
        })
      : reddit.getModerationLog?.({
          subredditName,
          type: 'removecomment',
        });
    const actions = modLog ? await modLog.all() : [];
    const removals = actions.filter((action) => {
      const entry = action as {
        createdAt?: Date | string | number;
        target?: { author?: string };
      };
      const createdAt = entry.createdAt
        ? new Date(entry.createdAt).getTime()
        : 0;

      return (
        createdAt >= cutoff &&
        entry.target?.author?.toLowerCase() ===
          username.toLowerCase()
      );
    }).length;
    const bannedUsers = await reddit
      .getBannedUsers({
        subredditName,
        username,
      })
      .all();
    const isBanned = bannedUsers.some((user) => {
      const entry = user as {
        username?: string;
        name?: string;
      };
      const bannedName = entry.username ?? entry.name;

      return (
        bannedName?.toLowerCase() ===
        username.toLowerCase()
      );
    });

    return {
      username,
      removals,
      isBanned,
    };
  } catch (err) {
    console.error(
      '[Oracle] failed to check user mod history',
      username,
      err
    );

    return {
      username,
      removals: 0,
      isBanned: false,
    };
  }
}

async function fetchPostTitle(
  deps: OracleDeps,
  postId: string
): Promise<string | undefined> {
  try {
    const post = await deps.reddit?.getPostById(postId);

    return post?.title;
  } catch (err) {
    console.error(
      '[Oracle] failed to fetch post title',
      postId,
      err
    );

    return undefined;
  }
}

export async function loadPostOracleState(
  deps: OracleDeps,
  postId: string
): Promise<PostOracleState> {
  const { redis } = deps;

  const [
    commentCountRaw,
    timestamps,
    conflictScoreRaw,
    sarcasmScoreRaw,
    commenters,
    chaosScoreRaw,
    modWarning,
    prophecy,
    postTitle,
    recentCommentSnippets,
    verdict,
    aiTemperatureRaw,
    aiAggressionRaw,
    aiSarcasmRaw,
    commentsSinceAiRaw,
    modHistory,
    verdictHistory,
    peakChaosRaw,
    threadAgeRaw,
    updatedAtRaw,
    lastAiRunAtRaw,
    lastAiChaosScoreRaw,
    lastAiRiskLevel,
    pendingAnalysisAtRaw,
  ] = await Promise.all([
    redis.get(postKey(postId, 'commentCount')),
    readTimestamps(redis, postKey(postId, 'timestamps')),
    redis.get(postKey(postId, 'conflictScore')),
    redis.get(postKey(postId, 'sarcasmScore')),
    readJsonArray(redis, postKey(postId, 'commenters')),
    redis.get(postKey(postId, 'chaosScore')),
    redis.get(postKey(postId, 'modWarning')),
    redis.get(postKey(postId, 'prophecy')),
    redis.get(postKey(postId, 'postTitle')),
    readJsonArray(
      redis,
      postKey(postId, 'recentCommentSnippets')
    ),
    redis.get(postKey(postId, 'verdict')),
    redis.get(postKey(postId, 'aiTemperature')),
    redis.get(postKey(postId, 'aiAggression')),
    redis.get(postKey(postId, 'aiSarcasm')),
    redis.get(postKey(postId, 'commentsSinceAi')),
    readModHistory(redis, postKey(postId, 'modHistory')),
    readVerdictHistory(
      redis,
      postKey(postId, 'verdictHistory')
    ),
    redis.get(postKey(postId, 'peakChaos')),
    redis.get(postKey(postId, 'threadAge')),
    redis.get(postKey(postId, 'updatedAt')),
    redis.get(postKey(postId, 'lastAiRunAt')),
    redis.get(postKey(postId, 'lastAiChaosScore')),
    redis.get(postKey(postId, 'lastAiRiskLevel')),
    redis.get(postKey(postId, 'pendingAnalysisAt')),
  ]);

  const chaosScore = Number(chaosScoreRaw ?? 0);

  const state: PostOracleState = {
    commentCount: Number(commentCountRaw ?? 0),
    timestamps,
    conflictScore: Number(conflictScoreRaw ?? 0),
    sarcasmScore: Number(sarcasmScoreRaw ?? 0),
    commenters,
    chaosScore,
    riskLevel: riskLevelFromChaos(chaosScore),
    modWarning: modWarning ?? '',
    prophecy:
      prophecy ??
      'The Oracle stirs from slumber… comment more and destiny shall unfold.',
    updatedAt: Number(updatedAtRaw ?? 0),
    recentCommentSnippets,
    aiTemperature: Number(aiTemperatureRaw ?? 0),
    aiAggression: Number(aiAggressionRaw ?? 0),
    aiSarcasm: Number(aiSarcasmRaw ?? 0),
    commentsSinceAi: Number(commentsSinceAiRaw ?? 0),
    modHistory,
    verdictHistory,
    peakChaos: Number(peakChaosRaw ?? chaosScore),
    threadAge: Number(threadAgeRaw ?? 0),
    lastAiRunAt: Number(lastAiRunAtRaw ?? 0),
    lastAiChaosScore: Number(lastAiChaosScoreRaw ?? 0),
    pendingAnalysisAt: Number(pendingAnalysisAtRaw ?? 0),
  };

  if (isRiskLevel(lastAiRiskLevel)) {
    state.lastAiRiskLevel = lastAiRiskLevel;
  }

  if (postTitle) {
    state.postTitle = postTitle;
  }

  if (verdict) {
    state.verdict = verdict;
  }

  return state;
}

type OracleProxyAnalysis = {
  modWarning: string;
  prophecy: string;
  temperature?: number;
  aggression: number;
  sarcasm: number;
  verdict: string;
  generated?: boolean;
};

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(10, Math.round(value)));
}

function normalizeVerdict(value: unknown): string {
  if (
    value === 'calm' ||
    value === 'warming' ||
    value === 'heated' ||
    value === 'explosive'
  ) {
    return value;
  }

  return 'warming';
}

function parseOracleProxyJson(
  result: unknown,
  fallbackTemperature: number
): OracleProxyAnalysis | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const data = result as Record<string, unknown>;
  const modWarning = String(data.modWarning ?? '').trim();
  const prophecy = String(
    data.publicProphecy ?? data.prophecy ?? ''
  ).trim();

  if (!modWarning || !prophecy) {
    return null;
  }

  return {
    modWarning,
    prophecy,
    temperature: fallbackTemperature,
    aggression: clampScore(data.aggression),
    sarcasm: clampScore(data.sarcasm),
    verdict: normalizeVerdict(data.verdict),
  };
}

async function callOracleProxy(
  proxyUrl: string,
  payload: {
    postTitle: string;
    comments: string[];
    chaosScore: number;
    riskLevel: RiskLevel;
  },
  fallbackTemperature: number
): Promise<OracleProxyAnalysis | undefined> {
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Proxy error ${response.status}: ${body.slice(0, 500)}`
    );
  }

  const json = await response.json();
  const parsed = parseOracleProxyJson(
    json,
    fallbackTemperature
  );

  if (!parsed) {
    throw new Error('Proxy returned invalid Oracle JSON');
  }

  return parsed;
}

async function callGemini(
  payload: {
    postTitle: string;
    comments: string[];
    chaosScore: number;
    riskLevel: RiskLevel;
  },
  geminiApiKey: string,
  fallbackTemperature: number
): Promise<OracleProxyAnalysis | undefined> {
  const prompt = `You are a Reddit moderation assistant. Return ONLY a JSON object, no markdown, no extra text.

Thread: ${payload.postTitle}
Chaos: ${payload.chaosScore}/100  Risk: ${payload.riskLevel}
Comments: ${payload.comments.map((c, i) => `${i + 1}. ${c}`).join(' | ')}

JSON: {"publicProphecy":"<2 funny sentences about what Reddit archetype is arriving>","modWarning":"<2 sentences on conflict forming and what mod should do>","verdict":"<calm or warming or heated or explosive>","aggression":<0-10>,"sarcasm":<0-10>}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: { text?: string }) => p.text ?? '').join('');
  console.log('[Oracle][Gemini RAW]', text);

  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (!match) {
      throw new Error(`Gemini returned non-JSON: ${cleaned.slice(0, 200)}`);
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      const prophecyMatch = cleaned.match(/"publicProphecy"\s*:\s*"([^"]+)"/);
      const warningMatch = cleaned.match(/"modWarning"\s*:\s*"([^"]+)"/);
      if (prophecyMatch || warningMatch) {
        parsed = {
          publicProphecy: prophecyMatch?.[1] ?? '',
          modWarning: warningMatch?.[1] ?? '',
          verdict: 'warming',
          aggression: 5,
          sarcasm: 3,
        };
      } else {
        throw new Error(`Gemini JSON parse failed: ${cleaned.slice(0, 200)}`);
      }
    }
  }

  const result = parseOracleProxyJson(parsed, fallbackTemperature);
  if (!result) {
    throw new Error('Gemini response failed schema validation');
  }

  return result;
}

async function getOracleProxyUrl(
  settings: OracleSettings
): Promise<string> {
  const envUrl =
    typeof process !== 'undefined'
      ? process.env.ORACLE_PROXY_URL
      : undefined;
  const configured =
    (await settings.get<string>('oracle_proxy_url')) ??
    (await settings.get<string>('ORACLE_PROXY_URL')) ??
    envUrl;

  return configured?.trim() || ORACLE_PROXY_DEFAULT_URL;
}

function proxyFallbackPredictions(): {
  modWarning: string;
  prophecy: string;
} {
  return {
    modWarning:
      'Oracle is resting between visions. Check back shortly.',

    prophecy:
      'The crystal ball cracked mid-vision. The Oracle remains uneasy.',
  };
}

function currentProxySnapshot(
  state: PostOracleState
): OracleProxyAnalysis {
  return {
    modWarning: state.modWarning,
    prophecy: state.prophecy,
    temperature: state.aiTemperature ?? 0,
    aggression: state.aiAggression ?? 0,
    sarcasm: state.aiSarcasm ?? 0,
    verdict: state.verdict ?? 'warming',
    generated: false,
  };
}

async function generatePredictions(
  deps: OracleDeps,
  postId: string,
  chaosScore: number,
  state: PostOracleState,
  existingState: PostOracleState,
  force: boolean
): Promise<OracleProxyAnalysis> {
  const cooldownKey = `oracle:ai:cooldown:${postId}`;
  const lockKey = `oracle:ai:lock:${postId}`;
  const now = Date.now();
  const cooldownMs = force
    ? FORCE_AI_COOLDOWN_MS
    : AI_COOLDOWN_MS;
  const cooldownFallback = currentProxySnapshot(existingState);

  if (!force) {
    const pendingAt =
      state.pendingAnalysisAt ?? existingState.pendingAnalysisAt ?? 0;
    const lastActivityAt = existingState.updatedAt ?? 0;

    if (
      !pendingAt ||
      (lastActivityAt > 0 &&
        now - lastActivityAt < AI_DEBOUNCE_MS)
    ) {
      console.log(
        '[Oracle][Groq] skipped: debounce',
        postId
      );

      return cooldownFallback;
    }

    const lastChaos =
      existingState.lastAiChaosScore ?? chaosScore;
    const lastRisk =
      existingState.lastAiRiskLevel ?? state.riskLevel;
    const riskChanged = lastRisk !== state.riskLevel;
    const chaosDelta = Math.abs(chaosScore - lastChaos);

    if (
      !riskChanged &&
      chaosDelta < MEANINGFUL_CHAOS_DELTA
    ) {
      console.log(
        '[Oracle][Groq] skipped: insignificant change',
        postId,
        'chaosDelta=',
        chaosDelta,
        'risk=',
        state.riskLevel
      );

      return cooldownFallback;
    }
  }

  const lockAcquired = await deps.redis.set(
    lockKey,
    String(now),
    {
      nx: true,
      expiration: new Date(now + AI_LOCK_MS),
    }
  );

  if (lockAcquired !== 'OK') {
    console.log(
      '[Oracle][Groq] skipped: already running',
      postId
    );

    return cooldownFallback;
  }

  const acquired = await deps.redis.set(
    cooldownKey,
    String(now),
    {
      nx: true,
      expiration: new Date(now + cooldownMs),
    }
  );

  if (acquired !== 'OK') {
    const lastCall = await deps.redis.get(cooldownKey);

    if (
      lastCall &&
      now - Number(lastCall) < cooldownMs
    ) {
      console.log(
        '[Oracle][Groq] skipped: cooldown',
        postId,
        'remainingMs=',
        cooldownMs - (now - Number(lastCall))
      );

      return cooldownFallback;
    }

    await deps.redis.set(
      cooldownKey,
      String(now),
      {
        expiration: new Date(now + cooldownMs),
      }
    );
  }

  const proxyUrl = await getOracleProxyUrl(
    deps.settings
  );

  if (!proxyUrl) {
    console.warn(
      '[Oracle][Groq] oracle_proxy_url is not configured; skipping AI generation for post',
      postId
    );

    return {
      modWarning:
        'Oracle proxy URL is not configured. Add it in app settings to enable AI warnings.',

      prophecy:
        'The Oracle squints into the void but cannot find its Groq proxy.',
      temperature: existingState.aiTemperature ?? 0,
      aggression: existingState.aiAggression ?? 0,
      sarcasm: existingState.aiSarcasm ?? 0,
      verdict: existingState.verdict ?? 'warming',
    };
  }

  const postTitle =
    state.postTitle ??
    (await fetchPostTitle(deps, postId));

  try {
    console.log(
      '[Oracle][Groq] generating...',
      postId,
      'chaos=',
      chaosScore,
      'risk=',
      state.riskLevel
    );

    const analysis = await callOracleProxy(
      proxyUrl,
      {
        postTitle: postTitle ?? 'unknown',
        comments: state.recentCommentSnippets?.slice(-5) ?? [],
        chaosScore,
        riskLevel: state.riskLevel,
      },
      existingState.aiTemperature ?? 0
    );

    if (!analysis) {
      return {
        ...cooldownFallback,
        ...proxyFallbackPredictions(),
      };
    }

    console.log(
      '[Oracle][Groq] success',
      postId
    );

    await Promise.all([
      deps.redis.set(
        postKey(postId, 'lastAiRunAt'),
        String(now)
      ),
      deps.redis.set(
        postKey(postId, 'lastAiChaosScore'),
        String(chaosScore)
      ),
      deps.redis.set(
        postKey(postId, 'lastAiRiskLevel'),
        state.riskLevel
      ),
      deps.redis.set(
        postKey(postId, 'pendingAnalysisAt'),
        ''
      ),
    ]);

    return {
      ...analysis,
      generated: true,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);

    console.error(
      '[Oracle][Groq] failed',
      postId,
      message
    );

    // Gemini fallback — only runs when Groq proxy is unreachable
    try {
      const geminiKey = await deps.settings.get<string>('gemini_api_key');

      if (geminiKey) {
        console.log('[Oracle][Gemini] attempting fallback...', postId);

        const geminiAnalysis = await callGemini(
          {
            postTitle: state.postTitle ?? 'unknown',
            comments: state.recentCommentSnippets?.slice(-5) ?? [],
            chaosScore,
            riskLevel: state.riskLevel,
          },
          geminiKey,
          existingState.aiTemperature ?? 0
        );

        if (geminiAnalysis) {
          console.log('[Oracle][Gemini] fallback success', postId);

          await Promise.all([
            deps.redis.set(postKey(postId, 'lastAiRunAt'), String(now)),
            deps.redis.set(postKey(postId, 'lastAiChaosScore'), String(chaosScore)),
            deps.redis.set(postKey(postId, 'lastAiRiskLevel'), state.riskLevel),
            deps.redis.set(postKey(postId, 'pendingAnalysisAt'), ''),
          ]);

          return { ...geminiAnalysis, generated: true };
        }
      }
    } catch (geminiErr) {
      const geminiMessage =
        geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      console.error('[Oracle][Gemini] fallback failed', postId, geminiMessage);
    }

    return {
      modWarning: `Oracle could not reach any AI provider. Groq: ${message}`,
      prophecy: proxyFallbackPredictions().prophecy,
      temperature: existingState.aiTemperature ?? 0,
      aggression: existingState.aiAggression ?? 0,
      sarcasm: existingState.aiSarcasm ?? 0,
      verdict: existingState.verdict ?? 'warming',
    };
  }
}

export async function recordComment(
  deps: OracleDeps,
  postId: string,
  body: string,
  author: string
): Promise<PostOracleState> {
  const { redis } = deps;

  const now = Date.now();

  const existing = await loadPostOracleState(
    deps,
    postId
  );

  const timestamps = [
    ...existing.timestamps,
    now,
  ].slice(-5);

  const isNewCommenter =
    !existing.commenters.includes(author);
  const commenters = isNewCommenter
    ? [...existing.commenters, author].slice(-50)
    : existing.commenters;

  const recentCommentSnippets = [
    ...(await readJsonArray(
      redis,
      postKey(postId, 'recentCommentSnippets')
    )),
    body.trim().slice(0, 120),
  ].slice(-10);

  const conflictDelta = countKeywordHits(
    body,
    CONFLICT_KEYWORDS
  );

  const sarcasmDelta = countKeywordHits(
    body,
    SARCASM_PATTERNS
  );

  const conflictScore =
  existing.conflictScore * 0.85 + conflictDelta;

  let sarcasmScore =
  existing.sarcasmScore * 0.85 + sarcasmDelta;

  const commentCount =
    existing.commentCount + 1;

  const letters = body.match(/[a-z]/gi) ?? [];
  const uppercaseLetters = body.match(/[A-Z]/g) ?? [];
  const capsScore =
    letters.length > 0 &&
    uppercaseLetters.length / letters.length > 0.3
      ? 10
      : 0;
  const angerPunct =
    (body.match(/[!?]/g) ?? []).length >= 3 ? 8 : 0;
  const dismissive = body.trim().length < 15 ? 8 : 0;

  const commentsSinceAi =
    (existing.commentsSinceAi ?? 0) + 1;
  let aiTemperature =
    existing.aiTemperature ?? 0;
  let aiAggression =
    existing.aiAggression ?? 0;
  let aiSarcasm = existing.aiSarcasm ?? 0;
  let verdict = existing.verdict;
  let verdictHistory = existing.verdictHistory ?? [];
  let newVerdictForHistory: string | undefined;

  let modHistory = existing.modHistory ?? [];
  let modHistoryBonus = 0;

  if (isNewCommenter) {
    const modHistoryEntry =
      await checkUserModHistory(
        deps.reddit,
        deps.subredditName,
        author
      );

    modHistory = [
      ...modHistory.filter(
        (entry) =>
          entry.username.toLowerCase() !==
          author.toLowerCase()
      ),
      modHistoryEntry,
    ].slice(-25);

    if (modHistoryEntry.removals >= 2) {
      modHistoryBonus += 15;
    }

    if (modHistoryEntry.isBanned) {
      modHistoryBonus += 20;
    }
  }

  const flaggedUsers = await readFlaggedUsers(
    redis,
    commenters
  );

  const chaosScore = Math.min(
    100,
    calculateChaosScore({
      timestamps,
      conflictScore,
      sarcasmScore,
      commenters,
      flaggedUsers,
      extras: {
        capsScore,
        angerPunct,
        dismissive,
        aiTemp: aiTemperature,
        aiAgg: aiAggression,
      },
    }) + modHistoryBonus
  );

  const peakChaos = Math.max(
    existing.peakChaos ?? 0,
    chaosScore
  );

  const riskLevel =
    riskLevelFromChaos(chaosScore);

  let modWarning = existing.modWarning;
  let prophecy = existing.prophecy;
  const postTitle =
    existing.postTitle ??
    (await fetchPostTitle(deps, postId));

  const draftState: PostOracleState = {
    commentCount,
    timestamps,
    conflictScore,
    sarcasmScore,
    commenters,
    chaosScore,
    riskLevel,
    modWarning,
    prophecy,
    updatedAt: now,
    recentCommentSnippets,
    aiTemperature,
    aiAggression,
    aiSarcasm,
    commentsSinceAi,
    modHistory,
    verdictHistory,
    peakChaos,
    lastAiRunAt: existing.lastAiRunAt ?? 0,
    lastAiChaosScore: existing.lastAiChaosScore ?? 0,
    pendingAnalysisAt: existing.pendingAnalysisAt || now,
  };

  if (existing.lastAiRiskLevel) {
    draftState.lastAiRiskLevel =
      existing.lastAiRiskLevel;
  }

  if (postTitle) {
    draftState.postTitle = postTitle;
  }

  if (verdict) {
    draftState.verdict = verdict;
  }

  if (chaosScore > CHAOS_THRESHOLD) {
    const generated =
      await generatePredictions(
        deps,
        postId,
        chaosScore,
        draftState,
        existing,
        false
      );

    const aiChanged =
      generated.generated === true &&
      (generated.modWarning !== existing.modWarning ||
        generated.prophecy !== existing.prophecy ||
        generated.verdict !== existing.verdict ||
        generated.temperature !== existing.aiTemperature ||
        generated.aggression !== existing.aiAggression ||
        generated.sarcasm !== existing.aiSarcasm);

    modWarning = generated.modWarning;
    prophecy = generated.prophecy;
    aiTemperature =
      generated.temperature ?? existing.aiTemperature ?? 0;
    aiAggression = generated.aggression;
    aiSarcasm = generated.sarcasm;
    verdict = generated.verdict;

    if (aiChanged) {
      newVerdictForHistory = generated.verdict;
    }

    draftState.modWarning = modWarning;
    draftState.prophecy = prophecy;
    draftState.aiTemperature = aiTemperature;
    draftState.aiAggression = aiAggression;
    draftState.aiSarcasm = aiSarcasm;
    draftState.verdict = verdict;
    if (generated.generated) {
      draftState.lastAiRunAt = Date.now();
      draftState.lastAiChaosScore = chaosScore;
      draftState.lastAiRiskLevel = riskLevel;
      draftState.pendingAnalysisAt = 0;
    }
  } else if (!prophecy) {
    draftState.prophecy =
      'The Oracle watches quietly. The thread has not yet angered the algorithmic fates.';
  }

  if (newVerdictForHistory) {
    verdictHistory = [
      ...verdictHistory,
      {
        score: chaosScore,
        verdict: newVerdictForHistory,
        timestamp: Date.now(),
      },
    ].slice(-10);
    draftState.verdictHistory = verdictHistory;
  }

  draftState.updatedAt = now;

  await Promise.all([
    redis.set(
      postKey(postId, 'commentCount'),
      String(commentCount)
    ),

    redis.set(
      postKey(postId, 'timestamps'),
      JSON.stringify(timestamps)
    ),

    redis.set(
      postKey(postId, 'conflictScore'),
      String(conflictScore)
    ),

    redis.set(
      postKey(postId, 'sarcasmScore'),
      String(sarcasmScore)
    ),

    redis.set(
      postKey(postId, 'commenters'),
      JSON.stringify(commenters)
    ),

    redis.set(
      postKey(postId, 'chaosScore'),
      String(chaosScore)
    ),

    redis.set(
      postKey(postId, 'riskLevel'),
      riskLevel
    ),

    redis.set(
      postKey(postId, 'modWarning'),
      draftState.modWarning
    ),

    redis.set(
      postKey(postId, 'prophecy'),
      draftState.prophecy
    ),

    redis.set(
      postKey(postId, 'recentCommentSnippets'),
      JSON.stringify(recentCommentSnippets)
    ),

    redis.set(
      postKey(postId, 'verdict'),
      draftState.verdict ?? ''
    ),

    redis.set(
      postKey(postId, 'aiTemperature'),
      String(draftState.aiTemperature ?? 0)
    ),

    redis.set(
      postKey(postId, 'aiAggression'),
      String(draftState.aiAggression ?? 0)
    ),

    redis.set(
      postKey(postId, 'aiSarcasm'),
      String(draftState.aiSarcasm ?? 0)
    ),

    redis.set(
      postKey(postId, 'commentsSinceAi'),
      String(draftState.commentsSinceAi ?? 0)
    ),

    redis.set(
      postKey(postId, 'modHistory'),
      JSON.stringify(draftState.modHistory ?? [])
    ),

    redis.set(
      postKey(postId, 'verdictHistory'),
      JSON.stringify(draftState.verdictHistory ?? [])
    ),

    redis.set(
      postKey(postId, 'peakChaos'),
      String(draftState.peakChaos ?? chaosScore)
    ),

    redis.set(
      postKey(postId, 'postTitle'),
      draftState.postTitle ?? ''
    ),

    redis.set(
      postKey(postId, 'updatedAt'),
      String(now)
    ),

    redis.set(
      postKey(postId, 'lastAiRunAt'),
      String(draftState.lastAiRunAt ?? 0)
    ),

    redis.set(
      postKey(postId, 'lastAiChaosScore'),
      String(draftState.lastAiChaosScore ?? 0)
    ),

    redis.set(
      postKey(postId, 'lastAiRiskLevel'),
      draftState.lastAiRiskLevel ?? ''
    ),

    redis.set(
      postKey(postId, 'pendingAnalysisAt'),
      String(draftState.pendingAnalysisAt ?? 0)
    ),
  ]);

  return draftState;
}

export async function analyzePost(
  deps: OracleDeps,
  postId: string,
  forceAnalysis = false
): Promise<PostOracleState> {
  const state = await loadPostOracleState(
    deps,
    postId
  );

  const chaosScore =
    state.chaosScore ||
    calculateChaosScore({
      timestamps: state.timestamps,
      conflictScore: state.conflictScore,
      sarcasmScore: state.sarcasmScore,
      commenters: state.commenters,
      flaggedUsers: [],
      extras: {
        capsScore: 0,
        angerPunct: 0,
        dismissive: 0,
        aiTemp: state.aiTemperature ?? 0,
        aiAgg: state.aiAggression ?? 0,
      },
    });

  const riskLevel =
    riskLevelFromChaos(chaosScore);

  const now = Date.now();

  if (chaosScore > CHAOS_THRESHOLD || forceAnalysis) {
    const generated =
      await generatePredictions(
        deps,
        postId,
        chaosScore,
        {
          ...state,
          chaosScore,
          riskLevel,
        },
        state,
        forceAnalysis
      );

    state.modWarning = generated.modWarning;
    state.prophecy = generated.prophecy;
    state.aiTemperature =
      generated.temperature ?? state.aiTemperature ?? 0;
    state.aiAggression = generated.aggression;
    state.aiSarcasm = generated.sarcasm;
    state.verdict = generated.verdict;

    if (generated.generated) {
      state.lastAiRunAt = Date.now();
      state.lastAiChaosScore = chaosScore;
      state.lastAiRiskLevel = riskLevel;
      state.pendingAnalysisAt = 0;
    }
  }

  state.chaosScore = chaosScore;
  state.riskLevel = riskLevel;
  state.updatedAt = now;
  const postTitle =
    state.postTitle ??
    (await fetchPostTitle(deps, postId));

  if (postTitle) {
    state.postTitle = postTitle;
  }

  const { redis } = deps;

  await Promise.all([
    redis.set(
      postKey(postId, 'chaosScore'),
      String(chaosScore)
    ),

    redis.set(
      postKey(postId, 'riskLevel'),
      riskLevel
    ),

    redis.set(
      postKey(postId, 'modWarning'),
      state.modWarning
    ),

    redis.set(
      postKey(postId, 'prophecy'),
      state.prophecy
    ),

    redis.set(
      postKey(postId, 'postTitle'),
      state.postTitle ?? ''
    ),

    redis.set(
      postKey(postId, 'updatedAt'),
      String(now)
    ),

    redis.set(
      postKey(postId, 'aiTemperature'),
      String(state.aiTemperature ?? 0)
    ),

    redis.set(
      postKey(postId, 'aiAggression'),
      String(state.aiAggression ?? 0)
    ),

    redis.set(
      postKey(postId, 'aiSarcasm'),
      String(state.aiSarcasm ?? 0)
    ),

    redis.set(
      postKey(postId, 'verdict'),
      state.verdict ?? ''
    ),

    redis.set(
      postKey(postId, 'lastAiRunAt'),
      String(state.lastAiRunAt ?? 0)
    ),

    redis.set(
      postKey(postId, 'lastAiChaosScore'),
      String(state.lastAiChaosScore ?? 0)
    ),

    redis.set(
      postKey(postId, 'lastAiRiskLevel'),
      state.lastAiRiskLevel ?? ''
    ),

    redis.set(
      postKey(postId, 'pendingAnalysisAt'),
      String(state.pendingAnalysisAt ?? 0)
    ),
  ]);

  return state;
}

export function getTargetPostId(
  postData: Record<string, unknown> | undefined,
  fallbackPostId: string
): string {
  const target = postData?.targetPostId;

  return typeof target === 'string' &&
    target.trim()
    ? target.trim()
    : fallbackPostId;
}
