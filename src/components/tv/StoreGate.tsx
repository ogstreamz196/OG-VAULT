import type { ReactNode } from "react";
import { BrandLoader } from "./BrandLoader";
import { useAuth } from "@/hooks/use-auth";
import { SignIn } from "./SignIn";
import { TvShell } from "./TvShell";
import type { BackHandler } from "@/lib/spatial-nav";

const exitApp = () => false;

/** Renders sign-in until the viewer has an account session. */
export function StoreGate({ children, onBack }: { children: ReactNode; onBack?: BackHandler | undefined }) {
  const { ready, user } = useAuth();
  if (!ready) return <BrandLoader />;
  if (!user) return <TvShell dock={false} key="signin" onBack={exitApp}><SignIn /></TvShell>;
  return <TvShell key="store" onBack={onBack}>{children}</TvShell>;
}
