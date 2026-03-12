"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { SparkleIcon } from "./icons";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Header() {
  const [credits, setCredits] = useState<number | null>(null);
  const [zoriaBalance, setZoriaBalance] = useState<string | null>(null);
  const { ready, authenticated, walletAddress, login, logout } = useAuth();

  useEffect(() => {
    if (!walletAddress) return;
    fetch("/api/credits", {
      headers: { "x-wallet-address": walletAddress },
    })
      .then((r) => r.json())
      .then((d) => setCredits(d.credits))
      .catch(() => {});

    fetch(`/api/balance?wallet=${walletAddress}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.balance) setZoriaBalance(d.balance);
      })
      .catch(() => {});
  }, [walletAddress]);

  return (
    <div className="hidden lg:flex items-center justify-end py-4 mb-4 gap-3" suppressHydrationWarning>
      {authenticated && (
        <>
          <div className="flex gap-3 glass-panel px-4 py-2.5 rounded-xl items-center">
            <div className="flex items-center font-semibold gap-1.5 text-accent">
              <SparkleIcon className="text-accent" />
              <span className="text-shimmer font-heading text-sm">{credits ?? "..."}</span>
            </div>
            <div className="h-5 w-px bg-accent/20" />
            <span className="text-xs text-muted-foreground tracking-[1px] uppercase">Credits</span>
          </div>

          {zoriaBalance !== null && (
            <div className="flex gap-2.5 glass-panel px-4 py-2.5 rounded-xl items-center">
              <span className="text-sm font-heading text-accent tracking-wide">{zoriaBalance}</span>
              <div className="h-5 w-px bg-accent/20" />
              <span className="text-xs text-muted-foreground tracking-[1px] uppercase">$ZORIA</span>
            </div>
          )}
        </>
      )}

      {ready && (
        <>
          {authenticated ? (
            <div className="flex items-center gap-3">
              {walletAddress && (
                <span className="text-sm text-muted-foreground hidden sm:inline font-mono tracking-wide">
                  {truncateAddress(walletAddress)}
                </span>
              )}
              <button
                onClick={logout}
                className="text-sm btn-gold-outline rounded-xl px-4 py-2.5 cursor-pointer tracking-wide"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="text-sm btn-gold rounded-xl px-5 py-2.5 cursor-pointer font-semibold tracking-[1px]"
            >
              Connect Wallet
            </button>
          )}
        </>
      )}
    </div>
  );
}
