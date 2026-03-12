# ZoriaGen — AI Video Generator

Generate AI videos from images and text prompts using Replicate's video generation models.

## Quick Start

### 1. Get a Replicate API Token

Go to [https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) and create a free account. Copy your API token.

### 2. Configure

Edit `.env.local` and paste your token:

```
REPLICATE_API_TOKEN=r8_your_actual_token_here
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to Use

1. **Upload an actor image** (PNG or JPEG, up to 5MB)
2. **Write an action prompt** or click "AI Suggest" for ideas
3. **Click "Create Video"** — costs 10 credits per video
4. **Go to Gallery** to see your videos being generated

## Credits

You start with 100 free credits. Each video costs 10 credits.
To add more, edit `data/store.json` and change the `credits` value.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `REPLICATE_API_TOKEN` | Your Replicate API token | (required) |
| `REPLICATE_MODEL` | Video generation model | `minimax/video-01-live` |
| `INITIAL_CREDITS` | Starting credits | `100` |

## Tech Stack

- **Next.js 16** (App Router)
- **Tailwind CSS v4**
- **Replicate API** for AI video generation
- **JSON file storage** (no database needed)
