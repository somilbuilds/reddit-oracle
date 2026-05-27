```
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
```

<h3 align="center"><i>Predicting Reddit chaos before moderators feel the heat.</i></h3>

<p align="center">
  <img src="https://img.shields.io/badge/Devvit-Reddit%20Native-FF4500?style=for-the-badge&logo=reddit&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-LPU%20Inference-F55036?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Render-Proxy%20Backend-46E3B7?style=for-the-badge&logo=render" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-Stateful-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Hackathon-Reddit%20Mod%20Tools-00C853?style=for-the-badge" />
</p>

<p align="center">
  <a href="https://developers.reddit.com/apps/prophecy-oracle">📦 App Listing</a> •
  <a href="https://reddit.com/r/prophecy_oracle_dev">🧪 Demo Subreddit</a> •
  <a href="https://github.com/somilbuilds/groq-api-proxy-server">🔗 Proxy Repo</a>
</p>

---

```
╔══════════════════════════════════════════════════════════════╗
║   🔮 THREAD ORACLE • REDDIT MODERATION AUGURY ENGINE 🔮    ║
║                                                              ║
║      "The thread grows restless... essay guy approaches."   ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🌩️ What Is Thread Oracle?

Thread Oracle is a **Reddit-native moderation intelligence system** built with Devvit.

Instead of reacting after a thread has already collapsed into chaos, the Oracle continuously observes discussion patterns and **predicts escalation before moderators are forced to intervene.**

It behaves less like a dashboard — and more like a **weather station for online conflict.**

The system monitors:

- comment velocity
- sarcasm spikes
- hostility patterns
- argument density
- meme derailments
- engagement bursts
- repeat high-friction users
- escalation momentum

These signals are transformed into **🔥 Chaos Scores**, **🚨 Risk Levels**, **👁️ Moderator warnings**, and **🔮 AI-generated prophecies.**

---

## 🧠 The Core Idea

```
Most moderation tools answer:   "What happened?"
Thread Oracle answers:          "What is about to happen?"
```

---

## ⚡ Features

### 🌡️ Chaos Detection Engine

| Signal | Purpose |
|---|---|
| Comment Velocity | Detects sudden engagement spikes |
| Conflict Keywords | Detects argumentative escalation |
| Sarcasm Density | Detects baiting and mockery |
| Activity Bursts | Finds momentum acceleration |
| Dogpile Detection | Identifies concentrated targeting |
| Repeat Offender Presence | Detects recurring high-friction users |
| Sentiment Swings | Detects emotional instability |
| Caps & Punctuation Rage | Detects typed-in-anger patterns |

### 🚨 Risk Tiers

| Level | Meaning |
|---|---|
| 🟢 LOW | Stable discussion |
| 🟡 MEDIUM | Tension forming |
| 🟠 HIGH | Escalation likely |
| 🔴 CRITICAL | Moderator intervention recommended |

---

### 🔮 AI Prophecy Engine

Powered by **Groq LPU inference** via a lightweight proxy backend.

> *"Essay energy rises from the east. Thread patience deteriorating rapidly."*

> *"Someone is about to paste a 6-paragraph response nobody asked for. The top reply will just be lol."*

> *"Three people are arguing the same point from different angles and none of them realize it yet."*

> *"Multiple high-friction users converging near critical threshold."*

---

### 👁️ Mod Dashboard vs Public View

**Moderators see:**
- Full chaos score + risk badge + verdict
- Thread Stats (peak chaos, conflict, sarcasm, Gemini scores)
- User Radar (flagged users with removal history from mod logs)
- Private Mod Warning (actionable AI advice)
- Quick action buttons (Consult Oracle, Slow Mode, Lock Thread)

**Regular users see:**
- Chaos score + risk badge
- Comment count
- Public Prophecy only

---

### 📌 Oracle Summoning Flow

```
Moderator opens post menu
          ↓
  "Summon Thread Oracle"
          ↓
