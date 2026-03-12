"use client";

import { useRef, useState, useEffect } from "react";

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  hideWatermark?: boolean;
}

export function VideoPlayer({ src, autoPlay, muted, controls = true, className, hideWatermark }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) { setShowControls(true); return; }
    let timer: ReturnType<typeof setTimeout>;
    const hide = () => { timer = setTimeout(() => setShowControls(false), 2500); };
    hide();
    return () => clearTimeout(timer);
  }, [isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  return (
    <div
      className={`relative ${className ?? ""}`}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        className="w-full h-full object-cover"
      />
      {!hideWatermark && (
        <div
          className="absolute bottom-8 right-2 pointer-events-none select-none transition-opacity duration-500"
          style={{ opacity: showControls ? 0.7 : 0.35 }}
        >
          <div
            className="px-2.5 py-1.5 rounded-lg"
            style={{
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <p className="text-[10px] font-semibold tracking-[0.5px] text-white/90 leading-tight">
              Created by <span className="text-accent">$ZORIA</span>
            </p>
            <p className="text-[9px] tracking-[0.3px] text-white/60 leading-tight">
              ai16zoria.xyz
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
