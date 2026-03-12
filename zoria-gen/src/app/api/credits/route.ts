import { NextRequest, NextResponse } from "next/server";
import { getCredits } from "@/lib/store";

export async function GET(request: NextRequest) {
  const wallet = request.headers.get("x-wallet-address");
  if (!wallet) {
    return NextResponse.json({ credits: 0 });
  }
  return NextResponse.json({ credits: getCredits(wallet) });
}
