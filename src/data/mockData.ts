import { Vehicle, Part, Customer, PricingStrategy, Quote, Shipment, WarrantyClaim } from '@/types';

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

export const mockVehicles: Vehicle[] = [
  {
    id: 'V1', vin: 'LSVAU2180N2123456', plateNumber: '沪A88888',
    brand: '大众', model: '帕萨特', year: 2021, displacement: '2.0T',
    transmission: '7速双离合', color: '黑色', mileage: 45000,
    source: 'insurance', sourceDetail: '太平洋保险',
    accidentDescription: '正面碰撞，前保险杠、水箱框架损坏，发动机完好',
    batchNumber: 'B202406001', inboundDate: d(15), dismantler: '张师傅',
    photos: [], status: 'completed', remark: '精品车况，配件成色好',
    createdAt: d(15), updatedAt: d(10)
  },
  {
    id: 'V2', vin: 'LGBF2DE02DY123789', plateNumber: '粤B66666',
    brand: '日产', model: '天籁', year: 2020, displacement: '2.0L',
    transmission: 'CVT', color: '银色', mileage: 68000,
    source: 'auction', sourceDetail: '优信拍卖',
    accidentDescription: '侧面碰撞，B柱变形，右侧前后门损坏',
    batchNumber: 'B202406002', inboundDate: d(20), dismantler: '李师傅',
    photos: [], status: 'dismantling', remark: '发动机变速箱完好',
    createdAt: d(20), updatedAt: d(18)
  },
  {
    id: 'V3', vin: 'LVSHFFAL5FE456789', plateNumber: '京A12345',
    brand: '福特', model: '蒙迪欧', year: 2019, displacement: '1.5T',
    transmission: '6AT', color: '白色', mileage: 82000,
    source: 'private', sourceDetail: '个人车主王先生',
    accidentDescription: '泡水车，水位没过座椅底部，电路需检修',
    batchNumber: 'B202406003', inboundDate: d(30), dismantler: '王师傅',
    photos: [], status: 'pending', remark: '内饰件大部分可用',
    createdAt: d(30), updatedAt: d(30)
  }
];

