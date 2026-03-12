# ZoriaGen

An AI video generator that creates clips from images and text prompts, built on **BNB Smart Chain (BSC)** for premium $ZORIA token payments and compatible with Replicate API models.

## Technology Stack

- **Blockchain**: BNB Smart Chain (BSC) for $ZORIA token payments
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4 + Privy (wallet auth)
- **AI**: Replicate API (Minimax, Wan video models)
- **Storage**: JSON file storage (no database)

## Supported Networks

- **BNB Smart Chain Mainnet** (Chain ID: 56) — $ZORIA payments for premium video generation

## Contract Addresses

| Network | Token Contract ($ZORIA) |
|---------|-------------------------|
| BNB Mainnet | `0x0B71296D09B5aa459c6c79A425e41Aa9179D7777` |

## Features

- **Free tier** — Generate 480p, 5-second videos using credits (10 credits per video)
- **Premium tier** — Pay with $ZORIA tokens on BSC for 720p/1080p, 5–10s, no watermark
- **On-chain verification** — BSC transfers to treasury wallet verified before generation
- **Low-cost payments** — Gas-efficient ERC-20 transfers on BNB Smart Chain
- **Wallet integration** — Privy auth with BSC chain switching

## Quick Start

### 1. Get API tokens

- [Replicate API token](https://replicate.com/account/api-tokens)
- [Privy App ID](https://dashboard.privy.io) for wallet login

### 2. Configure

```bash
cp .env.example .env.local
```

Fill in `REPLICATE_API_TOKEN`, `NEXT_PUBLIC_PRIVY_APP_ID`, and optionally `ZORIA_TREASURY_WALLET` for $ZORIA payments.

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Payment Options

| Method | Output | Cost | Watermark |
|--------|--------|------|-----------|
| Credits | 480p, 5s | 10 credits | Yes |
| $ZORIA (BSC) | 480p–1080p, 5–10s | 2,000–11,000 $ZORIA | No |

## Configuration

| Variable | Description |
|----------|-------------|
| `REPLICATE_API_TOKEN` | Replicate API token (required) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID (required for login) |
| `ZORIA_TREASURY_WALLET` | BSC wallet for $ZORIA payments |
| `NEXT_PUBLIC_ZORIA_TREASURY` | Same, for frontend |
| `INITIAL_CREDITS` | Free credits per user (default: 10) |
