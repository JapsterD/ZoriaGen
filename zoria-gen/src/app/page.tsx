"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { ImagePlusIcon, SparkleIcon, SpinnerIcon, XIcon } from "@/components/icons";
import { VideoPlayer } from "@/components/video-player";

const ESTIMATED_TIMES: Record<string, Record<number, number>> = {
  "480p_free": { 5: 45 },
  "480p":  { 5: 75, 10: 150 },
  "720p":  { 5: 120, 10: 240 },
  "1080p": { 5: 195, 10: 360 },
};

function getEstimatedTime(quality: VideoQuality, duration: VideoDuration, isPremium: boolean): number {
  if (!isPremium) return ESTIMATED_TIMES["480p_free"][5];
  return ESTIMATED_TIMES[quality]?.[duration] ?? 300;
}

type VideoQuality = "480p" | "720p" | "1080p";
type VideoDuration = 5 | 10;
type PaymentMethod = "credits" | "zoria";

const ZORIA_CONTRACT = "0x0B71296D09B5aa459c6c79A425e41Aa9179D7777";
const TREASURY_WALLET = process.env.NEXT_PUBLIC_ZORIA_TREASURY || "0xd05692B947a8CC07FaAeCBBfd272097a086c5CCd";
const BSC_CHAIN_ID = 56;

const ZORIA_PRICES: Record<VideoQuality, Record<VideoDuration, number>> = {
  "480p": { 5: 2000, 10: 7000 },
  "720p": { 5: 4000, 10: 9000 },
  "1080p": { 5: 6000, 10: 11000 },
};

function encodeErc20Transfer(to: string, amount: bigint): string {
  const selector = "a9059cbb";
  const paddedTo = to.slice(2).toLowerCase().padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return "0x" + selector + paddedTo + paddedAmount;
}