const partPhoto = (prompt: string) => [
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square_hd`
];

export const mockParts: Part[] = [
  {
    id: 'P1', vehicleId: 'V1', sku: 'VW-PST-21-ENG-001',
    name: 'EA888发动机总成', category: '发动机',
    brand: '大众', carModel: '帕萨特', year: 2021,
    oemNumber: '06K100032F', originalCode: 'EA888-GEN3B',
    condition: 'A', conditionDescription: '成色极新，仅行驶4.5万公里，无拆修',
    defects: [], testResults: [
      { testName: '缸压测试', result: 'pass', remark: '各缸压均在12bar以上' },
      { testName: '漏油检查', result: 'pass', remark: '无渗漏' },
      { testName: '异响检测', result: 'pass', remark: '运转平稳无异响' }
    ],
    position: '前部中央', quantity: 1, costPrice: 18000, basePrice: 28000, minPrice: 24000,
    status: 'in_stock',
    photos: partPhoto('car engine assembly, volkswagen EA888 engine, clean used auto part, professional photography'),
    inboundDate: d(12),
    shelfLocation: 'A区-01-03', warrantyDays: 90,
    remark: '附带涡轮增压器、发电机、起动机',
    createdBy: '管理员', createdAt: d(12), updatedAt: d(12)
  },
  {
    id: 'P2', vehicleId: 'V1', sku: 'VW-PST-21-GBX-001',
    name: 'DQ381变速箱总成', category: '变速箱',
    brand: '大众', carModel: '帕萨特', year: 2021,
    oemNumber: '0GC300054G', originalCode: 'DQ381',
    condition: 'A', conditionDescription: '成色好，换挡平顺',
    defects: [], testResults: [
      { testName: '换挡测试', result: 'pass', remark: '各档位切换顺畅' },
      { testName: '油压测试', result: 'pass', remark: '油压正常' }
    ],
    position: '底盘中部', quantity: 1, costPrice: 8500, basePrice: 15000, minPrice: 12500,
    status: 'reserved', reservedBy: 'C1',
    reservedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    photos: partPhoto('automatic transmission gearbox, DSG DQ381, used car transmission, clean mechanical part'),
    inboundDate: d(12),
    shelfLocation: 'A区-02-01', warrantyDays: 90,
    remark: '含变矩器', createdBy: '管理员', createdAt: d(12), updatedAt: d(5)
  },
  {
    id: 'P3', vehicleId: 'V1', sku: 'VW-PST-21-LHD-001',
    name: '左前大灯总成', category: '灯光',
    brand: '大众', carModel: '帕萨特', year: 2021,
    oemNumber: '561941031', originalCode: 'LED-MATRIX',
    condition: 'B', conditionDescription: '灯面有轻微划痕，功能完好',
    defects: ['灯面划痕约3cm'], testResults: [
      { testName: '点亮测试', result: 'pass', remark: '全部光源正常点亮' },
      { testName: '密封性测试', result: 'pass', remark: '无进水' }
    ],
    position: '左前', quantity: 1, costPrice: 800, basePrice: 2200, minPrice: 1800,
    status: 'in_stock',
    photos: partPhoto('car LED headlight assembly, volkswagen passat left headlight, matrix LED, used auto light part'),
    inboundDate: d(12),
    shelfLocation: 'B区-01-05', warrantyDays: 30,
    remark: '矩阵LED大灯', createdBy: '管理员', createdAt: d(12), updatedAt: d(12)
  },
  {
    id: 'P4', vehicleId: 'V2', sku: 'NS-TL-20-ENG-001',
    name: 'MR20发动机总成', category: '发动机',
    brand: '日产', carModel: '天籁', year: 2020,
    oemNumber: '10102-6CT0A', originalCode: 'MR20DD',
    condition: 'A', conditionDescription: '成色好，无拆修无漏油',
    defects: [], testResults: [
      { testName: '缸压测试', result: 'pass', remark: '各缸压均在11bar以上' },
      { testName: '异响检测', result: 'pass', remark: '运转正常' }
    ],
    position: '前部中央', quantity: 1, costPrice: 9500, basePrice: 18000, minPrice: 15500,
    status: 'in_stock',
    photos: partPhoto('nissan MR20 engine assembly, used japanese car engine, clean motor, professional photo'),
    inboundDate: d(17),
    shelfLocation: 'A区-01-05', warrantyDays: 90,
    remark: '', createdBy: '管理员', createdAt: d(17), updatedAt: d(17)
  },
  {
    id: 'P5', vehicleId: 'V2', sku: 'NS-TL-20-DOR-001',
    name: '左后车门总成', category: '车门',
    brand: '日产', carModel: '天籁', year: 2020,
    oemNumber: '82101-6CT1A', originalCode: '',
    condition: 'B', conditionDescription: '门边有轻微凹陷，无钣金修复',
    defects: ['门底边轻微凹陷2cm'], testResults: [
      { testName: '密封性', result: 'pass', remark: '' }
    ],
    position: '左后', quantity: 1, costPrice: 600, basePrice: 1500, minPrice: 1200,
    status: 'sold',
    photos: partPhoto('silver car rear door assembly, nissan teana left door, used auto body part'),
    inboundDate: d(17),
    shelfLocation: 'C区-03-02', warrantyDays: 30,
    remark: '银色，含内饰板和升降器',
    createdBy: '管理员', createdAt: d(17), updatedAt: d(3)
  },
  {
    id: 'P6', vehicleId: 'V3', sku: 'FD-MD-19-SEB-001',
    name: '主驾座椅总成', category: '内饰',
    brand: '福特', carModel: '蒙迪欧', year: 2019,
    oemNumber: 'DS73-9661700', originalCode: '',
    condition: 'B', conditionDescription: '真皮座椅，有轻微使用痕迹，经清洁处理',
    defects: ['座椅左侧轻微磨损'], testResults: [
      { testName: '电动调节', result: 'pass', remark: '10向调节正常' },
      { testName: '加热功能', result: 'pass', remark: '' }
    ],
    position: '主驾', quantity: 1, costPrice: 350, basePrice: 950, minPrice: 750,
    status: 'in_stock',
    photos: partPhoto('black leather car seat, ford mondeo driver seat, electric adjustable, used auto interior part'),
    inboundDate: d(25),
    shelfLocation: 'D区-02-04', warrantyDays: 30,
    remark: '电动+加热+记忆', createdBy: '管理员', createdAt: d(25), updatedAt: d(25)
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'C1', name: '顺达汽修厂', type: 'repair_shop',
    contact: '陈经理', phone: '13800138001', wechat: 'shunda_auto',
    address: '上海市浦东新区张江路123号',
    taxNumber: '91310000MA1FL7AB12',
    creditLimit: 50000, discountRate: 8,
    paymentTerms: '月结30天',
    preferredBrand: ['大众', '奥迪', '斯柯达'],
    status: 'active', remark: '长期合作客户，信誉良好',
    createdAt: d(180), updatedAt: d(10)
  },
  {
    id: 'C2', name: '李总（个人）', type: 'individual',
    contact: '李先生', phone: '13900139002', wechat: 'lizong_auto',
    address: '北京市朝阳区建国路88号',
    taxNumber: '', creditLimit: 0, discountRate: 0,
    paymentTerms: '款到发货',
    preferredBrand: ['日产'],
    status: 'active', remark: '老客户介绍',
    createdAt: d(90), updatedAt: d(20)
  },
  {
    id: 'C3', name: '宝隆汽配批发', type: 'dealer',
    contact: '王总', phone: '13700137003', wechat: 'baolong_qp',
    address: '广州市白云区汽配城A区15档',
    taxNumber: '91440100MA59XY8K23',
    creditLimit: 100000, discountRate: 15,
    paymentTerms: '月结60天',
    preferredBrand: ['福特', '通用'],
    status: 'active', remark: '量大，价格敏感',
    createdAt: d(365), updatedAt: d(5)
  },
  {
    id: 'C4', name: '平安保险理赔部', type: 'insurance',
    contact: '理赔专员', phone: '021-95511', wechat: 'pa_claims',
    address: '上海市浦东新区平安大厦',
    taxNumber: '91310000100001234X',
    creditLimit: 200000, discountRate: 5,
    paymentTerms: '月结45天',
    preferredBrand: [],
    status: 'active', remark: '指定采购合作',
    createdAt: d(200), updatedAt: d(15)
  }
];

export const mockPricingStrategies: PricingStrategy[] = [
  {
    id: 'PS1', customerType: 'repair_shop', markupRate: 60, discountRate: 8,
    description: '维修厂通用策略', status: 'active', createdAt: d(300),
    effectiveDate: d(300),
    changeHistory: [
      { time: d(300), operator: '管理员', field: '创建策略', oldValue: '-', newValue: '60%加价 / 8%折扣', remark: '新建维修厂通用报价规则' },
      { time: d(150), operator: '管理员', field: 'discountRate', oldValue: '5', newValue: '8', remark: '维修厂竞争激烈，折扣上调3%' }
    ]
  },
  {
    id: 'PS2', customerType: 'repair_shop', partCategory: '发动机',
    markupRate: 50, discountRate: 10,
    description: '维修厂发动机件高量折扣', status: 'active', createdAt: d(280),
    effectiveDate: d(280),
    changeHistory: [
      { time: d(280), operator: '管理员', field: '创建策略', oldValue: '-', newValue: '50%加价 / 10%折扣', remark: '发动机件量大，单独设规则' }
    ]
  },
  {
    id: 'PS3', customerType: 'dealer', markupRate: 40, discountRate: 15,
    description: '批发商底价走量策略', status: 'active', createdAt: d(260),
    effectiveDate: d(260),
    changeHistory: [
      { time: d(260), operator: '管理员', field: '创建策略', oldValue: '-', newValue: '40%加价 / 15%折扣', remark: '批发商走量，底价规则' }
    ]
  },
  {
    id: 'PS4', customerType: 'individual', markupRate: 80, discountRate: 0,
    description: '个人客户零售价', status: 'active', createdAt: d(240),
    effectiveDate: d(240),
    changeHistory: [
      { time: d(240), operator: '管理员', field: '创建策略', oldValue: '-', newValue: '80%加价 / 0%折扣', remark: '个人客户零售，无折扣' }
    ]
  },
  {
    id: 'PS5', customerType: 'insurance', markupRate: 50, discountRate: 5,
    description: '保险公司合作价', status: 'active', createdAt: d(220),
    effectiveDate: d(220),
    changeHistory: [
      { time: d(220), operator: '管理员', field: '创建策略', oldValue: '-', newValue: '50%加价 / 5%折扣', remark: '保险公司长期合作价' }
    ]
  },
  {
    id: 'PS6', customerType: 'repair_shop', condition: 'C',
    markupRate: 30, discountRate: 15,
    description: 'C级件低价快出', status: 'inactive', createdAt: d(200),
    effectiveDate: d(200),
    changeHistory: [
      { time: d(200), operator: '管理员', field: '创建策略', oldValue: '-', newValue: '30%加价 / 15%折扣', remark: 'C级瑕疵件快速清仓' },
      { time: d(30), operator: '管理员', field: 'status', oldValue: 'active', newValue: 'inactive', remark: '暂时停用，等下批C级件入库再启用' }
    ]
  }
];

export const mockQuotes: Quote[] = [
  {
    id: 'Q1', quoteNumber: 'QT20240615001',
    customerId: 'C1', customerName: '顺达汽修厂', customerType: 'repair_shop',
    items: [
      { partId: 'P1', partName: 'EA888发动机总成', sku: 'VW-PST-21-ENG-001', quantity: 1, unitPrice: 26600, originalPrice: 28000, discount: 1400, subtotal: 26600, warrantyDays: 90, remark: '', photos: partPhoto('car engine assembly, volkswagen EA888 engine, clean used auto part, professional photography') },
      { partId: 'P3', partName: '左前大灯总成', sku: 'VW-PST-21-LHD-001', quantity: 2, unitPrice: 2024, originalPrice: 2200, discount: 352, subtotal: 4048, warrantyDays: 30, remark: '', photos: partPhoto('car LED headlight assembly, volkswagen passat left headlight, matrix LED, used auto light part') }
    ],
    totalAmount: 32400, discountAmount: 1752, finalAmount: 30648, bottomPrice: 28000,
    taxIncluded: true, shippingFee: 300, paymentMethod: '对公转账',
    status: 'negotiating', validUntil: d(-2),
    negotiationHistory: [
      { time: d(2), operator: '业务员A', offer: 30648, remark: '首次报价' },
      { time: d(1), operator: '业务员A', offer: 29500, remark: '客户还价29000，让步到29500' }
    ],
    salesPerson: '业务员A', remark: '客户着急要，尽快确定',
    createdAt: d(2), updatedAt: d(1)
  },
  {
    id: 'Q2', quoteNumber: 'QT20240614002',
    customerId: 'C3', customerName: '宝隆汽配批发', customerType: 'dealer',
    items: [
      { partId: 'P4', partName: 'MR20发动机总成', sku: 'NS-TL-20-ENG-001', quantity: 1, unitPrice: 15300, originalPrice: 18000, discount: 2700, subtotal: 15300, warrantyDays: 90, remark: '', photos: partPhoto('nissan MR20 engine assembly, used japanese car engine, clean motor, professional photo') }
    ],
    totalAmount: 18000, discountAmount: 2700, finalAmount: 15300, bottomPrice: 14500,
    taxIncluded: false, shippingFee: 0, paymentMethod: '对公转账',
    status: 'accepted', acceptedPrice: 15300,
    validUntil: d(5), negotiationHistory: [],
    salesPerson: '业务员B', remark: '',
    createdAt: d(4), updatedAt: d(3)
  },
  {
    id: 'Q3', quoteNumber: 'QT20240613003',
    customerId: 'C2', customerName: '李总（个人）', customerType: 'individual',
    items: [
      { partId: 'P6', partName: '主驾座椅总成', sku: 'FD-MD-19-SEB-001', quantity: 1, unitPrice: 950, originalPrice: 950, discount: 0, subtotal: 950, warrantyDays: 30, remark: '', photos: partPhoto('black leather car seat, ford mondeo driver seat, electric adjustable, used auto interior part') }
    ],
    totalAmount: 950, discountAmount: 0, finalAmount: 950, bottomPrice: 800,
    taxIncluded: false, shippingFee: 50, paymentMethod: '微信转账',
    status: 'sent', validUntil: d(1),
    negotiationHistory: [],
    salesPerson: '业务员A', remark: '',
    createdAt: d(3), updatedAt: d(3)
  }
];

export const mockShipments: Shipment[] = [
  {
    id: 'S1', shipmentNumber: 'SH20240614001',
    quoteId: 'Q2', customerId: 'C3', customerName: '宝隆汽配批发',
    shippingMethod: 'logistics',
    items: [
      { partId: 'P4', partName: 'MR20发动机总成', sku: 'NS-TL-20-ENG-001', quantity: 1, photos: [] }
    ],
    receiver: '王总', receiverPhone: '13700137003',
    receiverAddress: '广州市白云区汽配城A区15档',
    trackingNumber: 'SF1234567890', logisticsCompany: '顺丰物流',
    logisticsFee: 450, woodPackingFee: 200, otherFees: 0,
    totalFees: 650, insuranceFee: 150,
    weight: 180, packages: 1,
    status: 'shipped', shippedDate: d(2),
    operator: '仓库员小王', remark: '已打木架',
    createdAt: d(3)
  },
  {
    id: 'S2', shipmentNumber: 'SH20240613002',
    customerId: 'C2', customerName: '李总（个人）',
    shippingMethod: 'self_pickup',
    items: [
      { partId: 'P5', partName: '左后车门总成', sku: 'NS-TL-20-DOR-001', quantity: 1, photos: [] }
    ],
    receiver: '李先生', receiverPhone: '13900139002',
    receiverAddress: '仓库自提',
    logisticsFee: 0, woodPackingFee: 0, otherFees: 0,
    totalFees: 0, insuranceFee: 0,
    weight: 35, packages: 1,
    status: 'delivered', shippedDate: d(3), receivedDate: d(3),
    operator: '仓库员小张', remark: '客户本人签收',
    createdAt: d(3)
  }
];

export const mockWarrantyClaims: WarrantyClaim[] = [
  {
    id: 'W1', claimNumber: 'WC20240610001',
    partId: 'P5', partName: '左后车门总成', sku: 'NS-TL-20-DOR-001',
    shipmentId: 'S2', customerId: 'C2', customerName: '李总（个人）',
    saleDate: d(3), claimDate: d(1),
    daysUsed: 2, warrantyDaysLeft: 28,
    problemDescription: '客户反馈升降器有时卡顿',
    photos: [], status: 'approved',
    resolution: '安排维修师傅上门调试，已解决',
    refundAmount: 0, handler: '售后小刘',
    createdAt: d(1), resolvedAt: d(0)
  }
];
