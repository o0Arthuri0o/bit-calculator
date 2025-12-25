import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Проверяем, было ли модальное окно отклонено в этой сессии
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const dayInMs = 24 * 60 * 60 * 1000;
      // Показываем снова только если прошло больше суток
      if (Date.now() - dismissedTime < dayInMs) {
        setIsDismissed(true);
        return;
      } else {
        // Удаляем старую запись
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!event) return;

    await event.prompt();
    const res = await event.userChoice;

    if (res.outcome === "accepted") {
      console.log("PWA установлено");
    }

    setEvent(null);
    setCanInstall(false);
  };

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setIsDismissed(true);
    setCanInstall(false);
  };

  return { canInstall: canInstall && !isDismissed, install, dismiss };
}
