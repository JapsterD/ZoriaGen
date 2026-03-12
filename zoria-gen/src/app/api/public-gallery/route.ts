import { NextResponse } from "next/server";
import { getAllCompletedMissions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const missions = getAllCompletedMissions().map((m) => ({
      id: m.id,
      imageUrl: m.imageUrl,
      prompt: m.prompt,
      videoUrl: m.videoUrl,
      createdAt: m.createdAt,
      wallet: `${m.wallet.slice(0, 6)}...${m.wallet.slice(-4)}`,
      paidWithZoria: m.paidWithZoria || false,
      quality: m.quality || "480p",
      duration: m.duration || 5,
    }));

    return NextResponse.json({ missions });
  } catch (error) {
    console.error("Public gallery error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
