import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EstimateData {
  models: any[];
  technology: string;
  material: string;
  infill: number;
  layerHeight: number;
  colorId: string;
  quantity: number;
  result: any;
}

interface OrderStore {
  estimateData: EstimateData | null;
  setEstimateData: (data: EstimateData) => void;
  clearEstimateData: () => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      estimateData: null,
      setEstimateData: (data) => set({ estimateData: data }),
      clearEstimateData: () => set({ estimateData: null }),
    }),
    {
      name: 'pb3d-order-storage', // unique name for localStorage key
    }
  )
)
