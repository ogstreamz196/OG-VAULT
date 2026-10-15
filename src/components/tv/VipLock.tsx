import { Lock } from "lucide-react";

export const VIP_STORE_URL = "https://ogbot.co.uk";

export function VipLock({ title = "OG VIP ACCESS" }: { title?: string }) {
  return (
    <div className="glass mx-auto max-w-2xl space-y-6 rounded-3xl border-vip/50 p-10 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-vip/20 text-4xl"><Lock className="h-9 w-9 text-vip" /></div>
      <h2 className="text-4xl font-extrabold">{title}</h2>
      <p className="text-xl text-muted-foreground">
        Visit <span className="font-bold text-foreground">ogbot.co.uk</span>, sign up using your <span className="font-bold text-foreground">Stream profile username</span>, and purchase the <span className="font-bold text-foreground">Vault Pass</span> in the store. Then sign in here to unlock every VIP app.
      </p>
      <a data-nav data-nav-autofocus href={VIP_STORE_URL} target="_blank" rel="noopener noreferrer"
        className="tv-focus inline-block w-full rounded-xl bg-vip px-6 py-4 text-lg font-bold text-primary-foreground">
        Visit ogbot.co.uk
      </a>
    </div>
  );
}
