import { useState, useMemo, useEffect } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Modal, Form,
  InputNumber, Divider, Row, Col, message, Drawer, Descriptions,
  DatePicker, List, Timeline, Avatar, Badge, App, Steps, Tabs,
  Tooltip, Empty, Upload, Image
} from 'antd';
import {
  SearchOutlined, PlusOutlined, SaveOutlined, SendOutlined,
  PrinterOutlined, ClockCircleOutlined, MinusCircleOutlined,
  HistoryOutlined, SwapOutlined, CheckCircleTwoTone,
  ExclamationCircleTwoTone, TagOutlined, ShoppingCartOutlined,
  PictureOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { Part, Quote, QuoteItem } from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const customerTypeLabels: Record<string, string> = {
  repair_shop: '维修厂', individual: '个人客户', dealer: '批发商',
  insurance: '保险公司', export: '出口商'
};

const quoteStatusMap: Record<string, { label: string; color: string; step: number }> = {
  draft: { label: '草稿', color: 'default', step: 0 },
  sent: { label: '已发送', color: 'processing', step: 1 },
  negotiating: { label: '议价中', color: 'warning', step: 2 },
  accepted: { label: '已成交', color: 'success', step: 3 },
  rejected: { label: '已拒绝', color: 'error', step: 4 },
  expired: { label: '已过期', color: 'default', step: 4 }
};

export default function QuotationDesk() {
  const parts = useAppStore(s => s.parts);
  const quotes = useAppStore(s => s.quotes);
  const customers = useAppStore(s => s.customers);
  const addQuote = useAppStore(s => s.addQuote);
  const updateQuote = useAppStore(s => s.updateQuote);
  const deleteQuote = useAppStore(s => s.deleteQuote);
  const addNegotiation = useAppStore(s => s.addNegotiation);
  const reservePart = useAppStore(s => s.reservePart);
  const releasePart = useAppStore(s => s.releasePart);
  const calculatePrice = useAppStore(s => s.calculatePrice);
  const getMatchedStrategy = useAppStore(s => s.getMatchedStrategy);
  const currentUser = useAppStore(s => s.currentUser);
  const checkExpiredReservations = useAppStore(s => s.checkExpiredReservations);
  const acceptQuote = useAppStore(s => s.acceptQuote);
  const cancelQuote = useAppStore(s => s.cancelQuote);
  const { modal } = App.useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'inquiry'>('list');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; editing?: Quote }>({ open: false });
  const [detailDrawer, setDetailDrawer] = useState<Quote | null>(null);
  const [inquiryDrawer, setInquiryDrawer] = useState(false);
  const [printModal, setPrintModal] = useState<Quote | null>(null);
  const [negotiationModal, setNegotiationModal] = useState<Quote | null>(null);
  const [reserveModal, setReserveModal] = useState<{ open: boolean; quote?: Quote }>({ open: false });
  const [reserveForm] = Form.useForm();
  const [negoForm] = Form.useForm();
  const [form] = Form.useForm();

  useEffect(() => {
    const released = checkExpiredReservations();
    if (released > 0) {
      message.info(`已自动释放 ${released} 个过期预留件`);
    }
  }, [checkExpiredReservations]);

  const [inquiryInput, setInquiryInput] = useState({
    carModel: '', year: 0, partName: '', category: ''
  });
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [validDays, setValidDays] = useState(7);

  const customer = customers.find(c => c.id === selectedCustomerId);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => {
      const matchSearch = !searchText ||
        q.quoteNumber.includes(searchText) ||
        q.customerName.includes(searchText);
      const matchStatus = !statusFilter || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotes, searchText, statusFilter]);

  const foundAlternatives = useMemo(() => {
    if (!inquiryInput.partName && !inquiryInput.category) return [];
    return parts.filter(p => {
      const matchModel = !inquiryInput.carModel ||
        p.carModel.includes(inquiryInput.carModel) ||
        p.brand.includes(inquiryInput.carModel);
      const matchYear = !inquiryInput.year || Math.abs(p.year - inquiryInput.year) <= 2;
      const matchPart = !inquiryInput.partName ||
        p.name.toLowerCase().includes(inquiryInput.partName.toLowerCase()) ||
        p.sku.toLowerCase().includes(inquiryInput.partName.toLowerCase());
      const matchCategory = !inquiryInput.category || p.category === inquiryInput.category;
      const available = p.status === 'in_stock' || p.status === 'reserved';
      return matchModel && matchYear && matchPart && matchCategory && available;
    }).slice(0, 20);
  }, [parts, inquiryInput]);

  const quoteStats = useMemo(() => {
    const total = quotes.length;
    const negotiating = quotes.filter(q => q.status === 'negotiating').length;
    const accepted = quotes.filter(q => q.status === 'accepted').length;
    const totalAmount = quotes.filter(q => q.status === 'accepted')
      .reduce((sum, q) => sum + (q.acceptedPrice || q.finalAmount), 0);
    return { total, negotiating, accepted, totalAmount };
  }, [quotes]);

  const openNewQuote = (preselectedParts?: Part[]) => {
    form.resetFields();
    setSelectedCustomerId('');
    if (preselectedParts && preselectedParts.length > 0) {
      const newItems: QuoteItem[] = preselectedParts.map(p => ({
        partId: p.id,
        partName: p.name,
        sku: p.sku,
        quantity: 1,
        unitPrice: p.basePrice,
        originalPrice: p.basePrice,
        discount: 0,
        subtotal: p.basePrice,
        warrantyDays: p.warrantyDays,
        remark: '',
        photos: [...(p.photos || [])]
      }));
      setQuoteItems(newItems);
    } else {
      setQuoteItems([]);
    }
    form.setFieldsValue({
      validUntil: dayjs().add(7, 'day'),
      taxIncluded: true,
      paymentMethod: '对公转账'
    });
    setQuoteModal({ open: true });
  };

  const openEditQuote = (quote: Quote) => {
    form.setFieldsValue({
      customerId: quote.customerId,
      validUntil: dayjs(quote.validUntil),
      taxIncluded: quote.taxIncluded,
      shippingFee: quote.shippingFee,
      paymentMethod: quote.paymentMethod,
      bottomPrice: quote.bottomPrice,
      remark: quote.remark
    });
    setSelectedCustomerId(quote.customerId);
    setQuoteItems([...quote.items]);
    setQuoteModal({ open: true, editing: quote });
  };

  const addQuoteItems = (itemsToAdd: Part[]) => {
    const newItems: QuoteItem[] = itemsToAdd.map(p => {
      const unitPrice = selectedCustomerId && customer
        ? calculatePrice(p.basePrice, customer.type, p.category, p.condition)
        : p.basePrice;
      return {
        partId: p.id,
        partName: p.name,
        sku: p.sku,
        quantity: 1,
        unitPrice,
        originalPrice: p.basePrice,
        discount: p.basePrice - unitPrice,
        subtotal: unitPrice,
        warrantyDays: p.warrantyDays,
        remark: '',
        photos: [...(p.photos || [])]
      };
    });
    setQuoteItems([...quoteItems, ...newItems]);
    message.success(`已添加 ${newItems.length} 个配件到报价单`);
  };

  const updateQuoteItem = (partId: string, field: string, value: any) => {
    setQuoteItems(quoteItems.map(item => {
      if (item.partId !== partId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.subtotal = updated.quantity * updated.unitPrice;
        updated.discount = updated.originalPrice * updated.quantity - updated.subtotal;
      }
      return updated;
    }));
  };

  const removeQuoteItem = (partId: string) => {
    setQuoteItems(quoteItems.filter(i => i.partId !== partId));
  };

  const totals = useMemo(() => {
    const totalAmount = quoteItems.reduce((s, i) => s + i.originalPrice * i.quantity, 0);
    const finalAmount = quoteItems.reduce((s, i) => s + i.subtotal, 0);
    const discountAmount = totalAmount - finalAmount;
    const shippingFee = form.getFieldValue('shippingFee') || 0;
    return {
      totalAmount,
      discountAmount,
      finalAmount: finalAmount + shippingFee,
      shippingFee
    };
  }, [quoteItems, form]);

  const submitQuote = () => {
    form.validateFields().then(values => {
      if (quoteItems.length === 0) {
        message.error('请至少添加一个配件');
        return;
      }
      if (!values.customerId) {
        message.error('请选择客户');
        return;
      }
      const cust = customers.find(c => c.id === values.customerId)!;
      let matchedStrategy: any = null;
      if (quoteItems.length > 0) {
        const firstPart = parts.find(p => p.id === quoteItems[0].partId);
        if (firstPart) {
          matchedStrategy = getMatchedStrategy(cust.type, firstPart.category, firstPart.condition);
        }
      }
      const data = {
        quoteNumber: quoteModal.editing ? quoteModal.editing.quoteNumber :
          `QT${dayjs().format('YYYYMMDD')}${String(quotes.length + 1).padStart(3, '0')}`,
        customerId: values.customerId,
        customerName: cust.name,
        customerType: cust.type,
        items: quoteItems,
        totalAmount: totals.totalAmount,
        discountAmount: totals.discountAmount,
        finalAmount: totals.finalAmount,
        bottomPrice: values.bottomPrice || Math.round(totals.finalAmount * 0.88),
        taxIncluded: values.taxIncluded,
        shippingFee: values.shippingFee || 0,
        paymentMethod: values.paymentMethod,
        status: quoteModal.editing ? quoteModal.editing.status : 'sent' as const,
        validUntil: values.validUntil.toISOString(),
        negotiationHistory: quoteModal.editing?.negotiationHistory || [],
        appliedStrategyId: matchedStrategy?.id,
        appliedStrategyName: matchedStrategy?.description || '默认基准价',
        salesPerson: currentUser,
        remark: values.remark || ''
      };
      if (quoteModal.editing) {
        updateQuote(quoteModal.editing.id, data);
        message.success('报价单已更新');
      } else {
        addQuote(data);
        message.success('报价单已创建并发送');
      }
      setQuoteModal({ open: false });
    });
  };

  const submitNegotiation = () => {
    negoForm.validateFields().then(values => {
      if (negotiationModal) {
        addNegotiation(negotiationModal.id, values.offer, values.remark);
        message.success('议价记录已添加');
        setNegotiationModal(null);
        negoForm.resetFields();
      }
    });
  };

  const openReserveModal = (quote: Quote) => {
    reserveForm.resetFields();
    reserveForm.setFieldsValue({
      reservedUntil: dayjs().add(3, 'day')
    });
    setReserveModal({ open: true, quote });
  };

  const submitReserve = () => {
    reserveForm.validateFields().then(values => {
      if (reserveModal.quote) {
        const reservedUntilDate = values.reservedUntil.toISOString();
        reserveModal.quote.items.forEach(item => {
          const part = parts.find(p => p.id === item.partId);
          if (part && part.status === 'in_stock') {
            reservePart(part.id, reserveModal.quote!.customerId, reservedUntilDate);
          }
        });
        const dateStr = dayjs(reservedUntilDate).format('YYYY-MM-DD');
        message.success(`已预留相关配件，保留至 ${dateStr}`);
        updateQuote(reserveModal.quote.id, { status: 'negotiating' });
        setReserveModal({ open: false });
      }
    });
  };

  const handlePrint = () => {
    if (!printModal) return;
    const q = printModal;
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>报价单 - ${q.quoteNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #fff;
    padding: 30px 40px;
    font-size: 14px;
    color: #262626;
  }
  .print-header { text-align: center; margin-bottom: 20px; }
  .print-header h1 { font-size: 24px; font-weight: 700; color: #262626; }
  .print-header .sub { color: #666; margin-top: 8px; font-size: 13px; }
  .print-title {
    font-size: 16px;
    font-weight: 600;
    margin: 16px 0;
    padding-bottom: 10px;
    border-bottom: 2px solid #1677ff;
  }
  .info-row { display: flex; flex-wrap: wrap; margin-bottom: 20px; }
  .info-row .col { width: 50%; line-height: 2; }
  .info-row p { margin: 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #d9d9d9;
    padding: 8px 10px;
    text-align: left;
  }
  th {
    background: #fafafa;
    font-weight: 600;
    text-align: center;
  }
  td.center, th.center { text-align: center; }
  td.right, th.right { text-align: right; }
  .part-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #e8e8e8;
    display: block;
    margin: 0 auto;
  }
  .no-image {
    width: 60px;
    height: 60px;
    margin: 0 auto;
    background: #f5f5f5;
    border: 1px dashed #d9d9d9;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #bfbfbf;
    font-size: 10px;
    line-height: 1.2;
  }
  .no-image .icon { font-size: 20px; margin-bottom: 2px; }
  .totals {
    text-align: right;
    font-size: 15px;
    line-height: 2;
  }
  .totals .final {
    font-size: 22px;
    font-weight: 700;
    color: #cf1322;
    margin-top: 6px;
  }
  .print-footer {
    margin-top: 30px;
    padding-top: 16px;
    border-top: 1px dashed #d9d9d9;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .print-footer .terms { font-size: 12px; color: #666; line-height: 1.8; }
  .print-footer .sign { font-size: 13px; }
  @media print {
    body { padding: 0; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
  <div class="print-header">
    <h1>📋 拆车配件报价单</h1>
    <div class="sub">专业拆车件 · 质保承诺 · 品质保证</div>
  </div>
  <div class="print-title">报价单编号：${q.quoteNumber}</div>
  <div class="info-row">
    <div class="col">
      <p><strong>客户名称：</strong>${q.customerName}</p>
      <p><strong>客户类型：</strong>${customerTypeLabels[q.customerType] || q.customerType}</p>
      <p><strong>报价日期：</strong>${dayjs(q.createdAt).format('YYYY年MM月DD日')}</p>
    </div>
    <div class="col">
      <p><strong>业务员：</strong>${q.salesPerson}</p>
      <p><strong>付款方式：</strong>${q.paymentMethod}</p>
      <p><strong>有效期至：</strong>${dayjs(q.validUntil).format('YYYY年MM月DD日')}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px" class="center">序号</th>
        <th style="width:80px" class="center">图片</th>
        <th class="center">SKU编码</th>
        <th class="center">配件名称</th>
        <th style="width:60px" class="center">数量</th>
        <th style="width:100px" class="center">单价(元)</th>
        <th style="width:100px" class="center">小计(元)</th>
        <th style="width:80px" class="center">质保期</th>
      </tr>
    </thead>
    <tbody>
      ${q.items.map((item, idx) => {
        const photo = item.photos && item.photos.length > 0 ? item.photos[0] : '';
        return `<tr>
          <td class="center">${idx + 1}</td>
          <td class="center">
            ${photo
              ? `<img src="${photo}" alt="${item.partName}" class="part-image" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                 <div class="no-image" style="display:none;"><div class="icon">🖼️</div>暂无图片</div>`
              : `<div class="no-image"><div class="icon">🖼️</div>暂无图片</div>`
            }
          </td>
          <td>${item.sku}</td>
          <td>${item.partName}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${item.unitPrice}</td>
          <td class="right">${item.subtotal}</td>
          <td class="center">${item.warrantyDays}天</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <div class="totals">
    <p>原价合计：<strong>¥${q.totalAmount.toLocaleString()}</strong></p>
    <p style="color:#52c41a">优惠金额：<strong>-¥${q.discountAmount.toLocaleString()}</strong></p>
    <p>运费：<strong>¥${q.shippingFee}</strong></p>
    <p class="final">最终报价：¥${q.finalAmount.toLocaleString()} （${q.taxIncluded ? '含税' : '未税'}）</p>
  </div>
  <div class="print-footer">
    <div class="terms">
      <p><strong>备注条款：</strong></p>
      <p>${q.remark || '1. 本报价单有效期内有效；2. 质保期内非人为损坏免费保修；3. 付款后安排发货。'}</p>
    </div>
    <div class="sign">
      <p style="margin-top:40px;">业务员签字：__________________ &nbsp;&nbsp; 客户确认：__________________</p>
    </div>
  </div>
</body>
</html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.onload = () => {
        setTimeout(() => {
          w.focus();
          w.print();
        }, 300);
      };
    } else {
      message.error('浏览器阻止了打印窗口弹出，请检查弹窗设置');
    }
  };

  const quoteColumns: ColumnsType<Quote> = [
    {
      title: '报价单号', dataIndex: 'quoteNumber', width: 150, fixed: 'left',
      render: t => <span className="barcode">{t}</span>
    },
    {
      title: '客户信息', width: 180,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          <Tag color="blue" style={{ marginTop: 4 }}>{customerTypeLabels[r.customerType]}</Tag>
          {r.appliedStrategyName && (
            <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 4 }}>
              💰 策略：{r.appliedStrategyName}
            </div>
          )}
        </div>
      )
    },
    {
      title: '配件数/金额', width: 160,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 12 }}>{r.items.length} 件</div>
          <div className="price-highlight" style={{ fontSize: 16 }}>¥{r.finalAmount.toLocaleString()}</div>
        </div>
      )
    },
    {
      title: '底线价', dataIndex: 'bottomPrice', width: 100,
      render: v => <span style={{ color: '#faad14', fontWeight: 600 }}>¥{v}</span>
    },
    {
      title: '当前进度', width: 200,
      render: (_, r) => {
        const step = quoteStatusMap[r.status].step;
        return (
          <Steps
            size="small"
            current={step}
            status={r.status === 'rejected' || r.status === 'expired' ? 'error' : undefined}
            style={{ paddingTop: 4 }}
            items={[
              { title: '创建' },
              { title: '发送' },
              { title: '议价' },
              { title: '成交' }
            ]}
          />
        );
      }
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: s => {
        const st = quoteStatusMap[s];
        return <Tag color={st.color}>{st.label}</Tag>;
      }
    },
    {
      title: '有效期', dataIndex: 'validUntil', width: 110,
      render: d => {
        const valid = dayjs(d).isAfter(dayjs());
        const days = dayjs(d).diff(dayjs(), 'day');
        return (
          <div>
            <div>{dayjs(d).format('MM-DD')}</div>
            <div style={{ color: valid ? '#52c41a' : '#ff4d4f', fontSize: 12 }}>
              {valid ? `剩${days}天` : '已过期'}
            </div>
          </div>
        );
      }
    },
    {
      title: '业务员', dataIndex: 'salesPerson', width: 90
    },
    {
      title: '操作', key: 'action', width: 280, fixed: 'right',
      render: (_, r) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => setDetailDrawer(r)}>查看</Button>
          <Button type="link" size="small" onClick={() => openEditQuote(r)}>编辑</Button>
          <Button type="link" size="small" onClick={() => setPrintModal(r)} icon={<PrinterOutlined />}>打印</Button>
          {r.status === 'sent' && (
            <Button type="link" size="small" onClick={() => setNegotiationModal(r)} icon={<HistoryOutlined />}>议价</Button>
          )}
          {r.status !== 'accepted' && (
            <Button type="link" size="small" onClick={() => openReserveModal(r)} icon={<ClockCircleOutlined />}>预留</Button>
          )}
          {r.status === 'negotiating' && (
            <Button type="link" size="small" onClick={() => {
              modal.confirm({
                title: '确认成交？',
                content: `确认此报价以 ¥${r.acceptedPrice || r.finalAmount} 成交，将自动锁定配件并生成待处理发货单`,
                onOk: () => {
                  const shipmentId = acceptQuote(r.id, r.acceptedPrice || r.finalAmount);
                  if (shipmentId) {
                    message.success('已成交！发货单已自动生成，请到发货台处理');
                  } else {
                    message.error('成交操作失败，请重试');
                  }
                }
              });
            }}>确认成交</Button>
          )}
          {r.status !== 'accepted' && r.status !== 'rejected' && (
            <Button type="link" size="small" danger onClick={() => {
              modal.confirm({
                title: '取消此报价单？',
                content: '取消后将释放已预留/待发货的配件，状态变更为可售',
                okText: '确认取消',
                cancelText: '再想想',
                onOk: () => { cancelQuote(r.id); message.success('报价已取消，配件已释放回库存'); }
              });
            }}>取消</Button>
          )}
          <Button type="link" size="small" danger onClick={() => {
            modal.confirm({
              title: '删除报价单？',
              content: '删除后无法恢复，相关库存状态不会自动变更，请谨慎操作',
              onOk: () => { deleteQuote(r.id); message.success('已删除'); }
            });
          }}>删除</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="tab-panel">
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        items={[
          {
            key: 'list',
            label: <Space><ShoppingCartOutlined />报价单管理</Space>,
            children: (
              <>
                <div className="stat-cards">
                  <div className="stat-card">
                    <div className="stat-icon primary"><TagOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">累计报价单</div>
                      <div className="stat-value">{quoteStats.total}</div>
                      <div className="stat-sub">本月 5 单</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon warning"><ClockCircleOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">议价中</div>
                      <div className="stat-value">{quoteStats.negotiating}</div>
                      <div className="stat-sub">需重点跟进</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon success"><CheckCircleTwoTone /></div>
                    <div className="stat-content">
                      <div className="stat-label">本月成交</div>
                      <div className="stat-value">{quoteStats.accepted}</div>
                      <div className="stat-sub">成交率 {quoteStats.total ? Math.round(quoteStats.accepted / quoteStats.total * 100) : 0}%</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon cyan"><span style={{ fontSize: 18 }}>💰</span></div>
                    <div className="stat-content">
                      <div className="stat-label">成交金额</div>
                      <div className="stat-value" style={{ color: '#13c2c2' }}>¥{quoteStats.totalAmount.toLocaleString()}</div>
                      <div className="stat-sub">累计成交额</div>
                    </div>
                  </div>
                </div>

                <Card size="small" className="filter-card">
                  <Row gutter={16} align="middle">
                    <Col>
                      <Input allowClear prefix={<SearchOutlined />}
                        placeholder="报价单号/客户名称"
                        value={searchText} onChange={e => setSearchText(e.target.value)}
                        style={{ width: 260 }} />
                    </Col>
                    <Col>
                      <Select allowClear placeholder="状态" value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }}>
                        {Object.entries(quoteStatusMap).map(([k, v]) => (
                          <Option key={k} value={k}>{v.label}</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col flex="auto" />
                    <Col>
                      <Space>
                        <Button onClick={() => setInquiryDrawer(true)} icon={<SwapOutlined />}>
                          快速询价
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => openNewQuote()}>
                          新建报价单
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                <Table
                  columns={quoteColumns}
                  dataSource={filteredQuotes}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 1500 }}
                  pagination={{
                    pageSize: 10, showSizeChanger: true,
                    showTotal: t => `共 ${t} 份报价单`
                  }}
                />
              </>
            )
          },
          {
            key: 'inquiry',
            label: <Space><SwapOutlined />快速询价台</Space>,
            children: (
              <InquiryPanel onAddToQuote={(ps) => { setInquiryDrawer(false); openNewQuote(ps); }} />
            )
          }
        ]}
      />

      <Modal
        title={quoteModal.editing ? `编辑报价单 - ${quoteModal.editing.quoteNumber}` : '新建报价单'}
        open={quoteModal.open}
        onCancel={() => setQuoteModal({ open: false })}
        onOk={submitQuote}
        width={1100}
        okText="保存并发送"
        footer={[
          <Button key="cancel" onClick={() => setQuoteModal({ open: false })}>取消</Button>,
          <Button key="draft" icon={<SaveOutlined />} onClick={() => {
            message.info('已保存为草稿');
            setQuoteModal({ open: false });
          }}>存草稿</Button>,
          <Button key="submit" type="primary" icon={<SendOutlined />} onClick={submitQuote}>保存并发送</Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <div className="detail-section-title" style={{ marginBottom: 12 }}>客户与有效期</div>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="customerId" label="选择客户" rules={[{ required: true, message: '请选择客户' }]}>
                <Select
                  showSearch optionFilterProp="children"
                  placeholder="选择或搜索客户"
                  onChange={(v) => {
                    setSelectedCustomerId(v);
                    const cust = customers.find(c => c.id === v);
                    if (cust) {
                      setQuoteItems(quoteItems.map(item => {
                        const part = parts.find(p => p.id === item.partId);
                        if (!part) return item;
                        const newPrice = calculatePrice(part.basePrice, cust.type, part.category, part.condition);
                        return {
                          ...item,
                          unitPrice: newPrice,
                          discount: (item.originalPrice - newPrice) * item.quantity,
                          subtotal: newPrice * item.quantity
                        };
                      }));
                    }
                  }}
                >
                  {customers.map(c => (
                    <Option key={c.id} value={c.id}>
                      {c.name} · {customerTypeLabels[c.type]} · 联系人:{c.contact}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="validUntil" label="报价有效期至" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }}
                  disabledDate={(d) => d.isBefore(dayjs())} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label="快捷选择">
                <Select value={validDays} onChange={v => {
                  setValidDays(v);
                  form.setFieldsValue({ validUntil: dayjs().add(v, 'day') });
                }}>
                  <Option value={3}>3天</Option>
                  <Option value={7}>7天</Option>
                  <Option value={15}>15天</Option>
                  <Option value={30}>30天</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="bottomPrice" label="议价底线">
                <InputNumber prefix="¥" style={{ width: '100%' }} min={0} placeholder="自动88%" />
              </Form.Item>
            </Col>
          </Row>
          {customer && (
            <Card size="small" style={{ background: '#f6ffed', marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}><strong>类型：</strong>{customerTypeLabels[customer.type]}</Col>
                <Col span={6}><strong>折扣率：</strong>{customer.discountRate}%</Col>
                <Col span={6}><strong>付款方式：</strong>{customer.paymentTerms}</Col>
                <Col span={6}><strong>联系：</strong>{customer.contact} {customer.phone}</Col>
              </Row>
            </Card>
          )}

          <div className="detail-section-title" style={{ marginBottom: 12 }}>
            <Row align="middle">
              <Col flex="auto">配件明细 ({quoteItems.length}件)</Col>
              <Col>
                <Button size="small" onClick={() => setInquiryDrawer(true)} icon={<SearchOutlined />}>
                  从库存选择
                </Button>
              </Col>
            </Row>
          </div>

          {quoteItems.length === 0 ? (
            <Empty description="暂无配件，请点击上方按钮从库存选择" />
          ) : (
            <Table
              size="small"
              pagination={false}
              dataSource={quoteItems}
              rowKey="partId"
              columns={[
                { title: 'SKU', dataIndex: 'sku', width: 160 },
                { title: '配件名称', dataIndex: 'partName' },
                {
                  title: '数量', dataIndex: 'quantity', width: 90,
                  render: (v, r) => (
                    <InputNumber min={1} value={v} size="small"
                      onChange={(nv) => updateQuoteItem(r.partId, 'quantity', nv || 1)}
                      style={{ width: '100%' }} />
                  )
                },
                {
                  title: '原价', dataIndex: 'originalPrice', width: 100,
                  render: v => `¥${v}`
                },
                {
                  title: '报价单价', dataIndex: 'unitPrice', width: 120,
                  render: (v, r) => (
                    <InputNumber prefix="¥" min={0} value={v} size="small"
                      onChange={(nv) => updateQuoteItem(r.partId, 'unitPrice', nv || 0)}
                      style={{ width: '100%' }} />
                  )
                },
                {
                  title: '小计', width: 110,
                  render: (_, r) => <span className="price-highlight" style={{ fontSize: 16 }}>¥{r.subtotal}</span>
                },
                { title: '质保', dataIndex: 'warrantyDays', width: 80, render: v => `${v}天` },
                {
                  title: '', width: 50, align: 'center',
                  render: (_, r) => (
                    <Button type="text" danger size="small" icon={<MinusCircleOutlined />}
                      onClick={() => removeQuoteItem(r.partId)} />
                  )
                }
              ]}
            />
          )}

          <div className="detail-section-title" style={{ margin: '20px 0 12px' }}>费用汇总</div>
          <Card size="small">
            <Row gutter={16} style={{ fontSize: 14 }}>
              <Col span={6}>
                <Form.Item name="shippingFee" label="运费" style={{ marginBottom: 0 }}>
                  <InputNumber prefix="¥" min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="taxIncluded" valuePropName="checked" label="是否含税" style={{ marginBottom: 0, marginTop: 30 }}>
                  <Select>
                    <Option value={true}>含税</Option>
                    <Option value={false}>未税</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="paymentMethod" label="付款方式" style={{ marginBottom: 0 }}>
                  <Select>
                    <Option value="对公转账">对公转账</Option>
                    <Option value="微信">微信</Option>
                    <Option value="支付宝">支付宝</Option>
                    <Option value="现金">现金</Option>
                    <Option value="月结">月结</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6} style={{ textAlign: 'right' }}>
                <div>原价合计：¥{totals.totalAmount.toLocaleString()}</div>
                <div style={{ color: '#52c41a' }}>优惠：-¥{totals.discountAmount.toLocaleString()}</div>
                <Divider style={{ margin: '6px 0' }} />
                <div style={{ fontSize: 20, fontWeight: 700, color: '#cf1322' }}>
                  应付：¥{totals.finalAmount.toLocaleString()}
                </div>
              </Col>
            </Row>
          </Card>

          <Form.Item name="remark" label="备注" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} placeholder="补充说明、保修条款等" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="快速询价 - 搜索配件"
        open={inquiryDrawer}
        onClose={() => setInquiryDrawer(false)}
        width={900}
        footer={
          <Space>
            <Button onClick={() => setInquiryDrawer(false)}>取消</Button>
          </Space>
        }
      >
        <InquiryPanel
          onAddToQuote={(ps) => {
            addQuoteItems(ps);
            setQuoteModal({ open: true });
            setInquiryDrawer(false);
          }}
          initialInput={inquiryInput}
          onInputChange={setInquiryInput}
        />
      </Drawer>

      <Drawer
        title={`报价单详情 - ${detailDrawer?.quoteNumber}`}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={720}
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => setPrintModal(detailDrawer)}>打印</Button>
            <Button type="primary" onClick={() => { setDetailDrawer(null); openEditQuote(detailDrawer!); }}>编辑</Button>
          </Space>
        }
      >
        {detailDrawer && (
          <>
            <div className="detail-section">
              <div className="detail-section-title">基本信息</div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="报价单号">{detailDrawer.quoteNumber}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={quoteStatusMap[detailDrawer.status].color}>
                    {quoteStatusMap[detailDrawer.status].label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="客户">{detailDrawer.customerName}</Descriptions.Item>
                <Descriptions.Item label="类型">{customerTypeLabels[detailDrawer.customerType]}</Descriptions.Item>
                <Descriptions.Item label="有效期至">{dayjs(detailDrawer.validUntil).format('YYYY-MM-DD')}</Descriptions.Item>
                <Descriptions.Item label="业务员">{detailDrawer.salesPerson}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">配件明细</div>
              <Table
                size="small"
                pagination={false}
                dataSource={detailDrawer.items}
                rowKey="partId"
                columns={[
                  { title: 'SKU', dataIndex: 'sku', width: 160 },
                  { title: '名称', dataIndex: 'partName' },
                  { title: '数量', dataIndex: 'quantity', width: 60, align: 'center' },
                  { title: '单价', dataIndex: 'unitPrice', width: 90, render: v => `¥${v}` },
                  { title: '小计', dataIndex: 'subtotal', width: 100, render: v => <span className="price-highlight">¥{v}</span> },
                  { title: '质保', dataIndex: 'warrantyDays', width: 70, render: v => `${v}天` }
                ]}
              />
            </div>

            <div className="detail-section">
              <div className="detail-section-title">价格与条款</div>
              <Card size="small">
                <Row gutter={16}>
                  <Col span={8}>原价合计<div style={{ fontSize: 16 }}>¥{detailDrawer.totalAmount}</div></Col>
                  <Col span={8}>优惠金额<div style={{ fontSize: 16, color: '#52c41a' }}>-¥{detailDrawer.discountAmount}</div></Col>
                  <Col span={8} style={{ textAlign: 'right' }}>
                    最终报价
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#cf1322' }}>¥{detailDrawer.finalAmount}</div>
                  </Col>
                </Row>
                <Divider />
                <Row gutter={16} style={{ fontSize: 13 }}>
                  <Col span={8}><strong>底线价：</strong>
                    <span style={{ color: '#faad14' }}>¥{detailDrawer.bottomPrice}</span>
                    <Tooltip title="低于此价格不可让步">
                      <ExclamationCircleTwoTone twoToneColor="#faad14" />
                    </Tooltip>
                  </Col>
                  <Col span={8}><strong>运费：</strong>¥{detailDrawer.shippingFee}</Col>
                  <Col span={8}><strong>开票：</strong>{detailDrawer.taxIncluded ? '含税' : '未税'}</Col>
                </Row>
              </Card>
            </div>

            {detailDrawer.negotiationHistory.length > 0 && (
              <div className="detail-section">
                <div className="detail-section-title">议价记录</div>
                <Timeline
                  className="negotiation-timeline"
                  items={detailDrawer.negotiationHistory.map(h => ({
                    color: h.offer <= detailDrawer.bottomPrice ? 'red' : 'blue',
                    children: (
                      <Card size="small" title={
                        <Space>
                          <Avatar size="small">{h.operator.slice(0, 1)}</Avatar>
                          <span>{h.operator}</span>
                          <Tag color="orange">报价 ¥{h.offer}</Tag>
                          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                            {dayjs(h.time).format('MM-DD HH:mm')}
                          </span>
                        </Space>
                      }>
                        {h.remark}
                      </Card>
                    )
                  }))}
                />
              </div>
            )}
          </>
        )}
      </Drawer>

      <Modal
        title="添加议价记录"
        open={!!negotiationModal}
        onCancel={() => setNegotiationModal(null)}
        onOk={submitNegotiation}
        okText="保存记录"
      >
        {negotiationModal && (
          <Form form={negoForm} layout="vertical">
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>当前报价：<span className="price-highlight">¥{negotiationModal.finalAmount}</span></Col>
                <Col span={12}>底线价格：<span style={{ color: '#faad14' }}>¥{negotiationModal.bottomPrice}</span></Col>
              </Row>
            </Card>
            <Form.Item name="offer" label="客户还价/我方让步金额 (¥)" rules={[{ required: true }]}>
              <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="remark" label="备注说明">
              <Input.TextArea rows={3} placeholder="客户要求、我方条件、沟通内容等" />
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal
        title={`打印报价单 - ${printModal?.quoteNumber}`}
        open={!!printModal}
        onCancel={() => setPrintModal(null)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setPrintModal(null)}>关闭</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>打印 / 保存为PDF</Button>
        ]}
      >
        {printModal && (
          <div className="print-content" id="print-area">
            <div className="print-header">
              <h1>📋 拆车配件报价单</h1>
              <div style={{ color: '#666', marginTop: 8 }}>
                专业拆车件 · 质保承诺 · 品质保证
              </div>
            </div>
            <div className="print-title">报价单编号：{printModal.quoteNumber}</div>
            <Row style={{ marginBottom: 20 }}>
              <Col span={12}>
                <p><strong>客户名称：</strong>{printModal.customerName}</p>
                <p><strong>客户类型：</strong>{customerTypeLabels[printModal.customerType]}</p>
                <p><strong>报价日期：</strong>{dayjs(printModal.createdAt).format('YYYY年MM月DD日')}</p>
              </Col>
              <Col span={12}>
                <p><strong>业务员：</strong>{printModal.salesPerson}</p>
                <p><strong>付款方式：</strong>{printModal.paymentMethod}</p>
                <p><strong>有效期至：</strong>{dayjs(printModal.validUntil).format('YYYY年MM月DD日')}</p>
              </Col>
            </Row>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>序号</th>
                  <th style={{ width: 80 }}>图片</th>
                  <th>SKU编码</th>
                  <th>配件名称</th>
                  <th style={{ width: 60 }}>数量</th>
                  <th style={{ width: 100 }}>单价(元)</th>
                  <th style={{ width: 100 }}>小计(元)</th>
                  <th style={{ width: 80 }}>质保期</th>
                </tr>
              </thead>
              <tbody>
                {printModal.items.map((item, idx) => (
                  <tr key={item.partId}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                      {item.photos && item.photos.length > 0 ? (
                        <img
                          src={item.photos[0]}
                          alt={item.partName}
                          className="print-part-image"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hide');
                          }}
                        />
                      ) : null}
                      {(!item.photos || item.photos.length === 0) && (
                        <div className="no-image-placeholder">
                          <PictureOutlined />
                          <span>暂无图片</span>
                        </div>
                      )}
                      {item.photos && item.photos.length > 0 && (
                        <div className="no-image-placeholder hide" style={{ marginTop: -60 }}>
                          <PictureOutlined />
                          <span>暂无图片</span>
                        </div>
                      )}
                    </td>
                    <td>{item.sku}</td>
                    <td>{item.partName}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{item.unitPrice}</td>
                    <td style={{ textAlign: 'right' }}>{item.subtotal}</td>
                    <td style={{ textAlign: 'center' }}>{item.warrantyDays}天</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', fontSize: 16, marginTop: 16 }}>
              <p>原价合计：<strong>¥{printModal.totalAmount.toLocaleString()}</strong></p>
              <p style={{ color: '#52c41a' }}>优惠金额：<strong>-¥{printModal.discountAmount.toLocaleString()}</strong></p>
              <p>运费：<strong>¥{printModal.shippingFee}</strong></p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#cf1322' }}>
                最终报价：¥{printModal.finalAmount.toLocaleString()}
                （{printModal.taxIncluded ? '含税' : '未税'}）
              </p>
            </div>
            <div className="print-footer">
              <div>
                <p><strong>备注条款：</strong></p>
                <p style={{ fontSize: 12, color: '#666' }}>
                  {printModal.remark || '1. 本报价单有效期内有效；2. 质保期内非人为损坏免费保修；3. 付款后安排发货。'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ marginTop: 40 }}>
                  业务员签字：__________________ &nbsp;&nbsp; 客户确认：__________________
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={reserveModal.quote ? `预留配件 - ${reserveModal.quote.quoteNumber}` : '预留配件'}
        open={reserveModal.open}
        onCancel={() => setReserveModal({ open: false })}
        onOk={submitReserve}
        width={500}
        okText="确认预留"
      >
        {reserveModal.quote && (
          <Form form={reserveForm} layout="vertical">
            <Card size="small" style={{ marginBottom: 16, background: '#fff7e6' }}>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div><strong>客户：</strong>{reserveModal.quote.customerName}</div>
                <div><strong>待预留配件：</strong>{reserveModal.quote.items.length} 件</div>
                <div style={{ color: '#fa8c16' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  预留期间库存将被锁定，过期后自动释放
                </div>
              </div>
            </Card>
            <Form.Item name="reservedUntil" label="预留截止日期" rules={[{ required: true, message: '请选择预留截止日期' }]}>
              <DatePicker
                style={{ width: '100%' }}
                disabledDate={(d) => d.isBefore(dayjs().startOf('day'))}
                placeholder="选择预留截止日期"
                size="large"
              />
            </Form.Item>
            <Row gutter={8}>
              {[3, 7, 15, 30].map(days => (
                <Col span={6} key={days}>
                  <Button block onClick={() => {
                    reserveForm.setFieldsValue({ reservedUntil: dayjs().add(days, 'day') });
                  }}>
                    {days}天
                  </Button>
                </Col>
              ))}
            </Row>
          </Form>
        )}
      </Modal>
    </div>
  );
}

function InquiryPanel({
  onAddToQuote, initialInput, onInputChange
}: {
  onAddToQuote: (parts: Part[]) => void;
  initialInput?: any;
  onInputChange?: (v: any) => void;
}) {
  const parts = useAppStore(s => s.parts);
  const [input, setInput] = useState(initialInput || { carModel: '', year: 0, partName: '', category: '' });
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const handleSearch = (key: string, value: any) => {
    const newInput = { ...input, [key]: value };
    setInput(newInput);
    onInputChange?.(newInput);
  };

  const alternatives = useMemo(() => {
    if (!input.partName && !input.carModel && !input.category) return [];
    return parts.filter(p => {
      const matchModel = !input.carModel ||
        p.carModel.includes(input.carModel) || p.brand.includes(input.carModel);
      const matchYear = !input.year || Math.abs(p.year - (input.year || 3000)) <= 3;
      const matchPart = !input.partName ||
        p.name.toLowerCase().includes(input.partName.toLowerCase()) ||
        p.oemNumber.toLowerCase().includes(input.partName.toLowerCase()) ||
        p.sku.toLowerCase().includes(input.partName.toLowerCase());
      const matchCategory = !input.category || p.category === input.category;
      const available = p.status === 'in_stock' || p.status === 'reserved';
      return matchModel && matchYear && matchPart && matchCategory && available;
    }).slice(0, 30);
  }, [parts, input]);

  const selectedParts = alternatives.filter(p => selectedKeys.includes(p.id));

  return (
    <div>
      <Card size="small" className="filter-card" title="输入询价信息">
        <Row gutter={[16, 12]}>
          <Col span={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="车型/品牌（如：帕萨特、大众）"
              value={input.carModel}
              onChange={e => handleSearch('carModel', e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <InputNumber
              placeholder="年款（选填）"
              value={input.year || undefined}
              onChange={v => handleSearch('year', v || 0)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="配件名称/OEM/SKU"
              value={input.partName}
              onChange={e => handleSearch('partName', e.target.value)}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              allowClear
              placeholder="类别"
              value={input.category || undefined}
              onChange={v => handleSearch('category', v)}
              style={{ width: '100%' }}
            >
              {['发动机', '变速箱', '底盘', '电器', '灯光', '外观', '内饰', '车门'].map(c => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Select>
          </Col>
        </Row>
        <div style={{ marginTop: 12, fontSize: 12, color: '#8c8c8c' }}>
          💡 智能匹配：同品牌同排量 ±3 年款配件自动推荐为替代件
        </div>
      </Card>

      {alternatives.length === 0 ? (
        <Empty description="请输入查询条件搜索替代件" style={{ marginTop: 60 }} />
      ) : (
        <>
          <Card
            size="small"
            title={`找到 ${alternatives.length} 个可替代配件 ${selectedKeys.length > 0 ? `（已选 ${selectedKeys.length}）` : ''}`}
            extra={
              <Button
                type="primary"
                disabled={selectedKeys.length === 0}
                onClick={() => {
                  onAddToQuote(selectedParts);
                  setSelectedKeys([]);
                }}
              >
                添加 {selectedKeys.length} 件到报价单
              </Button>
            }
            style={{ marginTop: 16 }}
          >
            <Table
              size="small"
              rowSelection={{
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys as string[])
              }}
              dataSource={alternatives}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              columns={[
                {
                  title: '配件信息', width: 200,
                  render: (_, r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.sku}</div>
                    </div>
                  )
                },
                {
                  title: '适用车型', width: 150,
                  render: (_, r) => `${r.brand} ${r.carModel} ${r.year}`
                },
                { title: '类别', dataIndex: 'category', width: 80 },
                {
                  title: '成色', dataIndex: 'condition', width: 70, align: 'center',
                  render: c => <span className={`condition-badge condition-${c}`}>{c}</span>
                },
                {
                  title: '库位/质保', width: 100,
                  render: (_, r) => (
                    <div style={{ fontSize: 12 }}>
                      📍 {r.shelfLocation}<br />🛡️ {r.warrantyDays}天
                    </div>
                  )
                },
                {
                  title: '状态', width: 70,
                  render: (_, r) => r.status === 'in_stock'
                    ? <Badge status="success" text="在库" />
                    : <Badge status="warning" text="已预留" />
                },
                {
                  title: '参考价', width: 100, align: 'right',
                  render: (_, r) => <span className="price-highlight" style={{ fontSize: 16 }}>¥{r.basePrice}</span>
                }
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
