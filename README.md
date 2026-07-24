# Cliconnect

Find arXiv papers and get a small runnable Python version of the method — from a terminal chat.

Web app for accounts + API keys. CLI (`arxcli`) for the actual chat.

Store: [ar4x.store](https://www.ar4x.store/)

## How it works

1. Sign up on the dashboard and generate an API key  
2. `arxcli login` with that key  
3. `arxcli run` and ask for a paper  
4. Agent pulls it from arXiv and writes minimal Python for the core idea  

## Stack

- **API:** Express + Supabase  
- **Frontend:** React, Vite, Tailwind  
- **CLI:** Ink (React in the terminal)  
- **AI:** OpenAI + arXiv  

## Setup

`.env` in the project root:

```env
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SESSION_SECRET=...
```

```bash
npm install
cd frontend && npm install && cd ..
```

## Run

```bash
# API → http://localhost:3000
npm start

# Dashboard → http://localhost:5173
cd frontend && npm run dev
```

```bash
# CLI
node cli/cli.js login
node cli/cli.js run
```

In chat: type a message, or `quit` / `exit` / `bye` to leave.

## Project layout

```
server.js          Express API
auth/              login, signup, keys
ai/                agent, arXiv, coding, memory
cli/cli.js         arxcli
fancy.jsx          terminal UI
frontend/          dashboard
db/                Supabase
```

## License

ISC
