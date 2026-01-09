import { useAppStore } from "../store";

export function useCurrency() {
  const exchangeRate = useAppStore((s) => s.input.settings.exchangeRate);
  const setExchangeRate = useAppStore((s) => s.setExchangeRate);
  return { exchangeRate, setExchangeRate };
}