Oracle dashboard post created
          ↓
Pinned mod comment on original thread
          ↓
Historical comments seeded immediately
          ↓
Live chaos tracking begins
```

---

## 🏗️ System Architecture

```
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
              ▼
┌────────────────────────────┐
│     Oracle Proxy Server    │
│      (Hosted on Render)    │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│         Groq API           │
│     LPU AI Inference       │
└────────────────────────────┘
```

> Direct Groq requests from Devvit were blocked by HTTP allowlist restrictions. A lightweight proxy on Render solves this — keeping the Devvit app clean and AI providers swappable.

---

## 🛡️ Stability Engineering

| Protection | Purpose |
|---|---|
| Per-post Gemini cooldown | Prevents analysis spam |
| Atomic Redis cooldown claims | Prevents race conditions |
| Global API endpoint hardening | Blocks forced re-analysis on reload |
| Round-robin API key rotation | Survives rate limit bursts |
| Duplicate summon prevention | One oracle per thread |
| Micro-analysis every 10th comment | Lightweight sentiment without quota burn |
| Request deduplication | Prevents inference storms |

---

## 📊 Redis State

| Key | Purpose |
|---|---|
| `oracle:post:{id}:chaosScore` | Live chaos score |
| `oracle:post:{id}:prophecy` | Cached AI prophecy |
| `oracle:post:{id}:modWarning` | Cached mod warning |
| `oracle:post:{id}:modHistory` | Flagged user records |
| `oracle:post:{id}:recentCommentSnippets` | Last 10 snippets for AI context |
| `oracle:gemini:cooldown:{id}` | Per-post rate limiting |
| `oracle:summoned:{id}` | Duplicate summon prevention |
| `oracle:flagged:{username}` | Cross-thread troublemaker tracking |

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| [Devvit](https://developers.reddit.com) | Reddit-native runtime & custom posts |
| TypeScript | Core application logic |
| Redis (Devvit built-in) | Persistent thread state |
| Groq | High-speed LPU AI inference |
| Render | Proxy server hosting |
| Hono | Lightweight API routing |
| Vite | Build tooling |

---

## 📁 Project Structure

```
prophecy-oracle/
├── src/
│   ├── blocks/
│   │   └── main.tsx          # Dashboard UI (mod + user views)
│   ├── core/
│   │   ├── oracle.ts         # Chaos scoring, Redis, AI calls
│   │   └── moderation.ts     # Mod auth checks
│   └── routes/
│       ├── api.ts            # API endpoints
│       ├── menu.ts           # Summon Oracle menu action
│       ├── triggers.ts       # onCommentCreate handler
│       └── forms.ts          # Interactive forms
├── devvit.json
└── package.json
```

---

## 🚀 Setup

```bash
npm install
devvit login
devvit upload
devvit playtest
```

**Configure in Devvit Developer Settings:**

| Setting | Purpose |
|---|---|
| `oracle_proxy_url` | Your Render proxy endpoint |

---

## 🌐 Oracle Proxy Backend

👉 **[github.com/somilbuilds/groq-api-proxy-server](https://github.com/somilbuilds/groq-api-proxy-server)**

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

## 🧪 Future Ideas

- Raid detection
- Subreddit-specific behavioral tuning  
- Temporal escalation graphs
- Community health timelines
- Auto-lock recommendation systems
- Historical prediction accuracy tracking

---

## 🎭 Built For

**Reddit Mod Tools & Migrated Apps Hackathon** — exploring proactive moderation systems, AI-assisted community management, and Reddit-native interaction design.

---

<p align="center">
  <br>
  🔮 <i>The Oracle Watches.</i> 🔮
  <br><br>
  <a href="https://developers.reddit.com/apps/prophecy-oracle">App Listing</a> •
  <a href="https://reddit.com/r/prophecy_oracle_dev">Demo Sub</a> •
  <a href="https://github.com/somilbuilds/groq-api-proxy-server">Proxy Repo</a>
</p>
