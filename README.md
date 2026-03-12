# ZoriaGen

AI video generator from images and text prompts. Uses Replicate API and Minimax / Wan models for video creation.

## Project Structure

- **zoria-gen/** — main web application (Next.js 16)
- **migration/** — migration tool (Solana ↔ BSC)
- **web/** — static landing page

## Quick Start

### 1. Install

```bash
cd zoria-gen
npm install
```

### 2. Configure

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `REPLICATE_API_TOKEN` — token from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
- `NEXT_PUBLIC_PRIVY_APP_ID` — for authentication (Privy)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to Use

1. **Upload an actor image** (PNG/JPEG, up to 5MB)
2. **Write an action prompt** or click "AI Suggest" for ideas
3. **Click "Create Video"** — costs 10 credits per video
4. **Gallery** — view and download your videos

## Tech Stack

- Next.js 16 (App Router)
- Tailwind CSS v4
- Replicate API
- Privy (authentication)
- JSON file storage (no database)

For more details, see [zoria-gen/README.md](zoria-gen/README.md).
