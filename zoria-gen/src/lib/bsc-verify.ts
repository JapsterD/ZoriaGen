const BSC_RPC = "https://bsc-dataseed1.binance.org";
const ZORIA_CONTRACT = "0x0B71296D09B5aa459c6c79A425e41Aa9179D7777".toLowerCase();
const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function waitForReceipt(txHash: string, maxRetries = 10, delayMs = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export async function verifyZoriaTransfer(
  txHash: string,
  expectedAmount: bigint,
  senderWallet: string,
): Promise<{ valid: boolean; error?: string }> {
  const treasury = (process.env.ZORIA_TREASURY_WALLET || "").toLowerCase();
  if (!treasury) {
    return { valid: false, error: "Treasury wallet not configured" };
  }

  try {
    const receipt = await waitForReceipt(txHash);

    if (!receipt) {
      return { valid: false, error: "Transaction not confirmed after 30 seconds" };
    }

    if (receipt.status !== "0x1") {
      return { valid: false, error: "Transaction failed on-chain" };
    }

    const logs: Array<{ address: string; topics: string[]; data: string }> = receipt.logs || [];

    const transferLog = logs.find(
      (log) =>
        log.address.toLowerCase() === ZORIA_CONTRACT &&
        log.topics[0] === TRANSFER_EVENT_TOPIC,
    );

    if (!transferLog) {
      return { valid: false, error: "No ZORIA transfer event found in transaction" };
    }

    const from = "0x" + transferLog.topics[1].slice(26).toLowerCase();
    const to = "0x" + transferLog.topics[2].slice(26).toLowerCase();
    const amount = BigInt(transferLog.data);

    if (from !== senderWallet.toLowerCase()) {
      return { valid: false, error: "Transfer sender does not match wallet" };
    }

    if (to !== treasury) {
      return { valid: false, error: "Transfer recipient is not the treasury wallet" };
    }

    if (amount < expectedAmount) {
      return { valid: false, error: `Insufficient amount: expected ${expectedAmount}, got ${amount}` };
    }

    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown verification error";
    return { valid: false, error: message };
  }
}

export function zoriaToRaw(amount: number, decimals: number = 18): bigint {
  return BigInt(amount) * BigInt(10 ** decimals);
}
