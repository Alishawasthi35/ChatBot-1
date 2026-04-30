# ChatBot#1

A AI chatbot built with React, Express, REST APIs, local authentication, and Hugging Face Inference Providers.

## Features

- React/Vite chatbot interface inspired by modern AI chat products
- Register, login, logout, and protected session check routes
- Protected `POST /api/chat` backend route
- Hugging Face API key stays server-side through `HF_TOKEN`
- Local JSON user storage for learning purposes
- Browser `localStorage` chat history
- Backend terminal logs every REST request

## Project Structure

```text
.
├── client/              # React frontend
│   ├── src/
│   │   ├── hooks/       # useAuth and useChat
│   │   ├── lib/         # API helper
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── data/
│   └── users.json       # Local learning database
├── server.js            # Express REST API and Hugging Face proxy
├── package.json
├── .env.example
└── .gitignore
```

## Setup

Install backend dependencies:

```powershell
npm install
```

Install frontend dependencies:

```powershell
npm run install:client
```

Create your environment variables in the backend terminal:

```powershell
$env:HF_TOKEN="hf_your_token_here"
$env:HF_MODEL="Qwen/Qwen2.5-7B-Instruct"
$env:AUTH_DEMO_SECRET="replace_with_a_long_random_secret"
```

## Run Locally

Start the backend:

```powershell
npm start
```

Start the React frontend in a second terminal:

```powershell
npm run client
```

Open:

```text
http://localhost:5173
```

## Build

```powershell
npm run build
```

The built React files are generated in `client/dist/` and are ignored by Git.

## Security Notes

- Do not commit real Hugging Face tokens.
- Keep secrets in environment variables or a local `.env` file.
- `data/users.json` is for learning only and should not store real user data.
- This project demonstrates auth and REST concepts, but it is not production-grade authentication.
