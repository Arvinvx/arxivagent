# Cliconnect

**Turn research papers into runnable code — from your terminal.**

Cliconnect is an AI-powered research assistant that helps you find papers on [arXiv](https://arxiv.org), understand their core methods, and generate a **minimal, runnable Python implementation** of the idea. Pair a web dashboard for accounts and API keys with a polished terminal chat experience.

**Store:** [ar4x.store](https://www.ar4x.store/)

---

## What it does

1. **Sign up / log in** on the web dashboard  
2. **Generate an API key** (shown once — copy and store it safely)  
3. **Authenticate the CLI** with that key  
4. **Chat in the terminal** about a paper you care about  
5. The agent fetches metadata from arXiv and **writes working Python** that demonstrates the core method  

Think of it as: *paper → conversation → code*, without leaving your workflow.

---

## Features

| Area | What you get |
|------|----------------|
| **Web dashboard** | Session-based signup/login, protected API key generation, one-time key reveal + copy |
| **CLI (`arxcli`)** | Login with API key, interactive Ink-based terminal UI, syntax-highlighted code replies |
| **AI agent** | Clarifies which paper you want, calls arXiv, then hands off to a coding agent |
| **arXiv integration** | Search by paper title/query with retries for rate limits |
| **Coding agent** | Produces short, runnable Python that implements the paper’s core idea |
| **Conversation memory** | Keeps context across turns; summarizes when the history gets long |
| **Secure keys** | API keys are SHA-256 hashed at rest; plaintext key returned only at creation |

---

## Architecture

```
┌─────────────────┐     session      ┌──────────────────┐
│  React frontend │ ───────────────► │  Express API     │
│  (Vite + TW)    │  API key gen     │  /auth/*         │
└─────────────────┘                  └────────┬─────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │  Supabase        │
                                     │  users + api_keys│
                                     └──────────────────┘

┌─────────────────┐     verify-key    ┌──────────────────┐
│  arxcli (Ink)   │ ───────────────► │  Express API     │
│  fancy.jsx chat │                  └──────────────────┘
└────────┬────────┘
         │ agent()
         ▼
┌─────────────────┐     tool call    ┌──────────────────┐
│  OpenAI agent   │ ───────────────► │  arXiv API       │
│  + coding agent │                  │  → Python code   │
└─────────────────┘                  └──────────────────┘
```

| Path | Role |
|------|------|
| `server.js` | Express server (port `3000`) |
| `auth/` | Signup, login, logout, verify key, generate key |
| `db/` | Supabase client |
| `ai/` | Agent, tools, arXiv fetcher, coding agent, memory |
| `cli/` | Commander CLI (`login`, `run`) |
| `fancy.jsx` | Terminal chat UI (Ink + Shiki) |
| `frontend/` | React dashboard for auth + keys |

---

## Stack

- **Runtime:** Node.js (ES modules)
- **Backend:** Express, express-session, bcrypt, validator
- **Database:** Supabase (Postgres)
- **AI:** OpenAI Chat Completions + function calling
- **CLI UI:** React + [Ink](https://github.com/vadimdemedes/ink), Shiki highlighting
- **Frontend:** React, React Router, Vite, Tailwind CSS
- **External data:** arXiv Atom API

---

## Prerequisites

- Node.js 18+ (recommended)
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key
- npm (or compatible package manager)

---

## Environment variables

Create a `.env` file in the project root (never commit secrets):

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Express sessions
SESSION_SECRET=a-long-random-string
```

### Suggested Supabase tables

**`users`**

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid / serial | Primary key |
| `name` | text | |
| `email` | text | Unique |
| `password` | text | bcrypt hash |

**`api_keys`**

| Column | Type | Notes |
|--------|------|--------|
| `user_id` | references users | Owner |
| `hashed_key` | text | SHA-256 of the raw key |
| `revoked` | boolean | Soft revoke |

---

## Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/Cliconnect.git
cd Cliconnect

# Backend / CLI dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

> Install any packages your environment still needs for the server/CLI (e.g. `express`, `openai`, `commander`, `chalk`, `prompts`, `dotenv`, `cors`, `express-session`, `bcryptjs`, `validator`, `@supabase/supabase-js`, `fast-xml-parser`) if they are not already present.

---

## Running the app

### 1. Start the API

```bash
npm start
# → http://localhost:3000
```

### 2. Start the web dashboard

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

1. Open the dashboard and **sign up** or **log in**  
2. Open the protected **dashboard**  
3. Click **Generate API Key**  
4. Copy the key (`arx_…`) — it will not be shown again  

### 3. Use the CLI

From the project root (or after linking the CLI):

```bash
# Authenticate (writes ~/.arxconfig)
node cli/cli.js login

# Start the terminal chat
node cli/cli.js run
```

CLI branding in the terminal: **Arxjudge** / **arxcli**.

| Command | Description |
|---------|-------------|
| `login` | Prompt for API key, verify against the server, save to `~/.arxconfig` |
| `run` | Validate saved key and open the interactive chat |

Inside the chat:

- Type a message and press **Enter**  
- Ask for a paper by title or topic; the agent will clarify, fetch from arXiv, then generate code  
- Exit with `quit`, `exit`, or `bye`  

---

## How the AI pipeline works

```
You: "I want the Attention Is All You Need paper"
        │
        ▼
┌───────────────────┐
│  Research agent   │  Clarifies intent, then calls tool get_paper
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  arXiv fetch      │  Title, authors, abstract, id, PDF link
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Coding agent     │  Minimal Python for the core method + tiny demo
└───────────────────┘
```

- **Research agent** (`ai/agent.js`) — conversational, tool-using; not a blind search engine  
- **Tool** (`get_paper`) — loads paper metadata via `ai/real.js`  
- **Coding agent** (`ai/coding.js`) — implements the method; comments assumptions when details are thin  
- **Memory** (`ai/memmory.js`) — retains turns; compresses history after ~10 messages  

---

## API routes

Base URL: `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/signup` | Create account (`name`, `email`, `password`) |
| `POST` | `/auth/login` | Log in (`email`, `password`) → session cookie |
| `POST` | `/auth/logout` | Destroy session |
| `POST` | `/auth/generate-api-key` | Create `arx_…` key (session required; shown once) |
| `POST` | `/auth/verify-key` | Validate Bearer token for CLI login |

CORS is configured for the Vite app at `http://localhost:5173` with credentials.

---

## Project structure

```
Cliconnect/
├── server.js              # Express entry
├── package.json
├── .env                   # Local secrets (gitignored)
├── check.js               # API key verification client
├── hashkey.js             # SHA-256 helper for keys
├── fancy.jsx              # Terminal chat UI
├── auth/
│   ├── auth.js            # Router
│   └── authController.js  # Auth + key handlers
├── ai/
│   ├── agent.js           # Research agent + tools
│   ├── coding.js          # Paper → Python coding agent
│   ├── real.js            # arXiv client
│   ├── tools.js           # Function-calling schemas
│   └── memmory.js         # Conversation memory
├── cli/
│   └── cli.js             # arxcli (login / run)
├── db/
│   └── db.js              # Supabase client
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx        # Login, signup, dashboard
        ├── main.jsx
        └── index.css
```

---

## Security notes

- Passwords are hashed with **bcrypt**  
- API keys are stored only as **SHA-256 hashes**; the raw key is returned once at generation  
- Session cookies are `httpOnly` with a 24h max age  
- Keep `.env` and `~/.arxconfig` out of version control and public shares  
- Revoked keys are rejected by `/auth/verify-key`  

---

## Development tips

- Frontend talks to `http://localhost:3000` with `credentials: "include"`  
- CLI config file: `~/.arxconfig` (`api_key=arx_…`)  
- Terminal theme uses green accents (`#22C55E`) and Shiki `dark-plus` for code blocks  
- arXiv client retries on `429` / `503` with backoff  

---

## Roadmap ideas

- [ ] Publish `arxcli` as a global npm package  
- [ ] More tools (PDF full-text, multi-paper compare, citations)  
- [ ] Persist chat history per user  
- [ ] Key list + revoke UI on the dashboard  
- [ ] Production deploy (API + frontend) with proper HTTPS cookies  

---

## License

ISC (see `package.json`). Update this section if you choose a different license.

---

## Credits

- [arXiv](https://arxiv.org) for open research metadata  
- [OpenAI](https://openai.com) for models and tool calling  
- [Ink](https://github.com/vadimdemedes/ink) for the terminal React UI  
- [Supabase](https://supabase.com) for auth data storage  

---

<p align="center">
  <b>Cliconnect</b> — research papers, meet runnable code.<br/>
  <a href="https://www.ar4x.store/">ar4x.store</a>
</p>
