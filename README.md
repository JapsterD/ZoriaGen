# ZoriaGen — AI Video Generator

AI video generator that creates clips from images and text prompts. Powered by Replicate models (Minimax, Wan) and the **$ZORIA** token on **BSC (Binance Smart Chain)**.

## Features

- **Free tier** — Generate 480p, 5-second videos using credits (10 credits per video)
- **Premium tier** — Pay with **$ZORIA tokens** on BSC for:
  - Higher resolution (720p, 1080p)
  - Longer duration (5s or 10s)
  - Videos without watermarks
- **BSC integration** — Connect your wallet, switch to BSC, and pay in $ZORIA. Payments are sent to the treasury wallet and verified on-chain.

## Quick Start

### 1. Get a Replicate API Token

Go to [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) and copy your API token.

### 2. Configure

Copy `.env.example` to `.env.local` and fill in:

```
REPLICATE_API_TOKEN=r8_your_actual_token_here
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id  # for wallet login
```

For **$ZORIA payments** on BSC, set your treasury wallet:

```
ZORIA_TREASURY_WALLET=0x_your_treasury_wallet
NEXT_PUBLIC_ZORIA_TREASURY=0x_your_treasury_wallet
```

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to Use

1. **Connect wallet** (Privy) and sign in
2. **Upload an image** (PNG or JPEG, up to 5MB)
3. **Write an action prompt** or use "AI Suggest"
4. **Choose payment**:
   - **Credits** — 10 credits for 480p / 5s (with watermark)
   - **$ZORIA** — BSC payment for premium quality, no watermark
5. **Create Video** — Track progress in the gallery

## Payment Options

| Method | Output | Cost | Watermark |
|-------|--------|------|-----------|
| Credits | 480p, 5s | 10 credits | Yes |
| $ZORIA (BSC) | 480p–1080p, 5–10s | 2,000–11,000 $ZORIA | No |

Premium prices (in $ZORIA):
- 480p: 2,000 (5s) / 7,000 (10s)
- 720p: 4,000 (5s) / 9,000 (10s)
- 1080p: 6,000 (5s) / 11,000 (10s)

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REPLICATE_API_TOKEN` | Replicate API token | (required) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID for auth | (required for login) |
| `REPLICATE_MODEL` | Video model | `minimax/video-01-live` |
| `INITIAL_CREDITS` | Free credits per user | `10` |
| `ZORIA_TREASURY_WALLET` | BSC wallet for $ZORIA payments | — |
| `NEXT_PUBLIC_ZORIA_TREASURY` | Same, for frontend | — |

## Tech Stack

- **Next.js 16** (App Router)
- **Tailwind CSS v4**
- **Replicate API** (Minimax, Wan)
- **Privy** — wallet auth
- **BSC** — $ZORIA token payments
- **JSON file storage** (no database)
