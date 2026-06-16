import { create } from 'zustand';
import {
  Vehicle, Part, Customer, PricingStrategy, Quote, Shipment, WarrantyClaim
} from '@/types';
import { mockVehicles, mockParts, mockCustomers, mockPricingStrategies, mockQuotes, mockShipments, mockWarrantyClaims } from '@/data/mockData';

const STORAGE_KEY = 'dismantle_workbench_data';

interface AppState {
  vehicles: Vehicle[];
  parts: Part[];
  customers: Customer[];
  pricingStrategies: PricingStrategy[];
  quotes: Quote[];
  shipments: Shipment[];
  warrantyClaims: WarrantyClaim[];
  currentUser: string;
  currentTime: string;
  dataLoaded: boolean;

  initMockData: () => void;
  loadFromStorage: () => Promise<boolean>;
  saveToStorage: () => Promise<void>;
  checkExpiredReservations: () => number;

  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  addPart: (part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addPartsBatch: (parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  updatePart: (id: string, part: Partial<Part>) => void;
  deletePart: (id: string) => void;
  reservePart: (partId: string, customerId: string, reservedUntilDate: string) => void;
  releasePart: (partId: string) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addPricingStrategy: (strategy: Omit<PricingStrategy, 'id' | 'createdAt'>) => void;
  updatePricingStrategy: (id: string, strategy: Partial<PricingStrategy>) => void;
  togglePricingStrategyStatus: (id: string) => void;
  deletePricingStrategy: (id: string) => void;
  calculatePrice: (basePrice: number, customerType: string, partCategory: string, condition: string) => number;

  addQuote: (quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateQuote: (id: string, quote: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  addNegotiation: (quoteId: string, offer: number, remark: string) => void;

  addShipment: (shipment: Omit<Shipment, 'id' | 'createdAt'>) => void;
  updateShipment: (id: string, shipment: Partial<Shipment>) => void;

  addWarrantyClaim: (claim: Omit<WarrantyClaim, 'id' | 'createdAt'>) => void;
  updateWarrantyClaim: (id: string, claim: Partial<WarrantyClaim>) => void;
}

const now = () => new Date().toISOString();

const saveToLocalStorage = (state: Partial<AppState>) => {
  try {
    const data = {
      vehicles: state.vehicles,
      parts: state.parts,
      customers: state.customers,
      pricingStrategies: state.pricingStrategies,
      quotes: state.quotes,
      shipments: state.shipments,
      warrantyClaims: state.warrantyClaims,
      savedAt: now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.saveData(STORAGE_KEY, data);
    }
  } catch (e) {
    console.error('保存数据失败:', e);
  }
};

const loadFromLocalStorage = async (): Promise<Partial<AppState> | null> => {
  try {
    let data = null;

    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      data = await (window as any).electronAPI.loadData(STORAGE_KEY);
    }

    if (!data) {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        data = JSON.parse(local);
      }
    }

    if (data && Array.isArray(data.vehicles)) {
      return {
        vehicles: data.vehicles,
        parts: data.parts,
        customers: data.customers,
        pricingStrategies: data.pricingStrategies,
        quotes: data.quotes,
        shipments: data.shipments,
        warrantyClaims: data.warrantyClaims,
        dataLoaded: true
      };
    }
    return null;
  } catch (e) {
    console.error('加载数据失败:', e);
    return null;
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  vehicles: [],
  parts: [],
  customers: [],
  pricingStrategies: [],
  quotes: [],
  shipments: [],
  warrantyClaims: [],
  currentUser: '管理员',
  currentTime: now(),
  dataLoaded: false,

  initMockData: () => {
    const mockData = {
      vehicles: mockVehicles,
      parts: mockParts,
      customers: mockCustomers,
      pricingStrategies: mockPricingStrategies,
      quotes: mockQuotes,
      shipments: mockShipments,
      warrantyClaims: mockWarrantyClaims
    };
    set(mockData);
    saveToLocalStorage(mockData);
  },

  loadFromStorage: async () => {
    const saved = await loadFromLocalStorage();
    if (saved) {
      set({ ...saved, dataLoaded: true });
      return true;
    }
    return false;
  },

  saveToStorage: async () => {
    saveToLocalStorage(get());
  },

  checkExpiredReservations: () => {
    const state = get();
    const nowTime = new Date();
    let releasedCount = 0;

    const updatedParts = state.parts.map(p => {
      if (p.status === 'reserved' && p.reservedUntil) {
        const expireTime = new Date(p.reservedUntil);
        if (expireTime < nowTime) {
          releasedCount++;
          return {
            ...p,
            status: 'in_stock' as const,
            reservedBy: undefined,
            reservedUntil: undefined,
            updatedAt: now()
          };
        }
      }
      return p;
    });

    if (releasedCount > 0) {
      set({ parts: updatedParts });
      saveToLocalStorage({ ...get(), parts: updatedParts });
    }
    return releasedCount;
  },

  addVehicle: (vehicle) => {
    const newVehicle = { ...vehicle, id: `V${Date.now()}`, createdAt: now(), updatedAt: now() };
    set((state) => ({ vehicles: [...state.vehicles, newVehicle] }));
    saveToLocalStorage(get());
  },
  updateVehicle: (id, vehicle) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...vehicle, updatedAt: now() } : v)
    }));
    saveToLocalStorage(get());
  },
  deleteVehicle: (id) => {
    set((state) => ({ vehicles: state.vehicles.filter(v => v.id !== id) }));
    saveToLocalStorage(get());
  },

  addPart: (part) => {
    const newPart = { ...part, id: `P${Date.now()}`, createdAt: now(), updatedAt: now() };
    set((state) => ({ parts: [...state.parts, newPart] }));
    saveToLocalStorage(get());
  },
  addPartsBatch: (parts) => {
    const newParts = parts.map(p => ({
      ...p,
      id: `P${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now(),
      updatedAt: now()
    }));
    set((state) => ({ parts: [...state.parts, ...newParts] }));
    saveToLocalStorage(get());
  },
  updatePart: (id, part) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === id ? { ...p, ...part, updatedAt: now() } : p)
    }));
    saveToLocalStorage(get());
  },
  deletePart: (id) => {
    set((state) => ({ parts: state.parts.filter(p => p.id !== id) }));
    saveToLocalStorage(get());
  },
  reservePart: (partId, customerId, reservedUntilDate) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === partId ? {
        ...p,
        status: 'reserved' as const,
        reservedBy: customerId,
        reservedUntil: reservedUntilDate,
        updatedAt: now()
      } : p)
    }));
    saveToLocalStorage(get());
  },
  releasePart: (partId) => {
    set((state) => ({
      parts: state.parts.map(p => p.id === partId ? {
        ...p,
        status: 'in_stock' as const,
        reservedBy: undefined,
        reservedUntil: undefined,
        updatedAt: now()
      } : p)
    }));
    saveToLocalStorage(get());
  },

  addCustomer: (customer) => {
    const newCustomer = { ...customer, id: `C${Date.now()}`, createdAt: now(), updatedAt: now() };
    set((state) => ({ customers: [...state.customers, newCustomer] }));
    saveToLocalStorage(get());
  },
  updateCustomer: (id, customer) => {
    set((state) => ({
      customers: state.customers.map(c => c.id === id ? { ...c, ...customer, updatedAt: now() } : c)
    }));
    saveToLocalStorage(get());
  },
  deleteCustomer: (id) => {
    set((state) => ({ customers: state.customers.filter(c => c.id !== id) }));
    saveToLocalStorage(get());
  },

  addPricingStrategy: (strategy) => {
    const newStrategy = { ...strategy, id: `PS${Date.now()}`, createdAt: now() };
    set((state) => ({ pricingStrategies: [...state.pricingStrategies, newStrategy] }));
    saveToLocalStorage(get());
  },
  updatePricingStrategy: (id, strategy) => {
    set((state) => ({
      pricingStrategies: state.pricingStrategies.map(s => s.id === id ? { ...s, ...strategy } : s)
    }));
    saveToLocalStorage(get());
  },
  togglePricingStrategyStatus: (id) => {
    set((state) => ({
      pricingStrategies: state.pricingStrategies.map(s =>
        s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s
      )
    }));
    saveToLocalStorage(get());
  },
  deletePricingStrategy: (id) => {
    set((state) => ({
      pricingStrategies: state.pricingStrategies.filter(s => s.id !== id)
    }));
    saveToLocalStorage(get());
  },
  calculatePrice: (basePrice, customerType, partCategory, condition) => {
    const state = get();
    const strategies = state.pricingStrategies.filter(s =>
      s.status === 'active' &&
      s.customerType === customerType &&
      (!s.partCategory || s.partCategory === partCategory) &&
      (!s.condition || s.condition === condition)
    );
    if (strategies.length === 0) return basePrice;
    const strategy = strategies.sort((a, b) => {
      const scoreA = (a.partCategory ? 2 : 0) + (a.condition ? 1 : 0);
      const scoreB = (b.partCategory ? 2 : 0) + (b.condition ? 1 : 0);
      return scoreB - scoreA;
    })[0];
    return Math.round(basePrice * (1 + strategy.markupRate / 100) * (1 - strategy.discountRate / 100));
  },

  addQuote: (quote) => {
    const newQuote = { ...quote, id: `Q${Date.now()}`, createdAt: now(), updatedAt: now() };
    set((state) => ({ quotes: [...state.quotes, newQuote] }));
    saveToLocalStorage(get());
  },
  updateQuote: (id, quote) => {
    set((state) => ({
      quotes: state.quotes.map(q => q.id === id ? { ...q, ...quote, updatedAt: now() } : q)
    }));
    saveToLocalStorage(get());
  },
  deleteQuote: (id) => {
    set((state) => ({ quotes: state.quotes.filter(q => q.id !== id) }));
    saveToLocalStorage(get());
  },
  addNegotiation: (quoteId, offer, remark) => {
    set((state) => ({
      quotes: state.quotes.map(q => q.id === quoteId ? {
        ...q,
        negotiationHistory: [...q.negotiationHistory, {
          time: now(),
          operator: get().currentUser,
          offer,
          remark
        }],
        updatedAt: now()
      } : q)
    }));
    saveToLocalStorage(get());
  },

  addShipment: (shipment) => {
    const newShipment = { ...shipment, id: `S${Date.now()}`, createdAt: now() };
    set((state) => ({ shipments: [...state.shipments, newShipment] }));
    saveToLocalStorage(get());
  },
  updateShipment: (id, shipment) => {
    set((state) => ({
      shipments: state.shipments.map(s => s.id === id ? { ...s, ...shipment } : s)
    }));
    saveToLocalStorage(get());
  },

  addWarrantyClaim: (claim) => {
    const newClaim = { ...claim, id: `W${Date.now()}`, createdAt: now() };
    set((state) => ({ warrantyClaims: [...state.warrantyClaims, newClaim] }));
    saveToLocalStorage(get());
  },
  updateWarrantyClaim: (id, claim) => {
    set((state) => ({
      warrantyClaims: state.warrantyClaims.map(w => w.id === id ? { ...w, ...claim } : w)
    }));
    saveToLocalStorage(get());
  }
}));
