import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EstimateData {
  models: any[];
  technology: string;
  infill: number;
  layerHeight: number;
  result: any;
}

interface OrderStore {
  estimateData: EstimateData | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setEstimateData: (data: EstimateData) => void;
  clearEstimateData: () => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      estimateData: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setEstimateData: (data) => set({ estimateData: data }),
      clearEstimateData: () => set({ estimateData: null }),
    }),
    {
      name: 'pb3d-order-storage', // unique name for localStorage key
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
