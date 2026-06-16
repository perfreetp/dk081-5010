export type VehicleSource = 'insurance' | 'auction' | 'private' | 'scrap_station' | 'other';
export type PartCondition = 'A' | 'B' | 'C' | 'D';
export type CustomerType = 'repair_shop' | 'individual' | 'dealer' | 'insurance' | 'export';
export type PartStatus = 'in_stock' | 'reserved' | 'sold' | 'pending_shipment' | 'shipped' | 'lost';
export type QuoteStatus = 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected' | 'expired';
export type WarrantyClaimStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Vehicle {
  id: string;
  vin: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  displacement: string;
  transmission: string;
  color: string;
  mileage: number;
  source: VehicleSource;
  sourceDetail: string;
  accidentDescription: string;
  batchNumber: string;
  inboundDate: string;
  dismantler: string;
  photos: string[];
  status: 'pending' | 'dismantling' | 'completed' | 'archived';
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartTest {
  testName: string;
  result: 'pass' | 'fail' | 'na';
  remark: string;
}

export interface Part {
  id: string;
  vehicleId: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  carModel: string;
  year: number;
  oemNumber: string;
  originalCode: string;
  condition: PartCondition;
  conditionDescription: string;
  defects: string[];
  testResults: PartTest[];
  position: string;
  quantity: number;
  costPrice: number;
  basePrice: number;
  minPrice: number;
  status: PartStatus;
  reservedBy?: string;
  reservedUntil?: string;
  photos: string[];
  inboundDate: string;
  shelfLocation: string;
  warrantyDays: number;
  remark: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  contact: string;
  phone: string;
  wechat: string;
  address: string;
  taxNumber: string;
  creditLimit: number;
  discountRate: number;
  paymentTerms: string;
  preferredBrand: string[];
  status: 'active' | 'inactive' | 'blacklist';
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingStrategy {
  id: string;
  customerType: CustomerType;
  partCategory?: string;
  condition?: PartCondition;
  markupRate: number;
  discountRate: number;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
  effectiveDate: string;
  changeHistory: {
    time: string;
    operator: string;
    field: string;
    oldValue: string;
    newValue: string;
    remark: string;
  }[];
}

export interface QuoteItem {
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discount: number;
  subtotal: number;
  warrantyDays: number;
  remark: string;
  photos: string[];
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  items: QuoteItem[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  bottomPrice: number;
  taxIncluded: boolean;
  shippingFee: number;
  paymentMethod: string;
  status: QuoteStatus;
  validUntil: string;
  acceptedPrice?: number;
  appliedStrategyId?: string;
  appliedStrategyName?: string;
  negotiationHistory: {
    time: string;
    operator: string;
    offer: number;
    remark: string;
  }[];
  salesPerson: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  quoteId?: string;
  customerId: string;
  customerName: string;
  shippingMethod: 'self_pickup' | 'express' | 'logistics' | 'delivery';
  items: {
    partId: string;
    partName: string;
    sku: string;
    quantity: number;
    photos: string[];
  }[];
  receiver: string;
  receiverPhone: string;
  receiverAddress: string;
  trackingNumber?: string;
  logisticsCompany?: string;
  logisticsFee: number;
  woodPackingFee: number;
  otherFees: number;
  totalFees: number;
  insuranceFee: number;
  weight: number;
  packages: number;
  status: 'pending' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  shippedDate?: string;
  receivedDate?: string;
  operator: string;
  remark: string;
  createdAt: string;
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  partId: string;
  partName: string;
  sku: string;
  shipmentId: string;
  customerId: string;
  customerName: string;
  saleDate: string;
  claimDate: string;
  daysUsed: number;
  warrantyDaysLeft: number;
  problemDescription: string;
  photos: string[];
  status: WarrantyClaimStatus;
  resolution: string;
  refundAmount: number;
  replacementPartId?: string;
  handler: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface InventoryTurnover {
  partCategory: string;
  carModel: string;
  totalStock: number;
  sold30Days: number;
  sold90Days: number;
  averageDaysInStock: number;
  turnoverRate: number;
}
