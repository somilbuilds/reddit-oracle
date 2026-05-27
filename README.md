      ████████╗██╗  ██╗██████╗ ███████╗ █████╗ ██████╗      
      ╚══██╔══╝██║  ██║██╔══██╗██╔════╝██╔══██╗██╔══██╗     
         ██║   ███████║██████╔╝█████╗  ███████║██║  ██║     
         ██║   ██╔══██║██╔══██╗██╔══╝  ██╔══██║██║  ██║     
         ██║   ██║  ██║██║  ██║███████╗██║  ██║██████╔╝     
         ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝      

       ██████╗ ██████╗  █████╗  ██████╗██╗     ███████╗     
      ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝     
      ██║   ██║██████╔╝███████║██║     ██║     █████╗       
      ██║   ██║██╔══██╗██╔══██║██║     ██║     ██╔══╝       
      ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗███████╗     
       ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝     

> Predicting Reddit chaos before moderators feel the heat.

<p align="center">
  <img src="https://img.shields.io/badge/Devvit-Reddit%20Native-FF4500?style=for-the-badge&logo=reddit">
  <img src="https://img.shields.io/badge/AI-Groq%20%2B%20Gemini-blueviolet?style=for-the-badge">
  <img src="https://img.shields.io/badge/Redis-Live%20State-red?style=for-the-badge&logo=redis">
  <img src="https://img.shields.io/badge/Status-Hackathon%20Build-success?style=for-the-badge">
</p>

---

# 🔮 Thread Oracle

Thread Oracle is a Reddit-native moderation intelligence engine built with Devvit.

Instead of reacting *after* a thread collapses into chaos, the Oracle continuously watches conversation patterns and predicts escalation before moderators are forced to intervene.

It behaves less like a dashboard — and more like a weather station for online conflict.

---

# 🌩️ What The Oracle Watches

The system monitors:

- comment velocity
- sarcasm spikes
- hostility patterns
- argument density
- meme derailments
- engagement bursts
- repeat high-friction users
- escalation momentum
- punctuation rage
- dogpile formation

These signals become:

- 🔥 Chaos Scores
- 🚨 Risk Levels
- 👁️ Moderator Warnings
- 🔮 AI-generated Prophecies

---

# 🧠 The Core Idea

Most moderation tools answer:

> “What happened?”

Thread Oracle answers:

> “What is about to happen?”

---

# ⚡ Features

## 🌡️ Chaos Detection Engine

| Signal | Purpose |
|---|---|
| Comment Velocity | Detects sudden engagement spikes |
| Conflict Keywords | Detects argumentative escalation |
| Sarcasm Density | Detects baiting and mockery |
| Activity Bursts | Detects momentum acceleration |
| Dogpile Detection | Identifies concentrated targeting |
| Repeat Offender Presence | Detects recurring high-friction users |
| Caps & Punctuation Rage | Detects typed-in-anger patterns |
| Sentiment Swings | Detects emotional instability |

---

# 🚨 Risk Levels

| Level | Meaning |
|---|---|
| 🟢 LOW | Stable discussion |
| 🟡 MEDIUM | Tension forming |
| 🟠 HIGH | Escalation likely |
| 🔴 CRITICAL | Moderator intervention recommended |

---

# 🔮 AI Prophecy Engine

Thread Oracle uses a hybrid inference architecture:

## Primary
- Groq inference through a lightweight proxy backend

## Fallback
- Gemini Flash Lite direct inference

If Groq fails due to Devvit outbound restrictions, the Oracle automatically falls back to Gemini inference so moderation predictions continue working.

---

# 🧯 Fallback AI System

The Devvit runtime restricts arbitrary outbound HTTP requests.

Direct Groq requests — and even some proxy providers — may be blocked by Devvit allowlists.

To survive runtime restrictions, Thread Oracle uses:

```txt
Groq Proxy (Primary)
        ↓ failover
Gemini 2.5 flash (Fallback)
```

This keeps the Oracle alive even when external infrastructure fails.

---

# 🔁 Recursive Trigger Protection

Oracle-generated posts and comments are automatically ignored by the tracking engine.

This prevents:

- runaway chaos inflation
- recursive AI triggering
- infinite re-analysis loops
- Oracle posts analyzing themselves

