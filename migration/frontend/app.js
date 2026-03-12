(function () {
  'use strict';

  const API_BASE = window.location.origin;

  const SOL = window.SolanaLib || window.SolanaBundle;

  const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const B58MAP = {};
  for (let i = 0; i < B58.length; i++) B58MAP[B58[i]] = i;

  function b58toBytes(str) {
    const result = new Uint8Array(32);
    const digits = [0];
    for (let i = 0; i < str.length; i++) {
      const c = B58MAP[str[i]];
      if (c === undefined) throw new Error('Bad b58 char: ' + str[i]);
      let carry = c;
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] * 58;
        digits[j] = carry % 256;
        carry = (carry / 256) | 0;
      }
      while (carry > 0) {
        digits.push(carry % 256);
        carry = (carry / 256) | 0;
      }
    }
    let leadingZeros = 0;
    for (let i = 0; i < str.length && str[i] === '1'; i++) leadingZeros++;
    const raw = [];
    for (let i = 0; i < leadingZeros; i++) raw.push(0);
    for (let i = digits.length - 1; i >= 0; i--) raw.push(digits[i]);
    const bytes = new Uint8Array(raw);
    if (bytes.length === 32) return bytes;
    if (bytes.length > 32) return bytes.slice(bytes.length - 32);
    const padded = new Uint8Array(32);
    padded.set(bytes, 32 - bytes.length);
    return padded;
  }

  function pk(addr) {
    if (typeof addr === 'string') {
      return new SOL.PublicKey(b58toBytes(addr));
    }
    if (addr && addr.toBytes) {
      return new SOL.PublicKey(addr.toBytes());
    }
    return new SOL.PublicKey(addr);
  }

  let config = null;
  let phantomProvider = null;
  let connectedWallet = null;
  let currentMigrationTx = null;
  let pollInterval = null;

  // DOM
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    btnConnect: $('#btnConnectPhantom'),
    btnDisconnect: $('#btnDisconnect'),
    btnMigrate: $('#btnMigrate'),
    walletInfo: $('#walletInfo'),
    walletAddress: $('#walletAddress'),
    bscAddress: $('#bscAddress'),
    amountInput: $('#amountInput'),
    receiveAmount: $('#receiveAmount'),
    amountHint: $('#amountHint'),
    migrationSummary: $('#migrationSummary'),
    summarySend: $('#summarySend'),
    summaryReceive: $('#summaryReceive'),
    summaryBsc: $('#summaryBsc'),
    statusSection: $('#statusSection'),
    statusIcon: $('#statusIcon'),
    statusText: $('#statusText'),
    statusDetail: $('#statusDetail'),
    txLinks: $('#txLinks'),
    solanaTxLink: $('#solanaTxLink'),
    bscTxLink: $('#bscTxLink'),
    migrationsBody: $('#migrationsBody'),
    cursorGlow: $('#cursorGlow'),
    step1: $('#step1'),
    step2: $('#step2'),
    step3: $('#step3'),
    step4: $('#step4'),
  };

  // ===========================
  // Init
  // ===========================

  async function init() {
    await loadConfig();
    setupCursorGlow();
    setupEventListeners();
    loadRecentMigrations();
  }

  async function loadConfig() {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      config = await res.json();
    } catch (err) {
      console.error('Failed to load config:', err);
      config = {
        solanaTokenMint: '9ivAqqyrQiSTa3sgV7K8jLeVNVU64StEBzuuR6Fgpump',
        solanaVaultAddress: '',
        bscTokenAddress: '0x0B71296D09B5aa459c6c79A425e41Aa9179D7777',
        exchangeRateSend: 4,
        exchangeRateReceive: 1,
        minMigrationAmount: 4,
      };
    }
  }

  // ===========================
  // Cursor Glow
  // ===========================

  function setupCursorGlow() {
    if (window.innerWidth < 768) return;
    document.addEventListener('mousemove', (e) => {
      els.cursorGlow.style.left = e.clientX + 'px';
      els.cursorGlow.style.top = e.clientY + 'px';
      els.cursorGlow.style.opacity = '1';
    });
    document.addEventListener('mouseleave', () => {
      els.cursorGlow.style.opacity = '0';
    });
  }

  // ===========================
  // Event Listeners
  // ===========================

  function setupEventListeners() {
    els.btnConnect.addEventListener('click', connectPhantom);
    els.btnDisconnect.addEventListener('click', disconnectWallet);
    els.bscAddress.addEventListener('input', onBscAddressInput);
    els.amountInput.addEventListener('input', onAmountInput);
    els.btnMigrate.addEventListener('click', startMigration);

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
          btn.classList.add('copied');
          const svg = btn.innerHTML;
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = svg;
          }, 1500);
        });
      });
    });
  }

  // ===========================
  // Wallet Connection
  // ===========================

  async function connectPhantom() {
    if (!window.solana || !window.solana.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return;
    }

    try {
      phantomProvider = window.solana;
      const response = await phantomProvider.connect();
      connectedWallet = response.publicKey.toString();

      els.btnConnect.classList.add('hidden');
      els.walletInfo.classList.remove('hidden');
      els.walletAddress.textContent = shortenAddress(connectedWallet);

      enableStep(2);
      els.bscAddress.disabled = false;
    } catch (err) {
      console.error('Phantom connect error:', err);
    }
  }

  function disconnectWallet() {
    if (phantomProvider) {
      phantomProvider.disconnect();
    }
    phantomProvider = null;
    connectedWallet = null;

    els.btnConnect.classList.remove('hidden');
    els.walletInfo.classList.add('hidden');
    els.bscAddress.value = '';
    els.bscAddress.disabled = true;
    els.amountInput.value = '';
    els.amountInput.disabled = true;
    els.receiveAmount.textContent = '0';
    els.btnMigrate.disabled = true;
    els.migrationSummary.classList.add('hidden');

    disableStep(2);
    disableStep(3);
    disableStep(4);
  }

  // ===========================
  // BSC Address
  // ===========================

  function onBscAddressInput() {
    const val = els.bscAddress.value.trim();
    const valid = /^0x[a-fA-F0-9]{40}$/.test(val);

    if (valid) {
      enableStep(3);
      els.amountInput.disabled = false;
    } else {
      disableStep(3);
      disableStep(4);
      els.amountInput.disabled = true;
    }
  }

  // ===========================
  // Amount
  // ===========================

  function onAmountInput() {
    const val = parseFloat(els.amountInput.value);
    const hint = els.amountHint;

    if (isNaN(val) || val <= 0) {
      els.receiveAmount.textContent = '0';
      hint.textContent = `Minimum: ${config.minMigrationAmount} tokens (divisible by ${config.exchangeRateSend})`;
      hint.classList.remove('error');
      disableStep(4);
      return;
    }

    if (val < config.minMigrationAmount) {
      hint.textContent = `Minimum amount is ${config.minMigrationAmount} tokens`;
      hint.classList.add('error');
      els.receiveAmount.textContent = '0';
      disableStep(4);
      return;
    }

    if (val % config.exchangeRateSend !== 0) {
      hint.textContent = `Amount must be divisible by ${config.exchangeRateSend}`;
      hint.classList.add('error');
      els.receiveAmount.textContent = '0';
      disableStep(4);
      return;
    }

    hint.textContent = `Minimum: ${config.minMigrationAmount} tokens (divisible by ${config.exchangeRateSend})`;
    hint.classList.remove('error');

    const receive = (val / config.exchangeRateSend) * config.exchangeRateReceive;
    els.receiveAmount.textContent = formatNumber(receive);

    enableStep(4);
    updateSummary(val, receive);
  }

  function updateSummary(send, receive) {
    els.migrationSummary.classList.remove('hidden');
    els.summarySend.textContent = `${formatNumber(send)} ZORIA (SOL)`;
    els.summaryReceive.textContent = `${formatNumber(receive)} ZORIA (BSC)`;
    els.summaryBsc.textContent = shortenAddress(els.bscAddress.value.trim());
    els.btnMigrate.disabled = false;
  }

  // ===========================
  // Migration
  // ===========================

  async function startMigration() {
    if (!connectedWallet || !config) return;

    const amount = parseFloat(els.amountInput.value);
    const bscAddr = els.bscAddress.value.trim();

    els.btnMigrate.disabled = true;
    els.btnMigrate.classList.add('loading');
    els.btnMigrate.textContent = 'Sending tokens...';

    try {
      const txSignature = await sendSolanaTokens(amount);

      els.btnMigrate.textContent = 'Registering migration...';
      currentMigrationTx = txSignature;

      showStatus('pending', 'Transaction Sent', 'Verifying your Solana transaction...');
      els.solanaTxLink.href = `https://solscan.io/tx/${txSignature}`;
      els.solanaTxLink.classList.remove('hidden');

      const res = await fetch(`${API_BASE}/api/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solanaTx: txSignature,
          senderSolana: connectedWallet,
          receiverBsc: bscAddr,
          amountSent: amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Migration registration failed');
      }

      startPolling(txSignature);
    } catch (err) {
      console.error('Migration error:', err);

      if (err.message.includes('User rejected')) {
        showStatus('cancelled', 'Transaction Cancelled', 'You rejected the transaction in Phantom');
      } else {
        showStatus('failed', 'Migration Failed', err.message);
      }
    } finally {
      els.btnMigrate.disabled = false;
      els.btnMigrate.classList.remove('loading');
      els.btnMigrate.textContent = 'Migrate Tokens';
    }
  }

  async function sendSolanaTokens(amount) {
    showStatus('pending', 'Step 1/7', 'Creating connection...');
    const connection = new SOL.Connection(API_BASE + '/api/solana-rpc', 'confirmed');

    showStatus('pending', 'Step 2/7', 'Resolving addresses...');
    const mintPubkey = pk(config.solanaTokenMint);
    const vaultPubkey = pk(config.solanaVaultAddress);
    const senderPubkey = pk(phantomProvider.publicKey.toBase58());

    const TOKEN_PROGRAM_ID = pk('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
    const ASSOCIATED_TOKEN_PROGRAM_ID = pk('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

    showStatus('pending', 'Step 3/7', 'Deriving token accounts...');
    let senderATA, vaultATA;
    try {
      senderATA = SOL.PublicKey.findProgramAddressSync(
        [senderPubkey.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mintPubkey.toBytes()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
    } catch (e) { throw new Error('Failed to derive sender ATA: ' + e.message); }
    try {
      vaultATA = SOL.PublicKey.findProgramAddressSync(
        [vaultPubkey.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mintPubkey.toBytes()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
    } catch (e) { throw new Error('Failed to derive vault ATA: ' + e.message); }

    showStatus('pending', 'Step 4/7', 'Checking token balance...');
    const senderAccountInfo = await connection.getAccountInfo(senderATA);
    if (!senderAccountInfo) {
      throw new Error('You do not have a token account for ZORIA. Make sure you hold tokens in your wallet.');
    }

    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
    const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 6;
    const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

    showStatus('pending', 'Step 5/7', 'Building transaction...');
    const transaction = new SOL.Transaction();

    const vaultAccountInfo = await connection.getAccountInfo(vaultATA);
    if (!vaultAccountInfo) {
      const SYSVAR_RENT = pk('SysvarRent111111111111111111111111111111111');
      transaction.add(new SOL.TransactionInstruction({
        keys: [
          { pubkey: senderPubkey, isSigner: true, isWritable: true },
          { pubkey: vaultATA, isSigner: false, isWritable: true },
          { pubkey: vaultPubkey, isSigner: false, isWritable: false },
          { pubkey: mintPubkey, isSigner: false, isWritable: false },
          { pubkey: SOL.SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
        ],
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        data: new Uint8Array(0),
      }));
    }

    const transferData = new Uint8Array(1 + 8 + 1);
    transferData[0] = 12;
    new DataView(transferData.buffer).setBigUint64(1, rawAmount, true);
    transferData[9] = decimals;

    transaction.add(new SOL.TransactionInstruction({
      keys: [
        { pubkey: senderATA, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: vaultATA, isSigner: false, isWritable: true },
        { pubkey: senderPubkey, isSigner: true, isWritable: false },
      ],
      programId: TOKEN_PROGRAM_ID,
      data: transferData,
    }));

    showStatus('pending', 'Step 6/7', 'Requesting signature from Phantom...');
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    const signed = await phantomProvider.signTransaction(transaction);

    showStatus('pending', 'Step 7/7', 'Sending transaction...');
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    return signature;
  }

  // ===========================
  // Polling
  // ===========================

  function startPolling(solanaTx) {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status/${solanaTx}`);
        const data = await res.json();

        switch (data.status) {
          case 'pending':
            showStatus('pending', 'Pending', 'Waiting for verification...');
            break;
          case 'verifying':
            showStatus('pending', 'Verifying', 'Checking your Solana transaction...');
            break;
          case 'sending':
            showStatus('pending', 'Sending', 'Sending BSC tokens to your wallet...');
            break;
          case 'completed':
            showStatus('completed', 'Migration Complete!',
              `${data.amountReceive} ZORIA tokens sent to your BSC wallet`);
            if (data.bscTx) {
              els.bscTxLink.href = `https://bscscan.com/tx/${data.bscTx}`;
              els.bscTxLink.parentElement.classList.remove('hidden');
              els.txLinks.classList.remove('hidden');
            }
            stopPolling();
            loadRecentMigrations();
            break;
          case 'failed':
            showStatus('failed', 'Migration Failed', data.error || 'An error occurred');
            stopPolling();
            break;
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // ===========================
  // Status Display
  // ===========================

  function showStatus(type, title, detail) {
    els.statusSection.classList.remove('hidden');

    let iconHtml = '';
    if (type === 'pending') {
      iconHtml = '<div class="spinner"></div>';
    } else if (type === 'completed') {
      iconHtml = '<div class="check">✓</div>';
    } else if (type === 'failed' || type === 'cancelled') {
      iconHtml = '<div class="fail">✗</div>';
    }

    els.statusIcon.innerHTML = iconHtml;
    els.statusText.textContent = title;
    els.statusDetail.textContent = detail;

    if (type !== 'completed') {
      els.txLinks.classList.add('hidden');
    }
  }

  // ===========================
  // Recent Migrations
  // ===========================

  async function loadRecentMigrations() {
    try {
      const res = await fetch(`${API_BASE}/api/recent`);
      const migrations = await res.json();

      if (!migrations.length) {
        els.migrationsBody.innerHTML = '<tr><td colspan="5" class="empty-state">No migrations yet</td></tr>';
        return;
      }

      els.migrationsBody.innerHTML = migrations.map(m => `
        <tr>
          <td>
            <a href="https://solscan.io/tx/${m.solanaTx}" target="_blank" class="tx-hash">
              ${shortenTx(m.solanaTx)}
            </a>
          </td>
          <td>${formatNumber(m.amountSent)}</td>
          <td>${formatNumber(m.amountReceive)}</td>
          <td><span class="status-badge ${m.status}">${m.status}</span></td>
          <td>${timeAgo(m.createdAt)}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load migrations:', err);
    }
  }

  // ===========================
  // Step Management
  // ===========================

  function enableStep(num) {
    const step = $(`#step${num}`);
    if (step) step.classList.remove('disabled');
  }

  function disableStep(num) {
    const step = $(`#step${num}`);
    if (step) step.classList.add('disabled');
  }

  // ===========================
  // Helpers
  // ===========================

  function shortenAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  function shortenTx(tx) {
    if (!tx) return '';
    return tx.slice(0, 8) + '...' + tx.slice(-6);
  }

  function formatNumber(n) {
    if (n === null || n === undefined) return '0';
    const num = parseFloat(n);
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  // ===========================
  // Boot
  // ===========================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
