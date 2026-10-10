import type { ReactNode } from "react";
import { BrandLoader } from "./BrandLoader";
import { useAuth } from "@/hooks/use-auth";
import { SignIn } from "./SignIn";
import { TvShell } from "./TvShell";

/** Renders sign-in until the viewer has an account session. */
export function StoreGate({ children, onBack }: { children: ReactNode; onBack?: (() => void) | undefined }) {
  const { ready, user } = useAuth();
  if (!ready) return <BrandLoader />;
  if (!user) return <TvShell key="signin" onBack={() => {}}><SignIn /></TvShell>;
  return <TvShell key="store" onBack={onBack}>{children}</TvShell>;
}
