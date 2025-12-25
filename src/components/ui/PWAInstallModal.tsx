import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "./button";

export function PWAInstallModal() {
  const { canInstall, install } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[320px] rounded-lg border border-border bg-card p-5 shadow-2xl">
        <div className="space-y-1 pb-4">
          <h2 className="text-lg font-mono font-semibold text-foreground">Установить приложение?</h2>
          <p className="text-sm font-mono text-muted-foreground">
            Битовый калькулятор можно установить как PWA и работать оффлайн.
          </p>
        </div>

        <div className="flex gap-2">
          <Button className="w-full font-mono" onClick={install}>
            Установить
          </Button>
          <Button className="w-full font-mono" variant="outline" onClick={() => location.reload()}>
            Позже
          </Button>
        </div>
      </div>
    </div>
  );
}
