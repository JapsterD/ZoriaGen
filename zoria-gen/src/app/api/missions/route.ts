import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getMissions, updateMission } from "@/lib/store";
import { checkPrediction } from "@/lib/replicate";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

function findFfmpeg(): string {
  if (existsSync("/usr/bin/ffmpeg")) return "/usr/bin/ffmpeg";
  if (existsSync("/usr/local/bin/ffmpeg")) return "/usr/local/bin/ffmpeg";
  const staticPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg");
  if (existsSync(staticPath)) return staticPath;
  return "ffmpeg";
}

async function addWatermark(inputPath: string, outputPath: string): Promise<boolean> {
  const ffmpeg = findFfmpeg();
  const drawtext = [
    "drawtext=text='Created by $ZORIA':fontsize=16:fontcolor=white@0.7:x=w-tw-16:y=h-th-36:shadowcolor=black@0.5:shadowx=1:shadowy=1",
    "drawtext=text='ai16zoria.xyz':fontsize=12:fontcolor=white@0.5:x=w-tw-16:y=h-th-16:shadowcolor=black@0.5:shadowx=1:shadowy=1",
  ].join(",");

  try {
    await execFileAsync(ffmpeg, [
      "-i", inputPath,
      "-vf", drawtext,
      "-codec:a", "copy",
      "-y",
      outputPath,
    ], { timeout: 120_000 });
    return true;
  } catch (err) {
    console.error("ffmpeg watermark failed:", err);
    return false;
  }
}

async function downloadVideoLocally(url: string, skipWatermark = false): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const rawFilename = `raw-${uuidv4()}.mp4`;
    const rawPath = path.join(uploadDir, rawFilename);
    await writeFile(rawPath, buffer);

    const finalFilename = `${uuidv4()}.mp4`;
    const finalPath = path.join(uploadDir, finalFilename);

    if (skipWatermark) {
      const { rename } = await import("fs/promises");
      await rename(rawPath, finalPath);
      return `/uploads/${finalFilename}`;
    }

    const watermarked = await addWatermark(rawPath, finalPath);

    if (watermarked) {
      await unlink(rawPath).catch(() => {});
      return `/uploads/${finalFilename}`;
    }

    const { rename } = await import("fs/promises");
    await rename(rawPath, finalPath);
    return `/uploads/${finalFilename}`;
  } catch (err) {
    console.error("Failed to download video locally:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.headers.get("x-wallet-address");
    if (!wallet) {
      return NextResponse.json({ missions: [] });
    }

    const missions = getMissions(wallet);

    const pendingMissions = missions.filter(
      (m) =>
        (m.status === "generating" || m.status === "pending") &&
        m.predictionId
    );

    for (const mission of pendingMissions) {
      try {
        const prediction = await checkPrediction(mission.predictionId!);

        if (prediction.status === "succeeded" && prediction.output) {
          const replicateUrl = typeof prediction.output === "string" ? prediction.output : null;
          let localUrl: string | null = null;

          if (replicateUrl) {
            localUrl = await downloadVideoLocally(replicateUrl, !!mission.paidWithZoria);
          }

          updateMission(wallet, mission.id, {
            status: "completed",
            videoUrl: localUrl || replicateUrl,
          });
          mission.status = "completed";
          mission.videoUrl = localUrl || replicateUrl;
        } else if (
          prediction.status === "failed" ||
          prediction.status === "canceled"
        ) {
          updateMission(wallet, mission.id, {
            status: "failed",
            error: prediction.error || "Generation failed",
          });
          mission.status = "failed";
          mission.error = prediction.error || "Generation failed";
        }
      } catch (err) {
        console.error(
          `Failed to check prediction for mission ${mission.id}:`,
          err
        );
      }
    }

    return NextResponse.json({ missions: getMissions(wallet) });
  } catch (error) {
    console.error("Missions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch missions" },
      { status: 500 }
    );
  }
}
