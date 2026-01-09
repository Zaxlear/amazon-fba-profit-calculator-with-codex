import { create } from "zustand";

import type {
  Currency,
  FBACalculationResult,
  FBACalculatorInput,
  MoneyInput,
  ProjectNode,
  SavedProject,
  Settings
} from "../types";
import {
  apiCalculate,
  apiCreateBranch,
  apiCreateProject,
  apiDeleteProject,
  apiGetProject,
  apiGetSettings,
  apiListProjects,
  apiUpdateProject,
  apiUpdateSettings
} from "../api/client";

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function clampExchangeRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 7.25;
  return rate;
}

function syncMoneyInput(value: MoneyInput, exchangeRate: number): MoneyInput {
  const rate = clampExchangeRate(exchangeRate);
  if (value.primaryCurrency === "USD") {
    const usd = round2(value.usd ?? 0);
    return { ...value, usd, cny: round2(usd * rate) };
  }
  const cny = round2(value.cny ?? 0);
  return { ...value, cny, usd: round2(cny / rate) };
}

function emptyMoney(primaryCurrency: Currency = "USD"): MoneyInput {
  return { usd: 0, cny: 0, primaryCurrency };
}

function defaultInput(): FBACalculatorInput {
  return {
    prePurchase: {
      unitCost: emptyMoney("USD"),
      quantity: 0,
      shippingPerUnit: emptyMoney("USD")
    },
    duringSale: {
      sellingPrice: emptyMoney("USD"),
      dailySales: 0,
      salesDays: 0,
      advertisingMode: "percentage",
      dailyAdBudget: emptyMoney("USD"),
      adPercentage: 10,
      referralFeeRate: 15,
      fbaFeePerUnit: emptyMoney("USD"),
      monthlyStorageFee: emptyMoney("USD")
    },
    afterSale: { returnRate: 5, resellableRate: 80 },
    settings: { exchangeRate: 7.25 }
  };
}

function syncAllMoneyInputs(input: FBACalculatorInput): FBACalculatorInput {
  const rate = clampExchangeRate(input.settings.exchangeRate);
  return {
    ...input,
    prePurchase: {
      ...input.prePurchase,
      unitCost: syncMoneyInput(input.prePurchase.unitCost, rate),
      shippingPerUnit: syncMoneyInput(input.prePurchase.shippingPerUnit, rate)
    },
    duringSale: {
      ...input.duringSale,
      sellingPrice: syncMoneyInput(input.duringSale.sellingPrice, rate),
      dailyAdBudget: input.duringSale.dailyAdBudget
        ? syncMoneyInput(input.duringSale.dailyAdBudget, rate)
        : undefined,
      fbaFeePerUnit: syncMoneyInput(input.duringSale.fbaFeePerUnit, rate),
      monthlyStorageFee: syncMoneyInput(input.duringSale.monthlyStorageFee, rate)
    }
  };
}

export interface ProjectMeta {
  name: string;
  description: string;
}

interface AppState {
  input: FBACalculatorInput;
  result: FBACalculationResult | null;
  isCalculating: boolean;
  error: string | null;

  projects: ProjectNode[];
  selectedProjectId: string | null;
  currentProjectId: string | null;
  currentProjectMeta: ProjectMeta | null;

  init: () => Promise<void>;
  setExchangeRate: (rate: number) => void;
  setMoney: (path: string, value: MoneyInput) => void;
  setNumber: (path: string, value: number) => void;
  setAdvertisingMode: (mode: "budget" | "percentage") => void;

  recalculate: () => Promise<void>;

  refreshProjects: () => Promise<void>;
  selectProject: (id: string | null) => void;
  loadProject: () => Promise<void>;
  saveProject: (meta: ProjectMeta, mode: "create" | "update") => Promise<void>;
  branchFromSelected: (meta: ProjectMeta) => Promise<void>;
  deleteSelected: () => Promise<void>;
}

