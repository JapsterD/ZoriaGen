# ZORIA Token Migration Bridge

Cross-chain token migration: Solana → BSC.

Users send ZORIA tokens on Solana and receive ZORIA tokens on BSC at a 4:1 rate.

## Setup

### 1. Install dependencies

```bash
cd migration
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- `SOLANA_VAULT_ADDRESS` — your Solana wallet public key (where users send tokens)
- `BSC_PRIVATE_KEY` — private key of your BSC wallet (holds tokens to distribute)

### 3. Run

```bash
npm start
```

The server runs on `http://localhost:3000`.

## Architecture

```
Frontend (static)  →  Express API  →  Relayer
                                       ├── Verifies Solana TX
                                       └── Sends BSC tokens
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Bridge configuration |
| POST | `/api/migrate` | Register a migration |
| GET | `/api/status/:solanaTx` | Check migration status |
| GET | `/api/recent` | Recent migrations |

## VPS Deployment

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
cd /var/www
git clone <your-repo> migration
cd migration
npm install
cp .env.example .env
nano .env  # fill in keys

# Run with PM2
npm install -g pm2
pm2 start backend/server.js --name zoria-bridge
pm2 save
pm2 startup
```

Use Nginx as reverse proxy for HTTPS.
