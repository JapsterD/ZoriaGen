"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { MockAuthProvider, PrivyAuthBridge } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#8b5cf6",
          logo: undefined,
          walletList: [
            "metamask",
            "phantom",
            "coinbase_wallet",
            "rainbow",
            "wallet_connect",
          ],
        },
        loginMethods: ["wallet"],
      }}
    >
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  );
}
