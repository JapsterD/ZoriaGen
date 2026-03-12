"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Header } from "@/components/header";
import { SpinnerIcon } from "@/components/icons";
import { VideoPlayer } from "@/components/video-player";

interface PublicMission {
  id: string;
  imageUrl: string;
  prompt: string;
  videoUrl: string;
  createdAt: string;
  wallet: string;
  paidWithZoria?: boolean;
  quality?: string;
  duration?: number;
}

function ExploreCard({ mission }: { mission: PublicMission }) {
  const [showVideo, setShowVideo] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const fetchUrl = mission.videoUrl.startsWith("/")
        ? mission.videoUrl
        : `/api/download?url=${encodeURIComponent(mission.videoUrl)}`;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        window.open(mission.videoUrl, "_blank");
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
      window.open(mission.videoUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="glass-panel card-glow rounded-2xl overflow-hidden"
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
        {showVideo ? (
          <VideoPlayer
            src={mission.videoUrl}
            className="w-full h-full"
            autoPlay
            muted
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
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{
                  background: "rgba(240, 185, 11, 0.2)",
                  border: "2px solid rgba(240, 185, 11, 0.5)",
                  boxShadow: "0 0 20px rgba(240, 185, 11, 0.3)",
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
        <p className="text-sm text-foreground line-clamp-2 mb-3">{mission.prompt}</p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/60 tracking-wide mb-3">
          <span className="font-mono">{mission.wallet}</span>
          <span>{new Date(mission.createdAt).toLocaleDateString()}</span>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full text-center text-xs btn-gold-outline rounded-lg px-3 py-2.5 tracking-[1px] uppercase font-semibold cursor-pointer disabled:opacity-50"
        >
          {downloading ? "Downloading..." : "Download Video"}
        </button>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [missions, setMissions] = useState<PublicMission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public-gallery")
      .then((r) => r.json())
      .then((d) => setMissions(d.missions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div suppressHydrationWarning>
      <Header />

      <div className="max-w-6xl mx-auto">
        <h1 className="font-heading text-2xl tracking-[2px] mb-2 text-shimmer inline-block">
          EXPLORE
        </h1>
        <p className="text-muted-foreground text-sm mb-8 tracking-wide">
          Videos created by the community
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <SpinnerIcon className="w-8 h-8 text-accent" />
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(240, 185, 11, 0.08)",
                border: "1px solid rgba(240, 185, 11, 0.15)",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F0B90B"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <p className="text-muted-foreground text-lg mb-2">
              No videos yet
            </p>
            <p className="text-muted-foreground/40 text-sm">
              Be the first to generate an AI video!
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {missions.map((mission) => (
              <ExploreCard key={mission.id} mission={mission} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