function setDeep(
  input: FBACalculatorInput,
  path: string,
  value: unknown
): FBACalculatorInput {
  const parts = path.split(".");
  const cloned: any = structuredClone(input);
  let cursor: any = cloned;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
  return cloned as FBACalculatorInput;
}

export const useAppStore = create<AppState>((set, get) => ({
  input: defaultInput(),
  result: null,
  isCalculating: false,
  error: null,

  projects: [],
  selectedProjectId: null,
  currentProjectId: null,
  currentProjectMeta: null,

  init: async () => {
    try {
      const settings = await apiGetSettings();
      set((state) => ({
        input: syncAllMoneyInputs({
          ...state.input,
          settings: { exchangeRate: clampExchangeRate(settings.exchangeRate) }
        })
      }));
    } catch (e) {
      set({ error: (e as Error).message });
    }

    await get().refreshProjects();
    await get().recalculate();
  },

  setExchangeRate: (rate) => {
    set((state) => {
      const next = syncAllMoneyInputs({
        ...state.input,
        settings: { exchangeRate: clampExchangeRate(rate) }
      });
      return { input: next };
    });
    void apiUpdateSettings({ exchangeRate: clampExchangeRate(rate) }).catch(() => {});
  },

  setMoney: (path, value) => {
    set((state) => {
      const synced = syncMoneyInput(value, state.input.settings.exchangeRate);
      const next = setDeep(state.input, path, synced);
      return { input: next };
    });
  },

  setNumber: (path, value) => {
    set((state) => ({ input: setDeep(state.input, path, value) }));
  },

  setAdvertisingMode: (mode) => {
    set((state) => ({
      input: (() => {
        const exchangeRate = state.input.settings.exchangeRate;
        const duringSale = { ...state.input.duringSale, advertisingMode: mode };

        if (mode === "budget" && !duringSale.dailyAdBudget) {
          duringSale.dailyAdBudget = syncMoneyInput(emptyMoney("USD"), exchangeRate);
        }
        if (
          mode === "percentage" &&
          (duringSale.adPercentage === undefined || duringSale.adPercentage === null)
        ) {
          duringSale.adPercentage = 10;
        }

        return { ...state.input, duringSale };
      })()
    }));
  },

  recalculate: async () => {
    const input = get().input;
    set({ isCalculating: true, error: null });
    try {
      const result = await apiCalculate(input);
      set({ result });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ isCalculating: false });
    }
  },

  refreshProjects: async () => {
    try {
      const projects = await apiListProjects();
      set({ projects });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  loadProject: async () => {
    const selectedId = get().selectedProjectId;
    if (!selectedId) return;
    try {
      const project = await apiGetProject(selectedId);
      set({
        input: syncAllMoneyInputs(project.input),
        result: project.result,
        currentProjectId: project.id,
        currentProjectMeta: { name: project.name, description: project.description }
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  saveProject: async (meta, mode) => {
    const input = get().input;
    try {
      let saved: SavedProject;
      if (mode === "update") {
        const id = get().currentProjectId;
        if (!id) return;
        saved = await apiUpdateProject(id, { ...meta, input });
      } else {
        saved = await apiCreateProject({ ...meta, input });
      }

      set({
        currentProjectId: saved.id,
        currentProjectMeta: { name: saved.name, description: saved.description }
      });
      await get().refreshProjects();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  branchFromSelected: async (meta) => {
    const selectedId = get().selectedProjectId;
    if (!selectedId) return;
    try {
      await apiCreateBranch(selectedId, meta);
      await get().refreshProjects();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  deleteSelected: async () => {
    const selectedId = get().selectedProjectId;
    if (!selectedId) return;
    try {
      const res = await apiDeleteProject(selectedId);
      const currentId = get().currentProjectId;
      if (currentId && res.deletedIds.includes(currentId)) {
        set({ currentProjectId: null, currentProjectMeta: null });
      }
      set({ selectedProjectId: null });
      await get().refreshProjects();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  }
}));