---

# 🧊 Chaos Decay System

Early builds caused chaos scores to permanently rise forever.

The Oracle now applies score decay over time so old drama slowly cools off naturally instead of permanently locking threads at CRITICAL risk.

---

# 👁️ Moderator Experience

Moderators see:

- Full chaos score + risk badge
- AI verdicts
- Thread escalation state
- Flagged user radar
- Removal history signals
- Private moderator warnings
- Quick moderation actions

Regular users see:

- Public prophecy
- Chaos score
- Risk badge
- Thread state

---

# 📌 Oracle Summoning Flow

```txt
Moderator opens post menu
          ↓
   "Summon Thread Oracle"
          ↓
 Oracle dashboard post created
          ↓
Pinned mod comment added
          ↓
Historical comments seeded
          ↓
Live tracking begins
```

---

# 🏗️ Architecture

```txt
┌────────────────────────────┐
│       Reddit Thread        │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│       Devvit Runtime       │
│   (Thread Oracle App)      │
└─────────────┬──────────────┘
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────────┐   ┌────────────────┐
│ Groq Proxy   │   │ Gemini Fallback│
│ (Render)     │   │ 2.5 flash API │
└──────────────┘   └────────────────┘
```

---

# 📊 Redis State

| Key | Purpose |
|---|---|
| oracle:post:{id}:chaosScore | Live chaos score |
| oracle:post:{id}:prophecy | Cached prophecy |
| oracle:post:{id}:modWarning | Cached moderator warning |
| oracle:post:{id}:recentCommentSnippets | Last comments for AI context |
| oracle:post:{id}:modHistory | User moderation history |
| oracle:flagged:{username} | Cross-thread troublemaker tracking |
| oracle:summoned:{id} | Duplicate summon prevention |

---

# 🛡️ Stability Engineering

| Protection | Purpose |
|---|---|
| AI cooldowns | Prevents spam inference |
| Redis locks | Prevents race conditions |
| Request deduplication | Prevents inference storms |
| Debounce windows | Stops rapid retriggering |
| Recursive trigger protection | Stops self-analysis loops |
| Chaos decay | Prevents permanent escalation |
| Gemini fallback | Survives provider failure |

---

# 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| Devvit | Reddit-native runtime |
| TypeScript | Core logic |
| Redis | Persistent thread state |
| Groq | Primary AI inference |
| Gemini Flash Lite | AI fallback provider |
| Render | Proxy hosting |
| Hono | API routing |
| Vite | Build tooling |

---

# 📁 Project Structure

```txt
prophecy-oracle/
├── src/
│   ├── blocks/
│   │   └── main.tsx
│   ├── core/
│   │   ├── oracle.ts
│   │   └── moderation.ts
│   └── routes/
│       ├── api.ts
│       ├── menu.ts
│       ├── triggers.ts
│       └── forms.ts
├── devvit.json
└── package.json
```

---

# 🚀 Setup

```bash
npm install
devvit login
devvit upload
devvit playtest
```

Configure Devvit settings:

| Setting | Purpose |
|---|---|
| oracle_proxy_url | Groq proxy endpoint |
| gemini_api_key | Gemini fallback API key |

---

# 🌐 Proxy Backend

👉 https://github.com/somilbuilds/groq-api-proxy-server

Accepts:

```json
{
  "postTitle": "dogs vs cats",
  "comments": ["dogs are dumb", "cats are smart"],
  "chaosScore": 70,
  "riskLevel": "HIGH"
}
```

Returns:

```json
{
  "publicProphecy": "...",
  "modWarning": "...",
  "verdict": "...",
  "aggression": 30,
  "sarcasm": 20
}
```

---

# 🧪 Future Ideas

- raid detection
- subreddit-specific tuning
- escalation graphs
- prediction accuracy tracking
- auto-lock recommendations
- community health timelines

---

# 🎭 Built For

Reddit Mod Tools & Migrated Apps Hackathon

Exploring:
- proactive moderation
- Reddit-native tooling
- AI-assisted community management
- predictive social systems

---

<p align="center">
  <b>🔮 The Oracle Watches. 🔮</b>
</p>
