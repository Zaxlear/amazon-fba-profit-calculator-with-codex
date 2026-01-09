import { useAppStore } from "../store";

export function useCalculator() {
  const input = useAppStore((s) => s.input);
  const result = useAppStore((s) => s.result);
  const isCalculating = useAppStore((s) => s.isCalculating);
  const error = useAppStore((s) => s.error);
  const recalculate = useAppStore((s) => s.recalculate);

  return { input, result, isCalculating, error, recalculate };
}

