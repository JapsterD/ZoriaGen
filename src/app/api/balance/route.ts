import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ZORIA_BSC_CONTRACT = "0x0B71296D09B5aa459c6c79A425e41Aa9179D7777";
const BSC_RPC = "https://bsc-dataseed1.binance.org";

// ERC-20 balanceOf(address) → uint256
// selector: 0x70a08231
// ERC-20 decimals() → uint8
// selector: 0x313ce567

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

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }

  try {
    const paddedAddress = "0x70a08231" + wallet.slice(2).toLowerCase().padStart(64, "0");

    const rawBalance = await rpcCall("eth_call", [
      { to: ZORIA_BSC_CONTRACT, data: paddedAddress },
      "latest",
    ]);

    const decimalsHex = await rpcCall("eth_call", [
      { to: ZORIA_BSC_CONTRACT, data: "0x313ce567" },
      "latest",
    ]);

    const decimals = parseInt(decimalsHex, 16);
    const balanceBig = BigInt(rawBalance);
    const divisor = BigInt(10 ** decimals);
    const whole = balanceBig / divisor;
    const remainder = balanceBig % divisor;
    const fractional = remainder.toString().padStart(decimals, "0").slice(0, 2);

    const balance = `${whole.toLocaleString()}.${fractional}`;

    return NextResponse.json({
      balance,
      raw: balanceBig.toString(),
      decimals,
    });
  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}