function GenerationTracker({
  missionId,
  imagePreview,
  prompt,
  walletAddress,
  quality,
  duration,
  paidWithZoria,
}: {
  missionId: string;
  imagePreview: string;
  prompt: string;
  walletAddress: string;
  quality: VideoQuality;
  duration: VideoDuration;
  paidWithZoria: boolean;
}) {
  const router = useRouter();
  const estimatedTime = getEstimatedTime(quality, duration, paidWithZoria);
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);
  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = Math.min((elapsed / estimatedTime) * 100, 95);

  useEffect(() => {
    if (status !== "generating") return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const elapsedRef = useRef(0);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/missions", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      const mission = data.missions?.find((m: { id: string }) => m.id === missionId);
      if (!mission) return;

      if (mission.status === "completed" && mission.videoUrl) {
        setFinalElapsed(elapsedRef.current);
        setStatus("completed");
        setVideoUrl(mission.videoUrl);
      } else if (mission.status === "failed") {
        setFinalElapsed(elapsedRef.current);
        setStatus("failed");
        setError(mission.error || "Generation failed");
      }
    } catch {}
  }, [walletAddress, missionId]);

  useEffect(() => {
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  };

  if (status === "completed") {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm py-8 overlay-fade-in">
        <div className="glass-panel rounded-2xl p-8 max-w-lg w-full mx-4 text-center generation-complete my-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(240, 185, 11, 0.15)',
              border: '2px solid rgba(240, 185, 11, 0.5)',
              boxShadow: '0 0 30px rgba(240, 185, 11, 0.3)',
            }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0B90B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-heading text-xl tracking-[2px] text-shimmer mb-1">VIDEO READY</h2>
          {paidWithZoria && (
            <span className="inline-block text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-1 rounded-full mb-2"
              style={{ background: 'rgba(240, 185, 11, 0.15)', color: '#F0B90B', border: '1px solid rgba(240, 185, 11, 0.3)' }}>
              PREMIUM {quality} / {duration}s
            </span>
          )}
          <p className="text-muted-foreground text-sm mb-6">
            Generated in {formatTime(finalElapsed ?? elapsed)}
          </p>
          {videoUrl && (
            <VideoPlayer
              src={videoUrl}
              className="w-full rounded-xl mb-4 border border-accent/20 overflow-hidden"
              autoPlay
              muted
              hideWatermark={paidWithZoria}
            />
          )}
          {videoUrl && (
            <a
              href={videoUrl}
              download={`zoria-video-${Date.now()}.mp4`}
              className="flex items-center justify-center gap-2 btn-gold-outline rounded-xl px-4 py-3 text-sm font-semibold tracking-[1px] cursor-pointer mb-4 w-full"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              DOWNLOAD
            </a>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/gallery")}
              className="flex-1 btn-gold-outline rounded-xl px-4 py-3 text-sm font-semibold tracking-[1px] cursor-pointer"
            >
              GALLERY
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 btn-gold rounded-xl px-4 py-3 text-sm cursor-pointer"
            >
              CREATE ANOTHER
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-sm py-8 overlay-fade-in">
        <div className="glass-panel rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '2px solid rgba(239, 68, 68, 0.4)' }}>
            <span className="text-destructive text-2xl">&#x2717;</span>
          </div>
          <h2 className="font-heading text-xl tracking-[2px] text-destructive mb-2">FAILED</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-gold rounded-xl px-6 py-3 text-sm cursor-pointer w-full"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-sm py-8 overlay-fade-in">
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center gap-4 mb-6">
          {imagePreview && (
            <div className="w-16 h-16 rounded-xl overflow-hidden relative flex-shrink-0 border border-accent/20">
              <Image src={imagePreview} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-lg tracking-[1.5px] text-accent mb-1">GENERATING</h2>
            <p className="text-xs text-muted-foreground truncate">{prompt}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(240, 185, 11, 0.1)' }}>
            <div
              className="h-full rounded-full progress-bar-glow"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #F0B90B 0%, #FCD535 50%, #F0B90B 100%)',
                backgroundSize: '200% auto',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <SpinnerIcon className="w-3.5 h-3.5 text-accent" />
            <span className="text-muted-foreground">
              {elapsed < estimatedTime
                ? `~${formatTime(estimatedTime - elapsed)} remaining`
                : "Almost done..."}
            </span>
          </div>
          <span className="text-accent font-mono font-semibold tracking-wider">
            {formatTime(elapsed)}
          </span>
        </div>

        <div className="mt-6 space-y-3">
          <StepItem done={elapsed >= 2} active={elapsed < 2} label="Uploading image" />
          <StepItem done={elapsed >= 5} active={elapsed >= 2 && elapsed < 5} label="Preparing model" />
          <StepItem done={elapsed >= estimatedTime} active={elapsed >= 5} label={`Generating ${duration}s video (${quality})`} />
        </div>
      </div>
    </div>
  );
}

function StepItem({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
          done ? "" : active ? "generating" : ""
        }`}
        style={
          done
            ? { background: 'linear-gradient(135deg, #F0B90B, #FCD535)', boxShadow: '0 0 10px rgba(240, 185, 11, 0.4)' }
            : active
            ? { background: 'rgba(240, 185, 11, 0.15)', border: '1.5px solid rgba(240, 185, 11, 0.5)' }
            : { background: 'rgba(240, 185, 11, 0.05)', border: '1.5px solid rgba(240, 185, 11, 0.1)' }
        }
      >
        {done ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0B0E11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : active ? (
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
        ) : null}
      </div>
      <span className={`tracking-wide ${done ? "text-accent" : active ? "text-foreground" : "text-muted-foreground/40"}`}>
        {label}
      </span>
    </div>
  );
}

function QualityOption({ value, selected, onClick, label }: { value: string; selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold tracking-[1px] uppercase cursor-pointer transition-all duration-300 ${
        selected ? "" : "text-muted-foreground hover:text-foreground"
      }`}
      style={selected ? {
        background: 'rgba(240, 185, 11, 0.15)',
        border: '1px solid rgba(240, 185, 11, 0.4)',
        color: '#F0B90B',
        boxShadow: '0 0 12px rgba(240, 185, 11, 0.15)',
      } : {
        background: 'rgba(240, 185, 11, 0.04)',
        border: '1px solid rgba(240, 185, 11, 0.08)',
      }}
    >
      {label}
    </button>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const { authenticated, walletAddress, login } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credits");
  const [quality, setQuality] = useState<VideoQuality>("480p");
  const [duration, setDuration] = useState<VideoDuration>(5);
  const [zoriaBalance, setZoriaBalance] = useState<{ formatted: string; raw: string; decimals: number } | null>(null);
  const [txPending, setTxPending] = useState(false);

  const zoriaPrice = ZORIA_PRICES[quality]?.[duration] ?? 0;

  useEffect(() => {
    if (!walletAddress) return;
    fetch(`/api/balance?wallet=${walletAddress}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.balance) setZoriaBalance({ formatted: d.balance, raw: d.raw, decimals: d.decimals });
      })
      .catch(() => {});
  }, [walletAddress]);

  const hasEnoughZoria = zoriaBalance
    ? BigInt(zoriaBalance.raw) >= BigInt(zoriaPrice) * BigInt(10 ** (zoriaBalance.decimals || 18))
    : false;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Only PNG and JPEG files are supported");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB");
      return;
    }
    setError("");
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGeneratePrompt = async () => {
    if (!imageFile) return;
    setIsGeneratingPrompt(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("/api/suggest-prompt", { method: "POST", body: formData });
      const data = await res.json();
      if (data.prompt) setPrompt(data.prompt);
      else setError(data.error || "Failed to generate prompt");
    } catch {
      setError("Failed to generate prompt suggestion");
    }
    setIsGeneratingPrompt(false);
  };

  const sendZoriaPayment = async (): Promise<string> => {
    if (!walletAddress || !zoriaBalance) throw new Error("Wallet not connected");

    const amount = BigInt(zoriaPrice) * BigInt(10 ** zoriaBalance.decimals);
    const data = encodeErc20Transfer(TREASURY_WALLET, amount);

    const provider = (window as unknown as { ethereum?: { request: (args: { method: string; params: unknown[] }) => Promise<string> } }).ethereum;
    if (!provider) throw new Error("No wallet provider found");

    try {
      const currentChainId = await provider.request({ method: "eth_chainId", params: [] });
      const bscHex = "0x" + BSC_CHAIN_ID.toString(16);
      if (currentChainId !== bscHex) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: bscHex }],
          });
        } catch {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: bscHex,
              chainName: "BNB Smart Chain",
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              rpcUrls: ["https://bsc-dataseed1.binance.org"],
              blockExplorerUrls: ["https://bscscan.com"],
            }],
          });
        }
      }
    } catch {
      throw new Error("Please switch to BSC network and try again");
    }

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [{
        from: walletAddress,
        to: ZORIA_CONTRACT,
        data,
        value: "0x0",
      }],
    });

    return txHash;
  };

  const handleCreate = async () => {
    if (!authenticated || !walletAddress) {
      login();
      return;
    }
    if (!imageFile || !prompt.trim()) return;
    setIsCreating(true);
    setError("");

    let txHash: string | null = null;

    if (paymentMethod === "zoria") {
      if (!hasEnoughZoria) {
        setError(`Not enough $ZORIA. You need ${zoriaPrice.toLocaleString()} tokens.`);
        setIsCreating(false);
        return;
      }

      setTxPending(true);
      try {
        txHash = await sendZoriaPayment();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Payment failed");
        setIsCreating(false);
        setTxPending(false);
        return;
      }
      setTxPending(false);
    }

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("prompt", prompt.trim());
      formData.append("paymentMethod", paymentMethod);
      if (paymentMethod === "zoria") {
        formData.append("quality", quality);
        formData.append("duration", String(duration));
        if (txHash) formData.append("txHash", txHash);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setIsCreating(false);
        return;
      }

      setActiveMissionId(data.id);
    } catch {
      setError("Failed to start video generation");
      setIsCreating(false);
    }
  };

  const canCreate = imageFile && prompt.trim() && !isCreating;

  return (
    <div suppressHydrationWarning>
      <Header />

      {activeMissionId && walletAddress && (
        <GenerationTracker
          missionId={activeMissionId}
          imagePreview={imagePreview}
          prompt={prompt}
          walletAddress={walletAddress}
          quality={paymentMethod === "zoria" ? quality : "480p"}
          duration={paymentMethod === "zoria" ? duration : 5}
          paidWithZoria={paymentMethod === "zoria"}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-2xl tracking-[2px] mb-2 text-shimmer inline-block">
          CREATE VIDEO
        </h1>
        <p className="text-muted-foreground text-sm mb-8 tracking-wide">
          Upload an image and describe the action to generate AI video
        </p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="text-xs font-semibold text-accent/70 mb-3 tracking-[2px] uppercase">
              Actor Image
            </div>
            <div className="upload-box w-full aspect-square">
              {imagePreview ? (
                <>
                  <Image
                    src={imagePreview}
                    alt="Actor"
                    fill
                    className="object-cover rounded-2xl"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute -right-1 -top-1 w-7 h-7 rounded-full flex items-center justify-center z-10 cursor-pointer transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #F0B90B, #FCD535)',
                      color: '#0B0E11',
                    }}
                  >
                    <XIcon />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-3 items-center px-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(240, 185, 11, 0.1)', border: '1px solid rgba(240, 185, 11, 0.2)' }}>
                      <ImagePlusIcon className="text-accent" />
                    </div>
                    <div className="text-sm text-accent/80 font-medium">Add Image</div>
                    <div className="text-xs text-center text-muted-foreground/50">PNG, JPEG up to 5MB</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleImageSelect}
                    className="upload-input"
                  />
                </>
              )}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
            <div className="text-xs font-semibold text-accent/70 tracking-[2px] uppercase">
              Action Prompt
            </div>
            <div className="glass-panel p-5 rounded-2xl flex-1 relative min-h-[200px]">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-full bg-transparent focus:outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/40"
                placeholder="Describe what the actor should do... e.g. 'dancing in the rain with a big smile'"
                rows={6}
              />
              <button
                onClick={handleGeneratePrompt}
                disabled={!imageFile || isGeneratingPrompt}
                className="absolute right-4 bottom-4 flex items-center gap-1.5 btn-gold-outline rounded-lg px-3 py-2 text-xs font-semibold tracking-wide disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGeneratingPrompt ? <SpinnerIcon className="w-4 h-4" /> : <SparkleIcon className="w-4 h-4" />}
                AI SUGGEST
              </button>
            </div>

            {/* Payment method selector */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="text-xs font-semibold text-accent/70 tracking-[2px] uppercase mb-4">
                Payment
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPaymentMethod("credits")}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold tracking-wide cursor-pointer transition-all duration-300 ${
                    paymentMethod === "credits" ? "" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={paymentMethod === "credits" ? {
                    background: 'rgba(240, 185, 11, 0.12)',
                    border: '1px solid rgba(240, 185, 11, 0.35)',
                    color: '#F0B90B',
                  } : {
                    background: 'rgba(240, 185, 11, 0.03)',
                    border: '1px solid rgba(240, 185, 11, 0.08)',
                  }}
                >
                  <div className="text-xs opacity-60 mb-0.5">FREE</div>
                  10 Credits
                </button>
                <button
                  onClick={() => setPaymentMethod("zoria")}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold tracking-wide cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    paymentMethod === "zoria" ? "" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={paymentMethod === "zoria" ? {
                    background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.15), rgba(252, 213, 53, 0.08))',
                    border: '1px solid rgba(240, 185, 11, 0.4)',
                    color: '#F0B90B',
                    boxShadow: '0 0 15px rgba(240, 185, 11, 0.1)',
                  } : {
                    background: 'rgba(240, 185, 11, 0.03)',
                    border: '1px solid rgba(240, 185, 11, 0.08)',
                  }}
                >
                  <div className="text-xs opacity-60 mb-0.5">PREMIUM</div>
                  $ZORIA Tokens
                </button>
              </div>

              {paymentMethod === "zoria" && (
                <div className="space-y-4">
                  {/* Quality selector */}
                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase tracking-[1px] mb-2">Quality</div>
                    <div className="flex gap-2">
                      {(["480p", "720p", "1080p"] as VideoQuality[]).map((q) => (
                        <QualityOption key={q} value={q} label={q} selected={quality === q} onClick={() => setQuality(q)} />
                      ))}
                    </div>
                  </div>

                  {/* Duration selector */}
                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase tracking-[1px] mb-2">Duration</div>
                    <div className="flex gap-2">
                      <QualityOption value="5" label="5 sec" selected={duration === 5} onClick={() => setDuration(5)} />
                      <QualityOption value="10" label="10 sec" selected={duration === 10} onClick={() => setDuration(10)} />
                    </div>
                  </div>

                  {/* Price display */}
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'rgba(240, 185, 11, 0.06)', border: '1px solid rgba(240, 185, 11, 0.12)' }}
                  >
                    <div>
                      <div className="text-[10px] text-muted-foreground/50 uppercase tracking-[1px] mb-0.5">Total Price</div>
                      <span className="text-lg font-heading text-accent">{zoriaPrice.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">$ZORIA</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground/50 uppercase tracking-[1px] mb-0.5">Your Balance</div>
                      <span className={`text-sm font-mono ${hasEnoughZoria ? "text-success" : "text-destructive"}`}>
                        {zoriaBalance?.formatted ?? "..."}
                      </span>
                    </div>
                  </div>

                  {/* No watermark badge */}
                  <div className="flex items-center gap-2 text-xs text-success/80">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    No watermark on premium videos
                  </div>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handleCreate}
              disabled={authenticated ? !canCreate || (paymentMethod === "zoria" && !hasEnoughZoria) : false}
              className="mt-auto flex items-center justify-center gap-2 btn-gold rounded-xl px-6 py-3.5 text-sm cursor-pointer"
            >
              {txPending ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  CONFIRM IN WALLET...
                </>
              ) : isCreating && !activeMissionId ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  STARTING...
                </>
              ) : !authenticated ? (
                <>
                  CONNECT WALLET TO CREATE
                  <SparkleIcon className="w-4 h-4" />
                </>
              ) : paymentMethod === "zoria" ? (
                <>
                  PAY {zoriaPrice.toLocaleString()} $ZORIA
                  <SparkleIcon className="w-4 h-4" />
                </>
              ) : (
                <>
                  CREATE VIDEO
                  <SparkleIcon className="w-4 h-4" />
                  <span className="text-[#0B0E11]/60 ml-1 text-xs">10 credits</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
