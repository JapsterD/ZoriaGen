import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createMission, deductCredits } from "@/lib/store";
import type { VideoQuality, VideoDuration } from "@/lib/store";
import { startVideoGeneration } from "@/lib/replicate";
import { verifyZoriaTransfer, zoriaToRaw } from "@/lib/bsc-verify";

const CREDIT_COST = 10;

const ZORIA_PRICE: Record<string, Record<number, number>> = {
  "480p": { 5: 2000, 10: 7000 },
  "720p": { 5: 4000, 10: 9000 },
  "1080p": { 5: 6000, 10: 11000 },
};

function getZoriaPrice(quality: VideoQuality, duration: VideoDuration): number {
  return ZORIA_PRICE[quality]?.[duration] ?? 0;
}

export async function POST(request: NextRequest) {
  try {
    const wallet = request.headers.get("x-wallet-address");
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;
    const prompt = formData.get("prompt") as string;
    const paymentMethod = (formData.get("paymentMethod") as string) || "credits";
    const quality = (formData.get("quality") as VideoQuality) || "480p";
    const duration = parseInt(formData.get("duration") as string) || 5;
    const txHash = formData.get("txHash") as string | null;

    if (!file || !prompt) {
      return NextResponse.json(
        { error: "Image and prompt are required" },
        { status: 400 }
      );
    }

    const validDuration = (duration === 10 ? 10 : 5) as VideoDuration;
    const validQuality = (["480p", "720p", "1080p"].includes(quality) ? quality : "480p") as VideoQuality;

    let paidWithZoria = false;

    if (paymentMethod === "zoria") {
      if (!txHash) {
        return NextResponse.json(
          { error: "Transaction hash is required for $ZORIA payment" },
          { status: 400 }
        );
      }

      const price = getZoriaPrice(validQuality, validDuration);
      if (price <= 0) {
        return NextResponse.json(
          { error: "Invalid quality/duration combination" },
          { status: 400 }
        );
      }

      const expectedAmount = zoriaToRaw(price);
      const verification = await verifyZoriaTransfer(txHash, expectedAmount, wallet);

      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.error || "Transaction verification failed" },
          { status: 400 }
        );
      }

      paidWithZoria = true;
    } else {
      if (!deductCredits(wallet, CREDIT_COST)) {
        return NextResponse.json(
          { error: "Not enough credits. You need " + CREDIT_COST + " credits." },
          { status: 400 }
        );
      }
    }

    const ext = file.type === "image/png" ? ".png" : ".jpg";
    const imageFilename = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imagePath = path.join(uploadDir, imageFilename);
    await writeFile(imagePath, buffer);

    const missionId = uuidv4();
    let predictionId: string | null = null;
    let status: "generating" | "failed" = "generating";
    let error: string | null = null;

    const genQuality = paidWithZoria ? validQuality : "480p";
    const genDuration = paidWithZoria ? validDuration : 5;

    try {
      const result = await startVideoGeneration(imagePath, prompt, genQuality, genDuration);
      predictionId = result.predictionId;
    } catch (err) {
      console.error("Replicate error:", err);
      status = "failed";
      error =
        err instanceof Error
          ? err.message
          : "Failed to start video generation";
    }

    createMission(wallet, {
      id: missionId,
      imageUrl: `/uploads/${imageFilename}`,
      prompt,
      status,
      videoUrl: null,
      predictionId,
      error,
      creditsCost: paidWithZoria ? 0 : CREDIT_COST,
      createdAt: new Date().toISOString(),
      paidWithZoria,
      quality: genQuality,
      duration: genDuration,
      txHash: txHash || null,
    });

    return NextResponse.json({ id: missionId, status });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    );
  }
}
