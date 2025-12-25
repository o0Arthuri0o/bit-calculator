import BitCalculator from "@/components/ui/BitCalculator";
import "./index.css";
import { PWAInstallModal } from "./components/ui/PWAInstallModal";

export default function App() {
  return (
  <>
    <PWAInstallModal />
    <BitCalculator />
  </>
  )
}
