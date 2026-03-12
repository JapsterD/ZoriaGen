"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { CreateIcon, GalleryIcon, ExploreIcon, SparkleIcon } from "./icons";

const CA = "0x0B71296D09B5aa459c6c79A425e41Aa9179D7777";
const CA_SHORT = "0x0B71...D7777";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CopyCA({ compact }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-2 w-full rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-300"
      style={{
        background: copied ? 'rgba(34, 197, 94, 0.08)' : 'rgba(240, 185, 11, 0.04)',
        border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.25)' : 'rgba(240, 185, 11, 0.1)'}`,
      }}
    >
      <span className={`font-mono truncate transition-colors duration-300 ${
        compact ? 'text-[10px]' : 'text-[11px]'
      } ${copied ? 'text-success' : 'text-muted-foreground/70 group-hover:text-muted-foreground'}`}>
        {compact ? CA_SHORT : CA}
      </span>
      <span className="ml-auto flex-shrink-0">
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40 group-hover:text-accent transition-colors duration-300">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </span>
    </button>
  );
}

function XLink() {
  return (
    <a
      href="https://x.com/ai16zoria"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-accent hover:bg-accent-dim transition-all duration-300"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { ready, authenticated, walletAddress, login, logout } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [zoriaBalance, setZoriaBalance] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

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

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  const links = [
    { href: "/", label: "Create", icon: CreateIcon },
    { href: "/gallery", label: "Gallery", icon: GalleryIcon },
    { href: "/explore", label: "Explore", icon: ExploreIcon },
  ];

  return (
    <div suppressHydrationWarning>
      {/* Desktop sidebar */}
      <div
        className="w-[280px] h-screen pt-8 fixed left-0 top-0 z-30 hidden lg:flex flex-col justify-between px-6 glass-panel"
        style={{ borderRight: '1px solid rgba(240, 185, 11, 0.08)', borderRadius: 0 }}
        suppressHydrationWarning
      >
        <div>
          <a href="https://ai16zoria.xyz/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 mb-10 group">
            <span className="font-heading text-2xl tracking-[3px] text-gold-glow group-hover:brightness-125 transition-all duration-300">
              ZORIA GEN
            </span>
            <span className="badge-gold text-[10px] px-2.5 py-1 rounded font-semibold tracking-[1.5px] uppercase">
              beta
            </span>
          </a>
          <nav className="flex flex-col gap-1.5">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex gap-3 px-4 py-3 rounded-xl items-center text-sm font-medium tracking-wide transition-all duration-300 ${
                    isActive
                      ? "nav-active"
                      : "text-muted-foreground hover:text-accent hover:bg-accent-dim"
                  }`}
                >
                  <link.icon />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="pb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground/50 tracking-[1px] uppercase">
              Powered by $ZORIA
            </p>
            <XLink />
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.5px] mb-1.5 px-1">Contract (BSC)</p>
            <CopyCA compact />
          </div>
        </div>
      </div>

      {/* Mobile header bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-panel"
        style={{ borderBottom: '1px solid rgba(240, 185, 11, 0.08)', borderRadius: 0 }}
        suppressHydrationWarning
      >
        <div className="flex items-center justify-between px-4 h-14">
          <a href="https://ai16zoria.xyz/" target="_blank" rel="noopener noreferrer" className="flex flex-col flex-shrink-0 leading-none">
            <span className="font-heading text-sm tracking-[2px] text-gold-glow">
              ZORIA GEN
            </span>
            <span className="text-[7px] font-semibold tracking-[1.5px] uppercase text-accent/60 mt-0.5">
              beta
            </span>
          </a>

          <div className="flex items-center gap-2">
            {authenticated && credits !== null && (
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                style={{ background: 'rgba(240, 185, 11, 0.08)' }}
              >
                <SparkleIcon className="text-accent" />
                <span className="text-xs font-heading text-accent">{credits}</span>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-colors"
              style={{ background: mobileMenuOpen ? 'rgba(240, 185, 11, 0.12)' : 'transparent' }}
              aria-label="Toggle menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span
                  className="block h-[2px] rounded-full bg-accent transition-all duration-300 origin-center"
                  style={mobileMenuOpen
                    ? { transform: 'translateY(7px) rotate(45deg)' }
                    : { transform: 'none' }
                  }
                />
                <span
                  className="block h-[2px] rounded-full bg-accent transition-all duration-300"
                  style={mobileMenuOpen
                    ? { opacity: 0, transform: 'scaleX(0)' }
                    : { opacity: 1, transform: 'scaleX(1)' }
                  }
                />
                <span
                  className="block h-[2px] rounded-full bg-accent transition-all duration-300 origin-center"
                  style={mobileMenuOpen
                    ? { transform: 'translateY(-7px) rotate(-45deg)' }
                    : { transform: 'none' }
                  }
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-35 transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={closeMobileMenu}
      />

      {/* Mobile menu panel */}
      <div
        className={`lg:hidden fixed top-14 left-0 right-0 bottom-0 z-35 overflow-y-auto transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(11, 14, 17, 0.98) 0%, rgba(20, 24, 32, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex flex-col min-h-full px-6 pt-6 pb-8">
          {/* Navigation */}
          <nav className="flex flex-col gap-2 mb-8">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex gap-4 px-5 py-4 rounded-xl items-center text-base font-medium tracking-wide transition-all duration-300 ${
                    isActive
                      ? "nav-active"
                      : "text-muted-foreground hover:text-accent hover:bg-accent-dim"
                  }`}
                >
                  <link.icon />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Wallet & Balance section */}
          {authenticated && (
            <div className="mb-6">
              <div
                className="rounded-xl p-4 mb-3"
                style={{ background: 'rgba(240, 185, 11, 0.04)', border: '1px solid rgba(240, 185, 11, 0.1)' }}
              >
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[1px] mb-2">
                  Wallet
                </p>
                <p className="text-xs font-mono text-foreground break-all leading-relaxed">
                  {walletAddress}
                </p>
              </div>

              {zoriaBalance !== null && (
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3 mb-3"
                  style={{ background: 'rgba(240, 185, 11, 0.06)', border: '1px solid rgba(240, 185, 11, 0.1)' }}
                >
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[1px]">$ZORIA (BSC)</span>
                  <span className="text-base font-heading text-accent">{zoriaBalance}</span>
                </div>
              )}
            </div>
          )}

          {/* Connect / Disconnect */}
          {ready && (
            <div className="mb-8">
              {authenticated ? (
                <button
                  onClick={() => { logout(); closeMobileMenu(); }}
                  className="w-full text-sm rounded-xl px-4 py-3.5 cursor-pointer tracking-[1px] uppercase font-semibold text-center"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                  }}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => { login(); closeMobileMenu(); }}
                  className="w-full text-sm btn-gold rounded-xl px-4 py-3.5 cursor-pointer font-semibold tracking-[1px]"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-6" style={{ borderTop: '1px solid rgba(240, 185, 11, 0.08)' }}>
            <div className="mb-4">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.5px] mb-1.5 px-1">Contract (BSC)</p>
              <CopyCA />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground/50 tracking-[1px] uppercase">
                Powered by $ZORIA
              </p>
              <XLink />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
