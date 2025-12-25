import { usePWAInstall } from "@/hooks/usePWAInstall";
import "../../BitCalculator.css";

export function PWAInstallModal() {
  const { canInstall, install, dismiss } = usePWAInstall();

  if (!canInstall) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Закрываем только при клике на оверлей, не на модальное окно
    if (e.target === e.currentTarget) {
      dismiss();
    }
  };

  return (
    <div className="bit-calculator-modal-overlay" onClick={handleOverlayClick}>
      <div className="bit-calculator-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="bit-calculator-modal-title">Установить приложение?</h2>
        <p className="bit-calculator-modal-description">
          Битовый калькулятор можно установить как PWA и работать оффлайн.
        </p>

        <div className="bit-calculator-modal-buttons">
          <button 
            className="bit-calculator-modal-button bit-calculator-modal-button-primary" 
            onClick={install}
          >
            Установить
          </button>
          <button 
            className="bit-calculator-modal-button" 
            onClick={dismiss}
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
