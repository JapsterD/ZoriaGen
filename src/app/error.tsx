"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ZoriaGen error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "2px solid rgba(239, 68, 68, 0.4)",
        }}
      >
        <span className="text-destructive text-2xl">&#x2717;</span>
      </div>
      <h2 className="font-heading text-xl tracking-[2px] text-accent mb-3">
        SOMETHING WENT WRONG
      </h2>
      <p className="text-muted-foreground text-sm mb-2 max-w-md">
        {error.message || "An unexpected error occurred"}
      </p>
      {error.digest && (
        <p className="text-muted-foreground/40 text-xs font-mono mb-6">
          {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="btn-gold rounded-xl px-6 py-3 text-sm cursor-pointer"
      >
        TRY AGAIN
      </button>
    </div>
  );
}
