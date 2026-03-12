"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { SpinnerIcon } from "@/components/icons";
import { VideoPlayer } from "@/components/video-player";

const ESTIMATED_TIME_SEC = 45;

interface Mission {
  id: string;
  imageUrl: string;
  prompt: string;
  status: "pending" | "generating" | "completed" | "failed";
  videoUrl: string | null;
  error: string | null;
  creditsCost: number;
  createdAt: string;
  paidWithZoria?: boolean;
  quality?: string;
  duration?: number;
}

function StatusBadge({ status }: { status: Mission["status"] }) {
  const styles: Record<string, string> = {
    pending: "bg-warning/15 text-warning border border-warning/20",
    generating: "badge-gold",
    completed: "bg-success/15 text-success border border-success/20",
    failed: "bg-destructive/15 text-destructive border border-destructive/20",
  };
  const labels: Record<string, string> = {
    pending: "Queued",
    generating: "Generating...",
    completed: "Ready",
    failed: "Failed",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-[0.5px] uppercase ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function GeneratingCard({ mission }: { mission: Mission }) {
  const [elapsed, setElapsed] = useState(() => {
    const created = new Date(mission.createdAt).getTime();
    return Math.floor((Date.now() - created) / 1000);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const created = new Date(mission.createdAt).getTime();
      setElapsed(Math.floor((Date.now() - created) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [mission.createdAt]);

  const progress = Math.min((elapsed / ESTIMATED_TIME_SEC) * 100, 95);
  const remaining = Math.max(ESTIMATED_TIME_SEC - elapsed, 0);

  return (
    <div className="glass-panel card-glow rounded-2xl overflow-hidden border-accent/20 generating-card">
      <div className="aspect-video relative bg-muted">
        <Image
          src={mission.imageUrl}
          alt={mission.prompt}
          fill
          unoptimized
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 generating"
            style={{
              background: 'rgba(240, 185, 11, 0.1)',
              border: '2px solid rgba(240, 185, 11, 0.3)',
            }}>
            <SpinnerIcon className="w-6 h-6 text-accent" />
          </div>
          <span className="font-heading text-sm tracking-[1.5px] text-accent mb-1">GENERATING</span>
          <span className="text-xs text-muted-foreground">
            {remaining > 0 ? `~${remaining}s remaining` : "Almost done..."}
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(240, 185, 11, 0.1)' }}>
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm text-foreground line-clamp-2 flex-1">{mission.prompt}</p>
          <StatusBadge status={mission.status} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 tracking-wide">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Processing
          </span>
          <span className="font-mono text-accent">{elapsed}s</span>
        </div>
      </div>
    </div>
  );
}

function CompletedCard({ mission, isNew }: { mission: Mission; isNew: boolean }) {
  const [showVideo, setShowVideo] = useState(isNew);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isNew]);

  const handleDownload = async (url: string) => {
    setDownloading(true);
    try {
      const fetchUrl = url.startsWith("/")
        ? url
        : `/api/download?url=${encodeURIComponent(url)}`;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        window.open(url, "_blank");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `zoria-${mission.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`glass-panel card-glow rounded-2xl overflow-hidden ${isNew ? "generation-complete" : ""}`}
      style={mission.paidWithZoria ? {
        border: '1px solid rgba(240, 185, 11, 0.25)',
        boxShadow: '0 0 20px rgba(240, 185, 11, 0.08), inset 0 1px 0 rgba(240, 185, 11, 0.1)',
      } : undefined}
    >
      <div className="aspect-video relative bg-muted">
        {mission.paidWithZoria && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
            <span className="text-[9px] font-bold tracking-[1px] uppercase px-2 py-0.5 rounded"
              style={{ background: 'rgba(240, 185, 11, 0.25)', color: '#F0B90B', border: '1px solid rgba(240, 185, 11, 0.4)', backdropFilter: 'blur(8px)' }}>
              PREMIUM
            </span>
            <span className="text-[9px] font-semibold tracking-[0.5px] uppercase px-2 py-0.5 rounded"
              style={{ background: 'rgba(0, 0, 0, 0.5)', color: '#F0B90B', backdropFilter: 'blur(8px)' }}>
              {mission.quality || "480p"} / {mission.duration || 5}s
            </span>
          </div>
        )}
        {showVideo && mission.videoUrl ? (
          <VideoPlayer
            src={mission.videoUrl}
            className="w-full h-full"
            autoPlay={isNew}
            muted={isNew}
            hideWatermark={mission.paidWithZoria}
          />
        ) : (
          <button
            onClick={() => setShowVideo(true)}
            className="w-full h-full flex items-center justify-center group cursor-pointer"
          >
            <Image
              src={mission.imageUrl}
              alt={mission.prompt}
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{
                  background: 'rgba(240, 185, 11, 0.2)',
                  border: '2px solid rgba(240, 185, 11, 0.5)',
                  boxShadow: '0 0 20px rgba(240, 185, 11, 0.3)',
                }}
              >
                <svg width="20" height="24" viewBox="0 0 20 24" fill="#F0B90B">
                  <path d="M0 0L20 12L0 24V0Z" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm text-foreground line-clamp-2 flex-1">{mission.prompt}</p>
          <StatusBadge status={mission.status} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 tracking-wide">
          <span>{new Date(mission.createdAt).toLocaleDateString()}</span>
          <span>{mission.paidWithZoria ? "$ZORIA" : `${mission.creditsCost} credits`}</span>
        </div>
        {mission.videoUrl && (
          <button
            onClick={() => handleDownload(mission.videoUrl!)}
            disabled={downloading}
            className="mt-3 w-full text-center text-xs btn-gold-outline rounded-lg px-3 py-2.5 tracking-[1px] uppercase font-semibold cursor-pointer disabled:opacity-50"
          >
            {downloading ? "Downloading..." : "Download Video"}
          </button>
        )}
      </div>
    </div>
  );
}

function FailedCard({ mission }: { mission: Mission }) {
  return (
    <div className="glass-panel card-glow rounded-2xl overflow-hidden">
      <div className="aspect-video relative bg-muted">
        <Image
          src={mission.imageUrl}
          alt={mission.prompt}
          fill
          unoptimized
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <span className="text-destructive text-lg">&#x2717;</span>
          <span className="text-xs text-destructive/80 text-center mt-1">
            {mission.error || "Generation failed"}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm text-foreground line-clamp-2 flex-1">{mission.prompt}</p>
          <StatusBadge status={mission.status} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 tracking-wide">
          <span>{new Date(mission.createdAt).toLocaleDateString()}</span>
          <span>{mission.creditsCost} credits</span>
        </div>
      </div>
    </div>
  );
}

function PendingCard({ mission }: { mission: Mission }) {
  return (
    <div className="glass-panel card-glow rounded-2xl overflow-hidden">
      <div className="aspect-video relative bg-muted">
        <Image
          src={mission.imageUrl}
          alt={mission.prompt}
          fill
          unoptimized
          className="object-cover opacity-60"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm text-foreground line-clamp-2 flex-1">{mission.prompt}</p>
          <StatusBadge status={mission.status} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 tracking-wide">
          <span>{new Date(mission.createdAt).toLocaleDateString()}</span>
          <span>{mission.creditsCost} credits</span>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ mission, isNew }: { mission: Mission; isNew: boolean }) {
  switch (mission.status) {
    case "generating":
    case "pending":
      return mission.status === "generating" ? (
        <GeneratingCard mission={mission} />
      ) : (
        <PendingCard mission={mission} />
      );
    case "completed":
      return <CompletedCard mission={mission} isNew={isNew} />;
    case "failed":
      return <FailedCard mission={mission} />;
    default:
      return null;
  }
}

export default function GalleryPage() {
  const { authenticated, walletAddress, login } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  const fetchMissions = useCallback(async () => {
    if (!authenticated || !walletAddress) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/missions", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      const newMissions: Mission[] = data.missions || [];

      for (const m of newMissions) {
        const prev = prevStatusRef.current.get(m.id);
        if (prev && prev !== "completed" && m.status === "completed") {
          setRecentlyCompleted((s) => new Set(s).add(m.id));
        }
        prevStatusRef.current.set(m.id, m.status);
      }

      setMissions(newMissions);
    } catch {
      console.error("Failed to fetch missions");
    }
    setLoading(false);
  }, [authenticated, walletAddress]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  useEffect(() => {
    const hasPending = missions.some(
      (m) => m.status === "pending" || m.status === "generating"
    );
    if (!hasPending) return;

    const interval = setInterval(fetchMissions, 3000);
    return () => clearInterval(interval);
  }, [fetchMissions, missions]);

  const activeCount = missions.filter(
    (m) => m.status === "generating" || m.status === "pending"
  ).length;

  return (
    <div suppressHydrationWarning>
      <Header />

      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading text-2xl tracking-[2px] mb-2 text-shimmer inline-block">
          GALLERY
        </h1>
        <p className="text-muted-foreground text-sm mb-8 tracking-wide">
          Your generated AI videos
        </p>

        {activeCount > 0 && (
          <div className="glass-panel rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <SpinnerIcon className="w-4 h-4 text-accent" />
            <span className="text-sm text-accent font-medium tracking-wide">
              {activeCount} video{activeCount > 1 ? "s" : ""} generating
            </span>
            <span className="text-xs text-muted-foreground">
              — auto-updates every 3 seconds
            </span>
          </div>
        )}

        {!authenticated ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(240, 185, 11, 0.08)',
                border: '1px solid rgba(240, 185, 11, 0.15)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F0B90B" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="text-muted-foreground text-lg mb-2">
              Connect your wallet to see your generated videos
            </p>
            <button
              onClick={login}
              className="mt-4 btn-gold rounded-xl px-6 py-3 text-sm cursor-pointer font-semibold tracking-[1px]"
            >
              CONNECT WALLET
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <SpinnerIcon className="w-8 h-8 text-accent" />
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-2">
              No videos yet
            </p>
            <p className="text-muted-foreground/40 text-sm">
              Go to Create to generate your first AI video
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {missions.map((mission) => (
              <VideoCard
                key={mission.id}
                mission={mission}
                isNew={recentlyCompleted.has(mission.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
