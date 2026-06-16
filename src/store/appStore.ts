import { create } from 'zustand';
import {
  Vehicle, Part, Customer, PricingStrategy, Quote, Shipment, WarrantyClaim
} from '@/types';
import { mockVehicles, mockParts, mockCustomers, mockPricingStrategies, mockQuotes, mockShipments, mockWarrantyClaims } from '@/data/mockData';

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

  initMockData: () => void;

  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  addPart: (part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addPartsBatch: (parts: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  updatePart: (id: string, part: Partial<Part>) => void;
  deletePart: (id: string) => void;
  reservePart: (partId: string, customerId: string, days: number) => void;
  releasePart: (partId: string) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addPricingStrategy: (strategy: Omit<PricingStrategy, 'id' | 'createdAt'>) => void;
  updatePricingStrategy: (id: string, strategy: Partial<PricingStrategy>) => void;
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

  initMockData: () => set({
    vehicles: mockVehicles,
    parts: mockParts,
    customers: mockCustomers,
    pricingStrategies: mockPricingStrategies,
    quotes: mockQuotes,
    shipments: mockShipments,
    warrantyClaims: mockWarrantyClaims
  }),

  addVehicle: (vehicle) => set((state) => ({
    vehicles: [...state.vehicles, { ...vehicle, id: `V${Date.now()}`, createdAt: now(), updatedAt: now() }]
  })),
  updateVehicle: (id, vehicle) => set((state) => ({
    vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...vehicle, updatedAt: now() } : v)
  })),
  deleteVehicle: (id) => set((state) => ({
    vehicles: state.vehicles.filter(v => v.id !== id)
  })),

  addPart: (part) => set((state) => ({
    parts: [...state.parts, { ...part, id: `P${Date.now()}`, createdAt: now(), updatedAt: now() }]
  })),
  addPartsBatch: (parts) => set((state) => ({
    parts: [...state.parts, ...parts.map(p => ({ ...p, id: `P${Date.now()}${Math.random().toString(36).slice(2, 7)}`, createdAt: now(), updatedAt: now() }))]
  })),
  updatePart: (id, part) => set((state) => ({
    parts: state.parts.map(p => p.id === id ? { ...p, ...part, updatedAt: now() } : p)
  })),
  deletePart: (id) => set((state) => ({
    parts: state.parts.filter(p => p.id !== id)
  })),
  reservePart: (partId, customerId, days) => set((state) => ({
    parts: state.parts.map(p => p.id === partId ? {
      ...p,
      status: 'reserved',
      reservedBy: customerId,
      reservedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    } : p)
  })),
  releasePart: (partId) => set((state) => ({
    parts: state.parts.map(p => p.id === partId ? {
      ...p,
      status: 'in_stock',
      reservedBy: undefined,
      reservedUntil: undefined
    } : p)
  })),

  addCustomer: (customer) => set((state) => ({
    customers: [...state.customers, { ...customer, id: `C${Date.now()}`, createdAt: now(), updatedAt: now() }]
  })),
  updateCustomer: (id, customer) => set((state) => ({
    customers: state.customers.map(c => c.id === id ? { ...c, ...customer, updatedAt: now() } : c)
  })),
  deleteCustomer: (id) => set((state) => ({
    customers: state.customers.filter(c => c.id !== id)
  })),

  addPricingStrategy: (strategy) => set((state) => ({
    pricingStrategies: [...state.pricingStrategies, { ...strategy, id: `PS${Date.now()}`, createdAt: now() }]
  })),
  updatePricingStrategy: (id, strategy) => set((state) => ({
    pricingStrategies: state.pricingStrategies.map(s => s.id === id ? { ...s, ...strategy } : s)
  })),
  deletePricingStrategy: (id) => set((state) => ({
    pricingStrategies: state.pricingStrategies.filter(s => s.id !== id)
  })),
  calculatePrice: (basePrice, customerType, partCategory, condition) => {
    const state = get();
    const strategies = state.pricingStrategies.filter(s =>
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

  addQuote: (quote) => set((state) => ({
    quotes: [...state.quotes, { ...quote, id: `Q${Date.now()}`, createdAt: now(), updatedAt: now() }]
  })),
  updateQuote: (id, quote) => set((state) => ({
    quotes: state.quotes.map(q => q.id === id ? { ...q, ...quote, updatedAt: now() } : q)
  })),
  deleteQuote: (id) => set((state) => ({
    quotes: state.quotes.filter(q => q.id !== id)
  })),
  addNegotiation: (quoteId, offer, remark) => set((state) => ({
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
  })),

  addShipment: (shipment) => set((state) => ({
    shipments: [...state.shipments, { ...shipment, id: `S${Date.now()}`, createdAt: now() }]
  })),
  updateShipment: (id, shipment) => set((state) => ({
    shipments: state.shipments.map(s => s.id === id ? { ...s, ...shipment } : s)
  })),

  addWarrantyClaim: (claim) => set((state) => ({
    warrantyClaims: [...state.warrantyClaims, { ...claim, id: `W${Date.now()}`, createdAt: now() }]
  })),
  updateWarrantyClaim: (id, claim) => set((state) => ({
    warrantyClaims: state.warrantyClaims.map(w => w.id === id ? { ...w, ...claim } : w)
  }))
}));
