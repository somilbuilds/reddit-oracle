<<<<<<< HEAD
# Thread Oracle

Thread Oracle is a Reddit Devvit moderation tool that watches active threads for signs of chaos. It tracks comment velocity, tone signals, user history, and recent comment snippets, then calls a separate Groq proxy service to generate the public prophecy and private moderation warning.

The AI architecture is:

```text
Devvit -> oracle-groq-proxy -> Groq
```

The proxy stays outside the Devvit app as an independent service.

## What It Does

- Monitors Reddit posts as new comments arrive.
- Seeds the Oracle with the latest 25 existing comments when summoned.
- Scores thread chaos from velocity, conflict language, sarcasm, caps, angry punctuation, dismissive short replies, dogpile behavior, and mod history.
- Uses the Groq proxy for a single structured AI generation request when gates allow it.
- Creates a mod dashboard with a risk badge, chaos score, user radar, private mod warning, public prophecy, and action buttons.
- Adds a pinned Oracle comment to the watched thread that links to the dashboard.

## AI Request Control

Thread Oracle avoids request storms with:

- Per-thread in-flight locks.
- Per-thread cooldown persistence.
- Debounced comment-triggered analysis.
- Meaningful-change gating: risk tier change, chaos delta >= 15, or manual Consult Oracle.
- One proxy request that returns prophecy, mod warning, verdict, aggression, and sarcasm.
- Cached/local state reads for hydration, render, playtest reload, and API state endpoints.

The Devvit app no longer calls any model provider directly.

## Proxy Setup

The proxy lives in:

```bash
../oracle-groq-proxy
```

Install and run it:

```bash
cd ../oracle-groq-proxy
npm install
```

Create `.env` in the proxy folder:

```bash
GROQ_API_KEY=your_groq_api_key
PORT=3000
```

Start the proxy:

```bash
npm run dev
```

Local proxy URL:

```text
http://localhost:3000/oracle
```

For production, deploy the proxy separately, for example on Render, and use the deployed `/oracle` URL.

## Devvit Configuration

In Reddit Developer Settings, configure:

- `oracle_proxy_url`: local dev can use `http://localhost:3000/oracle`; production should use the deployed Render URL.

In `devvit.json`, update the HTTP allowlist before production deploy:

```json
"permissions": {
  "http": {
    "enable": true,
    "domains": [
      "YOUR_RENDER_DOMAIN.onrender.com"
    ]
  }
}
```

Keep `oracle-groq-proxy` separate. Do not merge proxy code into the Devvit app.

## Dashboard

Public users see:

- Watched thread title.
- Risk badge and chaos score.
- Chaos bar.
- Verdict badge when available.
- Comment count and last updated time.
- Public prophecy.

Moderators also see:

- User Radar.
- Private Mod Warning.
- Action buttons:
  - `Consult Oracle`: forces a fresh proxy-backed analysis while still using the manual cooldown.
  - `Enable Slow Mode`: opens subreddit moderation settings.
  - `Lock Thread`: opens the watched Reddit thread.

## Development

Install dependencies:

```bash
npm install
```

Run type-checking:

```bash
npm run type-check
```

Start Devvit playtest:

```bash
npm run dev
```

Deploy:

```bash
npm run deploy
```
=======
# reddit-oracle
An AI-powered Reddit moderation companion that predicts thread escalation before chaos erupts - helping moderators stay proactive while keeping Reddit culture fun, weird, and alive.
>>>>>>> c94f8f118770d3dd779a7190c8cc49632816de63
