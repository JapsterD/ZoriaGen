require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./db');
const Relayer = require('./relayer');

const app = express();
const PORT = process.env.PORT || 3000;

const EXCHANGE_RATE_SEND = parseFloat(process.env.EXCHANGE_RATE_SEND) || 4;
const EXCHANGE_RATE_RECEIVE = parseFloat(process.env.EXCHANGE_RATE_RECEIVE) || 1;
const MIN_MIGRATION_AMOUNT = parseFloat(process.env.MIN_MIGRATION_AMOUNT) || 4;

const relayer = new Relayer({
  solanaRpcUrl: process.env.SOLANA_RPC_URL,
  solanaTokenMint: process.env.SOLANA_TOKEN_MINT,
  solanaVaultAddress: process.env.SOLANA_VAULT_ADDRESS,
  bscRpcUrl: process.env.BSC_RPC_URL,
  bscTokenAddress: process.env.BSC_TOKEN_ADDRESS,
  bscPrivateKey: process.env.BSC_PRIVATE_KEY,
  exchangeRateSend: EXCHANGE_RATE_SEND,
  exchangeRateReceive: EXCHANGE_RATE_RECEIVE,
  minAmount: MIN_MIGRATION_AMOUNT,
});

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const migrateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/config', (_req, res) => {
  res.json({
    solanaTokenMint: process.env.SOLANA_TOKEN_MINT,
    solanaVaultAddress: process.env.SOLANA_VAULT_ADDRESS,
    bscTokenAddress: process.env.BSC_TOKEN_ADDRESS,
    exchangeRateSend: EXCHANGE_RATE_SEND,
    exchangeRateReceive: EXCHANGE_RATE_RECEIVE,
    minMigrationAmount: MIN_MIGRATION_AMOUNT,
  });
});

app.post('/api/solana-rpc', async (req, res) => {
  try {
    const response = await fetch(process.env.SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'RPC proxy error: ' + err.message });
  }
});

app.post('/api/migrate', migrateLimiter, async (req, res) => {
  try {
    const { solanaTx, senderSolana, receiverBsc, amountSent } = req.body;

    if (!solanaTx || !senderSolana || !receiverBsc || !amountSent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!/^[A-HJ-NP-Za-km-z1-9]{64,88}$/.test(solanaTx)) {
      return res.status(400).json({ error: 'Invalid Solana transaction signature' });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(receiverBsc)) {
      return res.status(400).json({ error: 'Invalid BSC address' });
    }

    const amount = parseFloat(amountSent);
    if (isNaN(amount) || amount < MIN_MIGRATION_AMOUNT) {
      return res.status(400).json({ error: `Minimum migration amount is ${MIN_MIGRATION_AMOUNT} tokens` });
    }

    if (amount % EXCHANGE_RATE_SEND !== 0) {
      return res.status(400).json({ error: `Amount must be divisible by ${EXCHANGE_RATE_SEND}` });
    }

    const amountReceive = (amount / EXCHANGE_RATE_SEND) * EXCHANGE_RATE_RECEIVE;

    const existing = db.getMigrationByTx(solanaTx);
    if (existing) {
      return res.json({
        id: existing.id,
        status: existing.status,
        message: 'Migration already registered',
      });
    }

    const id = db.createMigration({
      solanaTx,
      senderSolana,
      receiverBsc,
      amountSent: amount,
      amountReceive,
    });

    if (!id) {
      return res.status(409).json({ error: 'Migration already exists' });
    }

    relayer.processMigration(solanaTx).catch(err => {
      console.error('[Server] Background processing error:', err.message);
    });

    res.json({
      id,
      status: 'pending',
      amountSent: amount,
      amountReceive,
      message: 'Migration registered. Processing...',
    });
  } catch (err) {
    console.error('[Server] /api/migrate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/status/:solanaTx', (req, res) => {
  try {
    const migration = db.getMigrationByTx(req.params.solanaTx);
    if (!migration) {
      return res.status(404).json({ error: 'Migration not found' });
    }

    res.json({
      id: migration.id,
      solanaTx: migration.solana_tx,
      bscTx: migration.bsc_tx,
      senderSolana: migration.sender_solana,
      receiverBsc: migration.receiver_bsc,
      amountSent: migration.amount_sent,
      amountReceive: migration.amount_receive,
      status: migration.status,
      error: migration.error,
      createdAt: migration.created_at,
      updatedAt: migration.updated_at,
    });
  } catch (err) {
    console.error('[Server] /api/status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', (_req, res) => {
  try {
    const stats = db.getDb().prepare(`
      SELECT
        count(*) as totalTx,
        count(CASE WHEN status='completed' THEN 1 END) as completed,
        count(CASE WHEN status='failed' THEN 1 END) as failed,
        COALESCE(sum(CASE WHEN status='completed' THEN amount_sent END), 0) as totalSolSent,
        COALESCE(sum(CASE WHEN status='completed' THEN amount_receive END), 0) as totalBscReceived
      FROM migrations
    `).get();
    res.json(stats);
  } catch (err) {
    console.error('[Server] /api/stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/recent', (_req, res) => {
  try {
    const migrations = db.getRecentMigrations(100);
    res.json(
      migrations.map(m => ({
        id: m.id,
        solanaTx: m.solana_tx,
        bscTx: m.bsc_tx,
        receiverBsc: m.receiver_bsc,
        amountSent: m.amount_sent,
        amountReceive: m.amount_receive,
        status: m.status,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }))
    );
  } catch (err) {
    console.error('[Server] /api/recent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  try {
    await relayer.init();
    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();
