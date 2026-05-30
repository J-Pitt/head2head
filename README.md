# Head2Head

Group trivia for phones and laptops — play on one device or online with a room code.

## Features

- **Categories:** Science (18 questions) and 90's Pop Culture (18 questions)
- **Category picker** — host chooses which categories before each round
- **Avatar picker** — emoji avatars when joining
- **Game room** — players in a circle, turn/next indicators, question in the center
- **Buzzer mode** (online) — first to buzz answers; synced timers
- **Turn mode** (local / optional online) — classic pass-and-play
- **Room chat** when playing online
- **Rejoin** — return to your last room via saved player id

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind)
- Upstash Redis — rooms use a `head2head:` key prefix

## Quick start

```bash
npm install
cp env.example .env.local   # then fill in your Upstash Redis credentials
npm run dev
```

Add your `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local` (see `env.example`). This file is **not** in git.

Open [http://localhost:3000](http://localhost:3000).

Local pass-and-play works without Redis. Online rooms need:

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/head2head/room` | Create room or update game `state` |
| `GET /api/head2head/room?roomId=` | Poll room |
| `POST /api/head2head/room/join` | Join by code |
| `POST /api/head2head/room/chat` | Room chat |
| `POST /api/head2head/room/leave` | Leave room |
| `GET /api/head2head/room/status` | Redis configured? |

## License

MIT
