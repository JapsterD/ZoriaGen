import Replicate from "replicate";
import fs from "fs";

let replicateInstance: Replicate | null = null;

function getReplicate(): Replicate {
  if (!replicateInstance) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token || token === "r8_your_token_here") {
      throw new Error(
        "REPLICATE_API_TOKEN is not set. Get your token at https://replicate.com/account/api-tokens"
      );
    }
    replicateInstance = new Replicate({ auth: token });
  }
  return replicateInstance;
}

type VideoQuality = "480p" | "720p" | "1080p";

const FREE_MODEL = "wavespeedai/wan-2.1-i2v-480p";
const PREMIUM_MODEL = "wan-video/wan-2.5-i2v";

export async function startVideoGeneration(
  imagePath: string,
  prompt: string,
  quality: VideoQuality = "480p",
  duration: number = 5,
): Promise<{ predictionId: string }> {
  const replicate = getReplicate();
  const isPremium = quality !== "480p" || duration !== 5;
  const model = isPremium ? PREMIUM_MODEL : FREE_MODEL;

  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const dataUri = `data:${mimeType};base64,${base64}`;

  const input: Record<string, unknown> = {
    prompt,
    image: dataUri,
  };

  if (isPremium) {
    input.resolution = quality;
    input.duration = duration;
  } else {
    input.aspect_ratio = "16:9";
    input.sample_steps = 30;
    input.sample_guide_scale = 6;
    input.sample_shift = 8;
  }

  const prediction = await replicate.predictions.create({ model, input });
  return { predictionId: prediction.id };
}

export async function checkPrediction(
  predictionId: string
): Promise<{
  status: string;
  output: string | null;
  error: string | null;
}> {
  const replicate = getReplicate();
  const prediction = await replicate.predictions.get(predictionId);

  let output = prediction.output;
  if (Array.isArray(output) && output.length > 0) {
    output = output[0];
  }

  return {
    status: prediction.status,
    output: typeof output === "string" ? output : null,
    error: prediction.error ? String(prediction.error) : null,
  };
}
