const { Connection, PublicKey } = require('@solana/web3.js');
const { ethers } = require('ethers');
const db = require('./db');

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

class Relayer {
  constructor(config) {
    this.solanaConnection = new Connection(config.solanaRpcUrl, 'confirmed');
    this.solanaTokenMint = new PublicKey(config.solanaTokenMint);
    this.solanaVaultAddress = new PublicKey(config.solanaVaultAddress);

    this.bscProvider = new ethers.JsonRpcProvider(config.bscRpcUrl);
    this.bscWallet = new ethers.Wallet(config.bscPrivateKey, this.bscProvider);
    this.bscTokenContract = new ethers.Contract(config.bscTokenAddress, ERC20_ABI, this.bscWallet);

    this.exchangeRateSend = config.exchangeRateSend;
    this.exchangeRateReceive = config.exchangeRateReceive;
    this.minAmount = config.minAmount;

    this.processing = new Set();
    this.solanaDecimals = null;
    this.bscDecimals = null;
  }

  async init() {
    this.bscDecimals = await this.bscTokenContract.decimals();
    console.log(`[Relayer] BSC token decimals: ${this.bscDecimals}`);

    const bscBalance = await this.bscTokenContract.balanceOf(this.bscWallet.address);
    console.log(`[Relayer] BSC wallet balance: ${ethers.formatUnits(bscBalance, this.bscDecimals)}`);

    await this.recoverPending();
    console.log('[Relayer] Initialized');
  }

  async recoverPending() {
    const pending = db.getPendingMigrations();
    if (pending.length > 0) {
      console.log(`[Relayer] Recovering ${pending.length} pending migrations...`);
      for (const migration of pending) {
        await this.processMigration(migration.solana_tx);
      }
    }
  }

  async verifySolanaTransaction(txSignature) {
    try {
      const tx = await this.solanaConnection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) return { valid: false, error: 'Transaction not found' };
      if (tx.meta?.err) return { valid: false, error: 'Transaction failed on-chain' };

      const instructions = tx.transaction.message.instructions;
      const innerInstructions = tx.meta?.innerInstructions || [];
      const allInstructions = [
        ...instructions,
        ...innerInstructions.flatMap(ix => ix.instructions),
      ];

      let transferFound = null;

      for (const ix of allInstructions) {
        if (ix.parsed?.type === 'transferChecked' && (ix.program === 'spl-token' || ix.program === 'spl-token-2022')) {
          const info = ix.parsed.info;
          if (info.mint === this.solanaTokenMint.toBase58()) {
            const destAccount = info.destination;
            const destInfo = await this.solanaConnection.getParsedAccountInfo(new PublicKey(destAccount));
            const owner = destInfo?.value?.data?.parsed?.info?.owner;

            if (owner === this.solanaVaultAddress.toBase58()) {
              transferFound = {
                amount: parseFloat(info.tokenAmount.uiAmount),
                sender: info.authority,
                decimals: info.tokenAmount.decimals,
              };
              break;
            }
          }
        }

        if (ix.parsed?.type === 'transfer' && (ix.program === 'spl-token' || ix.program === 'spl-token-2022')) {
          const info = ix.parsed.info;
          const destAccount = info.destination;

          try {
            const destInfo = await this.solanaConnection.getParsedAccountInfo(new PublicKey(destAccount));
            const parsed = destInfo?.value?.data?.parsed;
            if (parsed?.info?.mint === this.solanaTokenMint.toBase58() &&
                parsed?.info?.owner === this.solanaVaultAddress.toBase58()) {
              const decimals = parsed.info.tokenAmount?.decimals || 6;
              transferFound = {
                amount: parseInt(info.amount) / Math.pow(10, decimals),
                sender: info.authority,
                decimals,
              };
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!transferFound) {
        return { valid: false, error: 'No matching SPL token transfer to vault found' };
      }

      if (transferFound.amount < this.minAmount) {
        return { valid: false, error: `Amount ${transferFound.amount} below minimum ${this.minAmount}` };
      }

      this.solanaDecimals = transferFound.decimals;

      return {
        valid: true,
        amount: transferFound.amount,
        sender: transferFound.sender,
      };
    } catch (err) {
      return { valid: false, error: `Verification error: ${err.message}` };
    }
  }

  calculateBscAmount(solanaAmount) {
    return (solanaAmount / this.exchangeRateSend) * this.exchangeRateReceive;
  }

  async sendBscTokens(receiverAddress, amount) {
    const amountWei = ethers.parseUnits(amount.toString(), this.bscDecimals);

    const balance = await this.bscTokenContract.balanceOf(this.bscWallet.address);
    if (balance < amountWei) {
      throw new Error('Insufficient BSC token balance in relayer wallet');
    }

    const tx = await this.bscTokenContract.transfer(receiverAddress, amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async processMigration(solanaTx) {
    if (this.processing.has(solanaTx)) return;
    this.processing.add(solanaTx);

    try {
      const migration = db.getMigrationByTx(solanaTx);
      if (!migration || migration.status !== 'pending') {
        this.processing.delete(solanaTx);
        return;
      }

      console.log(`[Relayer] Processing migration: ${solanaTx}`);
      db.updateMigrationStatus(solanaTx, 'verifying');

      let verification = null;
      for (let attempt = 1; attempt <= 10; attempt++) {
        verification = await this.verifySolanaTransaction(solanaTx);
        if (verification.valid) break;
        if (verification.error === 'Transaction not found') {
          console.log(`[Relayer] TX not confirmed yet, retry ${attempt}/10 in 10s...`);
          await new Promise(r => setTimeout(r, 10000));
        } else {
          break;
        }
      }

      if (!verification.valid) {
        console.log(`[Relayer] Verification failed: ${verification.error}`);
        db.updateMigrationStatus(solanaTx, 'failed', null, verification.error);
        this.processing.delete(solanaTx);
        return;
      }

      const expectedBscAmount = this.calculateBscAmount(verification.amount);

      if (Math.abs(expectedBscAmount - migration.amount_receive) > 0.0001) {
        db.updateMigrationStatus(solanaTx, 'failed', null, 'Amount mismatch after verification');
        this.processing.delete(solanaTx);
        return;
      }

      db.updateMigrationStatus(solanaTx, 'sending');
      console.log(`[Relayer] Sending ${expectedBscAmount} BSC tokens to ${migration.receiver_bsc}`);

      const bscTxHash = await this.sendBscTokens(migration.receiver_bsc, expectedBscAmount);
      db.updateMigrationStatus(solanaTx, 'completed', bscTxHash);
      console.log(`[Relayer] Migration completed. BSC TX: ${bscTxHash}`);
    } catch (err) {
      console.error(`[Relayer] Error processing ${solanaTx}:`, err.message);
      db.updateMigrationStatus(solanaTx, 'failed', null, err.message);
    } finally {
      this.processing.delete(solanaTx);
    }
  }
}

module.exports = Relayer;
