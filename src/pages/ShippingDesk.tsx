import { useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Modal, Form,
  InputNumber, Divider, Row, Col, message, Drawer, Descriptions,
  DatePicker, App, Tabs, Empty, Steps, QRCode, Badge
} from 'antd';
import {
  SearchOutlined, PlusOutlined, PrinterOutlined, TruckOutlined,
  HomeOutlined, InboxOutlined, SendOutlined, EditOutlined,
  UnorderedListOutlined, BankOutlined, ScanOutlined,
  FileTextOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { Shipment, Quote } from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;

const shippingMethodInfo: Record<string, { label: string; icon: any; color: string }> = {
  self_pickup: { label: '自提', icon: HomeOutlined, color: '#52c41a' },
  express: { label: '快递', icon: TruckOutlined, color: '#1677ff' },
  logistics: { label: '物流', icon: TruckOutlined, color: '#722ed1' },
  delivery: { label: '送货上门', icon: InboxOutlined, color: '#fa8c16' }
};

const statusSteps = [
  { title: '待处理' },
  { title: '已打包' },
  { title: '已发货' },
  { title: '已签收' }
];

const statusInfo: Record<string, { label: string; step: number; color: string }> = {
  pending: { label: '待处理', step: 0, color: 'default' },
  packed: { label: '已打包', step: 1, color: 'processing' },
  shipped: { label: '已发货', step: 2, color: 'blue' },
  delivered: { label: '已签收', step: 3, color: 'success' },
  cancelled: { label: '已取消', step: 0, color: 'error' }
};

export default function ShippingDesk() {
  const shipments = useAppStore(s => s.shipments);
  const parts = useAppStore(s => s.parts);
  const quotes = useAppStore(s => s.quotes);
  const customers = useAppStore(s => s.customers);
  const addShipment = useAppStore(s => s.addShipment);
  const updateShipment = useAppStore(s => s.updateShipment);
  const cancelShipment = useAppStore(s => s.cancelShipment);
  const updatePart = useAppStore(s => s.updatePart);
  const currentUser = useAppStore(s => s.currentUser);
  const { modal } = App.useApp();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [modalState, setModalState] = useState<{ open: boolean; editing?: Shipment; isBackfill?: boolean }>({ open: false });
  const [detailDrawer, setDetailDrawer] = useState<Shipment | null>(null);
  const [printModal, setPrintModal] = useState<{ shipment: Shipment; type: 'self' | 'pack' } | null>(null);
  const [form] = Form.useForm();

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const matchSearch = !searchText ||
        s.shipmentNumber.includes(searchText) ||
        s.customerName.includes(searchText) ||
        s.receiver.includes(searchText) ||
        s.trackingNumber?.includes(searchText);
      const matchTab = activeTab === 'all' || s.status === activeTab;
      return matchSearch && matchTab;
    });
  }, [shipments, searchText, activeTab]);

  const stats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter(s => s.status === 'pending').length;
    const shipped = shipments.filter(s => s.status === 'shipped').length;
    const totalFees = shipments.reduce((s, x) => s + x.totalFees, 0);
    return { total, pending, shipped, totalFees };
  }, [shipments]);

  const acceptedQuotes = quotes.filter(q =>
    q.status === 'accepted' && !shipments.some(s => s.quoteId === q.id)
  );

  const openNewShipment = () => {
    form.resetFields();
    form.setFieldsValue({
      shippingMethod: 'self_pickup',
      logisticsFee: 0,
      woodPackingFee: 0,
      otherFees: 0,
      insuranceFee: 0,
      packages: 1,
      status: 'pending'
    });
    setModalState({ open: true });
  };

  const openEditShipment = (shipment: Shipment, isBackfill: boolean = false) => {
    form.resetFields();
    form.setFieldsValue({
      quoteId: shipment.quoteId,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      shippingMethod: shipment.shippingMethod,
      receiver: shipment.receiver,
      receiverPhone: shipment.receiverPhone,
      receiverAddress: shipment.receiverAddress,
      items: shipment.items.map((item, idx) => ({
        key: `${item.partId}-${idx}`,
        partId: item.partId,
        partName: item.partName,
        sku: item.sku,
        quantity: item.quantity
      })),
      logisticsCompany: shipment.logisticsCompany,
      trackingNumber: shipment.trackingNumber,
      logisticsFee: shipment.logisticsFee || 0,
      woodPackingFee: shipment.woodPackingFee || 0,
      otherFees: shipment.otherFees || 0,
      insuranceFee: shipment.insuranceFee || 0,
      weight: shipment.weight,
      packages: shipment.packages,
      status: shipment.status,
      shippedDate: shipment.shippedDate ? dayjs(shipment.shippedDate) : undefined,
      receivedDate: shipment.receivedDate ? dayjs(shipment.receivedDate) : undefined,
      remark: shipment.remark
    });
    setModalState({ open: true, editing: shipment, isBackfill });
  };

  const openCreateFromQuote = (quote: Quote) => {
    const cust = customers.find(c => c.id === quote.customerId)!;
    form.resetFields();
    form.setFieldsValue({
      quoteId: quote.id,
      customerId: quote.customerId,
      customerName: quote.customerName,
      receiver: cust.contact,
      receiverPhone: cust.phone,
      receiverAddress: cust.address,
      shippingMethod: 'logistics',
      items: quote.items.map(item => ({
        key: item.partId,
        partId: item.partId,
        partName: item.partName,
        sku: item.sku,
        quantity: item.quantity
      })),
      logisticsFee: 0,
      woodPackingFee: 0,
      otherFees: 0,
      insuranceFee: 0,
      packages: 1,
      status: 'pending'
    });
    setModalState({ open: true });
  };

  const submitShipment = () => {
    form.validateFields().then(values => {
      const items = (values.items || []).filter((it: any) => it.partId);
      if (items.length === 0) {
        message.error('请至少添加一个发货项');
        return;
      }
      const data: any = {
        shipmentNumber: modalState.editing ? modalState.editing.shipmentNumber :
          `SH${dayjs().format('YYYYMMDD')}${String(shipments.length + 1).padStart(3, '0')}`,
        quoteId: values.quoteId,
        customerId: values.customerId,
        customerName: values.customerName,
        shippingMethod: values.shippingMethod,
        items: items.map((it: any) => ({
          partId: it.partId,
          partName: it.partName,
          sku: it.sku,
          quantity: it.quantity,
          photos: []
        })),
        receiver: values.receiver,
        receiverPhone: values.receiverPhone,
        receiverAddress: values.receiverAddress,
        trackingNumber: values.trackingNumber,
        logisticsCompany: values.logisticsCompany,
        logisticsFee: values.logisticsFee || 0,
        woodPackingFee: values.woodPackingFee || 0,
        otherFees: values.otherFees || 0,
        totalFees: (values.logisticsFee || 0) + (values.woodPackingFee || 0) + (values.otherFees || 0),
        insuranceFee: values.insuranceFee || 0,
        weight: values.weight,
        packages: values.packages,
        status: values.status,
        shippedDate: values.status === 'shipped' || values.status === 'delivered'
          ? (values.shippedDate || new Date().toISOString())
          : undefined,
        receivedDate: values.status === 'delivered'
          ? (values.receivedDate || new Date().toISOString())
          : undefined,
        operator: currentUser,
        remark: values.remark || ''
      };
      if (modalState.editing) {
        updateShipment(modalState.editing.id, data);
        message.success('发货单已更新');
      } else {
        addShipment(data);
        data.items.forEach((it: any) => {
          updatePart(it.partId, { status: 'shipped' });
        });
        message.success('发货单已创建');
      }
      setModalState({ open: false });
    });
  };

  const shippingItems = Form.useWatch('items', form) || [];

  const updateItem = (key: string, field: string, value: any) => {
    const items = shippingItems.map((it: any) => it.key === key ? { ...it, [field]: value } : it);
    form.setFieldsValue({ items });
  };

  const addItem = () => {
    const items = [...shippingItems, {
      key: Date.now().toString(),
      partId: '', partName: '', sku: '', quantity: 1
    }];
    form.setFieldsValue({ items });
  };

  const removeItem = (key: string) => {
    const items = shippingItems.filter((it: any) => it.key !== key);
    form.setFieldsValue({ items });
  };

  const columns: ColumnsType<Shipment> = [
    {
      title: '发货单号', dataIndex: 'shipmentNumber', width: 150, fixed: 'left',
      render: t => <span className="barcode">{t}</span>
    },
    {
      title: '客户/收货', width: 180,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            {r.receiver} · {r.receiverPhone}
          </div>
        </div>
      )
    },
    {
      title: '发货方式', dataIndex: 'shippingMethod', width: 100,
      render: m => {
        const info = shippingMethodInfo[m];
        const Icon = info.icon;
        return <Tag color={info.color}><Icon /> {info.label}</Tag>;
      }
    },
    {
      title: '配件', width: 120, align: 'center',
      render: (_, r) => {
        const total = r.items.reduce((s, it) => s + it.quantity, 0);
        return <Badge count={`${r.items.length}种/${total}件`} showZero color="#1677ff" />;
      }
    },
    {
      title: '当前进度', width: 250,
      render: (_, r) => (
        <Steps
          size="small"
          current={statusInfo[r.status].step}
          status={r.status === 'cancelled' ? 'error' : undefined}
          style={{ paddingTop: 6 }}
          items={statusSteps}
        />
      )
    },
    {
      title: '物流信息', width: 180,
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          {r.logisticsCompany && <div>🏢 {r.logisticsCompany}</div>}
          {r.trackingNumber && (
            <div style={{ color: '#1677ff', cursor: 'pointer' }}>📦 {r.trackingNumber}</div>
          )}
          {r.shippedDate && <div style={{ color: '#8c8c8c' }}>{dayjs(r.shippedDate).format('MM-DD HH:mm')}</div>}
        </div>
      )
    },
    {
      title: '费用', width: 120, align: 'right',
      render: (_, r) => <strong style={{ color: '#cf1322' }}>¥{r.totalFees}</strong>
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: s => <Tag color={statusInfo[s].color}>{statusInfo[s].label}</Tag>
    },
    {
      title: '操作', key: 'action', width: 260, fixed: 'right',
      render: (_, r) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => setDetailDrawer(r)}>详情</Button>
          {r.status !== 'delivered' && r.status !== 'cancelled' && (
            <Button type="link" size="small" onClick={() => {
              openEditShipment(r, true);
            }}>回填物流</Button>
          )}
          {r.shippingMethod === 'self_pickup' ? (
            <Button type="link" size="small" icon={<PrinterOutlined />}
              onClick={() => setPrintModal({ shipment: r, type: 'self' })}>
              自提单
            </Button>
          ) : (
            <Button type="link" size="small" icon={<PrinterOutlined />}
              onClick={() => setPrintModal({ shipment: r, type: 'pack' })}>
              打包清单
            </Button>
          )}
          {r.status === 'pending' && (
            <Button type="primary" size="small" onClick={() => {
              updateShipment(r.id, { status: 'packed' });
              message.success('已标记为已打包');
            }}>已打包</Button>
          )}
          {r.status === 'packed' && (
            <Button type="primary" size="small" onClick={() => {
              updateShipment(r.id, { status: 'shipped', shippedDate: new Date().toISOString() });
              message.success('已发货');
            }}>已发货</Button>
          )}
          {r.status === 'shipped' && (
            <Button type="link" size="small" onClick={() => {
              modal.confirm({
                title: '确认签收？',
                onOk: () => {
                  updateShipment(r.id, { status: 'delivered', receivedDate: new Date().toISOString() });
                  message.success('已确认签收');
                }
              });
            }}>已签收</Button>
          )}
          {r.status !== 'delivered' && r.status !== 'cancelled' && (
            <Button type="link" size="small" danger onClick={() => {
              modal.confirm({
                title: '作废此发货单？',
                content: '作废后相关配件将自动恢复为可售状态',
                okText: '确认作废',
                cancelText: '再想想',
                onOk: () => {
                  cancelShipment(r.id);
                  message.success('发货单已作废，配件已释放回库存');
                }
              });
            }}>作废</Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="tab-panel">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon primary"><UnorderedListOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">累计发货单</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-sub">本月 3 单</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><FileTextOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">待处理</div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-sub">待打包/发货</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><TruckOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">运输中</div>
            <div className="stat-value">{stats.shipped}</div>
            <div className="stat-sub">等待签收</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><BankOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">物流费用</div>
            <div className="stat-value" style={{ color: '#722ed1' }}>¥{stats.totalFees}</div>
            <div className="stat-sub">累计发生费用</div>
          </div>
        </div>
      </div>

      {acceptedQuotes.length > 0 && (
        <Card
          size="small"
          className="filter-card"
          style={{ borderColor: '#1677ff', background: '#e6f4ff' }}
          title={`💡 有 ${acceptedQuotes.length} 单已成交的报价等待发货`}
          extra={
            <Space>
              {acceptedQuotes.slice(0, 3).map(q => (
                <Button key={q.id} size="small" type="primary"
                  onClick={() => openCreateFromQuote(q)}>
                  从 {q.quoteNumber} 创建
                </Button>
              ))}
              {acceptedQuotes.length > 3 && <span>+{acceptedQuotes.length - 3}</span>}
            </Space>
          }
        />
      )}

      <Card size="small" className="filter-card">
        <Row gutter={16} align="middle">
          <Col>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="单号/客户/收件人/运单号"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
          </Col>
          <Col flex="auto" />
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNewShipment}>
              新建发货单
            </Button>
          </Col>
        </Row>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          style={{ marginTop: 12, marginBottom: -12 }}
          items={[
            { key: 'all', label: `全部 (${shipments.length})` },
            { key: 'pending', label: `待处理 (${shipments.filter(s => s.status === 'pending').length})` },
            { key: 'packed', label: `已打包 (${shipments.filter(s => s.status === 'packed').length})` },
            { key: 'shipped', label: `运输中 (${shipments.filter(s => s.status === 'shipped').length})` },
            { key: 'delivered', label: `已签收 (${shipments.filter(s => s.status === 'delivered').length})` }
          ]}
        />
      </Card>

      <Table
        columns={columns}
        dataSource={filteredShipments}
        rowKey="id"
        size="middle"
        scroll={{ x: 1500 }}
        pagination={{
          pageSize: 10, showSizeChanger: true,
          showTotal: t => `共 ${t} 张发货单`
        }}
      />

      <Modal
        title={modalState.isBackfill
          ? `📦 回填物流信息 - ${modalState.editing?.shipmentNumber}`
          : modalState.editing
            ? `编辑发货单 - ${modalState.editing.shipmentNumber}`
            : '新建发货单'}
        open={modalState.open}
        onCancel={() => setModalState({ open: false })}
        onOk={submitShipment}
        width={1000}
        okText="保存发货单"
        destroyOnClose
      >
        {modalState.isBackfill && modalState.editing && (
          <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff', borderColor: '#91d5ff' }}>
            <Row gutter={16}>
              <Col span={8}>
                <strong>客户：</strong>{modalState.editing.customerName}
              </Col>
              <Col span={8}>
                <strong>收件人：</strong>{modalState.editing.receiver} · {modalState.editing.receiverPhone}
              </Col>
              <Col span={8}>
                <strong>配件数：</strong>{modalState.editing.items.length} 种 / {modalState.editing.items.reduce((s, i) => s + i.quantity, 0)} 件
              </Col>
            </Row>
            <div style={{ marginTop: 8, fontSize: 12, color: '#1677ff' }}>
              💡 以下客户和配件信息已自动带出，请补充物流信息和费用即可
            </div>
          </Card>
        )}
        <Form form={form} layout="vertical">
          <div className="detail-section-title">基础信息</div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="customerName" label="客户名称" rules={[{ required: true }]}>
                <Select
                  showSearch optionFilterProp="children"
                  placeholder="选择客户"
                  disabled={!!modalState.editing}
                  onChange={(val, opt: any) => {
                    const c = customers.find(x => x.name === val);
                    if (c) {
                      form.setFieldsValue({
                        customerId: c.id,
                        receiver: c.contact,
                        receiverPhone: c.phone,
                        receiverAddress: c.address
                      });
                    }
                  }}
                >
                  {customers.map(c => <Option key={c.id} value={c.name}>{c.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="customerId" hidden><Input /></Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="shippingMethod" label="发货方式" rules={[{ required: true }]}>
                <Select disabled={!!modalState.editing}>
                  {Object.entries(shippingMethodInfo).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="status" label="当前状态">
                <Select>
                  {Object.entries(statusInfo).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="quoteId" label="关联报价单">
                <Select allowClear placeholder="选填" disabled={!!modalState.editing}>
                  {quotes.map(q => (
                    <Option key={q.id} value={q.id}>{q.quoteNumber} - ¥{q.finalAmount}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="detail-section-title">收货信息</div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="receiver" label="收件人" rules={[{ required: true }]}>
                <Input disabled={!!modalState.editing} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="receiverPhone" label="联系电话" rules={[{ required: true }]}>
                <Input disabled={!!modalState.editing} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="receiverAddress" label="收件地址" rules={[{ required: true }]}>
                <Input disabled={!!modalState.editing} />
              </Form.Item>
            </Col>
          </Row>

          <div className="detail-section-title">发货配件</div>
          <Table
            size="small"
            pagination={false}
            dataSource={shippingItems}
            rowKey="key"
            columns={[
              {
                title: '选择配件 *', width: 280,
                render: (_, r: any) => (
                  <Select
                    showSearch size="small"
                    placeholder="搜索/SKU/名称"
                    value={r.partId || undefined}
                    style={{ width: '100%' }}
                    disabled={!!modalState.editing}
                    onChange={(v) => {
                      const part = parts.find(p => p.id === v);
                      if (part) {
                        updateItem(r.key, 'partId', part.id);
                        updateItem(r.key, 'partName', part.name);
                        updateItem(r.key, 'sku', part.sku);
                      }
                    }}
                    optionFilterProp="children"
                  >
                    {parts.filter(p => p.status === 'in_stock' || p.status === 'sold').map(p => (
                      <Option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} - {p.brand}{p.carModel} ({p.status === 'in_stock' ? '在库' : '已售'})
                      </Option>
                    ))}
                  </Select>
                )
              },
              { title: 'SKU', dataIndex: 'sku', width: 160, render: (_, r: any) => r.sku },
              {
                title: '数量', width: 90,
                render: (_, r: any) => (
                  <InputNumber min={1} size="small" value={r.quantity}
                    disabled={!!modalState.editing}
                    onChange={v => updateItem(r.key, 'quantity', v || 1)}
                    style={{ width: '100%' }} />
                )
              },
              {
                title: '', width: 50, align: 'center',
                render: (_, r: any) => !modalState.editing ? (
                  <Button type="text" danger size="small" onClick={() => removeItem(r.key)}>删除</Button>
                ) : null
              }
            ]}
          />
          {!modalState.editing && (
            <Button type="dashed" block size="small" style={{ marginTop: 8 }} onClick={addItem}>
              + 添加一行
            </Button>
          )}

          <div className="detail-section-title" style={{ marginTop: 16 }}>
            {modalState.isBackfill ? (
              <span style={{ color: '#1677ff' }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                物流信息回填 <span style={{ fontSize: 12, fontWeight: 400 }}>（以下为必填项）</span>
              </span>
            ) : '物流信息回填'}
          </div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="logisticsCompany"
                label={
                  <span className={modalState.isBackfill ? 'required-field-label' : ''}>
                    物流公司 {modalState.isBackfill && <span style={{ color: '#ff4d4f' }}>*</span>}
                  </span>
                }
              >
                <Select allowClear showSearch>
                  {['顺丰', '德邦', '安能', '中通', '圆通', '京东物流', '壹米滴答', '天地华宇'].map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="trackingNumber"
                label={
                  <span className={modalState.isBackfill ? 'required-field-label' : ''}>
                    运单号 {modalState.isBackfill && <span style={{ color: '#ff4d4f' }}>*</span>}
                  </span>
                }
              >
                <Input prefix={<ScanOutlined />} placeholder="扫描或输入运单号" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weight" label="总重量(kg)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="packages" label="件数">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="logisticsFee"
                label={
                  <span className={modalState.isBackfill ? 'required-field-label' : ''}>
                    运费(¥) {modalState.isBackfill && <span style={{ color: '#ff4d4f' }}>*</span>}
                  </span>
                }
              >
                <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="woodPackingFee"
                label={
                  <span className={modalState.isBackfill ? 'required-field-label' : ''}>
                    打木架(¥) {modalState.isBackfill && <span style={{ color: '#ff4d4f' }}>*</span>}
                  </span>
                }
              >
                <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="insuranceFee" label="保价费(¥)">
                <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="otherFees" label="其他费用(¥)">
                <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remark" label="备注"><Input /></Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="shippedDate" label="发货日期">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receivedDate" label="签收日期">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={`发货单详情 - ${detailDrawer?.shipmentNumber}`}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={720}
        extra={
          <Space>
            {detailDrawer?.shippingMethod === 'self_pickup' ? (
              <Button onClick={() => setPrintModal({ shipment: detailDrawer!, type: 'self' })}>打印自提单</Button>
            ) : (
              <Button onClick={() => setPrintModal({ shipment: detailDrawer!, type: 'pack' })}>打印打包清单</Button>
            )}
            <Button type="primary" onClick={() => { setDetailDrawer(null); openEditShipment(detailDrawer!, false); }}>
              编辑
            </Button>
          </Space>
        }
      >
        {detailDrawer && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Steps
                current={statusInfo[detailDrawer.status].step}
                size="small"
                status={detailDrawer.status === 'cancelled' ? 'error' : undefined}
                items={statusSteps}
              />
            </Card>

            <div className="detail-section">
              <div className="detail-section-title">基本信息</div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="发货单号">{detailDrawer.shipmentNumber}</Descriptions.Item>
                <Descriptions.Item label="关联报价">{detailDrawer.quoteId || '-'}</Descriptions.Item>
                <Descriptions.Item label="客户">{detailDrawer.customerName}</Descriptions.Item>
                <Descriptions.Item label="发货方式">
                  {shippingMethodInfo[detailDrawer.shippingMethod].label}
                </Descriptions.Item>
                <Descriptions.Item label="收件人">{detailDrawer.receiver}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{detailDrawer.receiverPhone}</Descriptions.Item>
                <Descriptions.Item label="收件地址" span={2}>{detailDrawer.receiverAddress}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">发货清单 ({detailDrawer.items.reduce((s, i) => s + i.quantity, 0)}件)</div>
              <Table
                size="small"
                pagination={false}
                dataSource={detailDrawer.items}
                rowKey="partId"
                columns={[
                  { title: 'SKU', dataIndex: 'sku', width: 160 },
                  { title: '配件名称', dataIndex: 'partName' },
                  { title: '数量', dataIndex: 'quantity', width: 60, align: 'center' }
                ]}
              />
            </div>

            <div className="detail-section">
              <div className="detail-section-title">物流信息</div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="物流公司">{detailDrawer.logisticsCompany || '-'}</Descriptions.Item>
                <Descriptions.Item label="运单号">{detailDrawer.trackingNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="总重量">{detailDrawer.weight ? `${detailDrawer.weight}kg` : '-'}</Descriptions.Item>
                <Descriptions.Item label="件数">{detailDrawer.packages}件</Descriptions.Item>
                <Descriptions.Item label="发货日期">
                  {detailDrawer.shippedDate ? dayjs(detailDrawer.shippedDate).format('YYYY-MM-DD HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="签收日期">
                  {detailDrawer.receivedDate ? dayjs(detailDrawer.receivedDate).format('YYYY-MM-DD HH:mm') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">费用明细</div>
              <Card size="small">
                <Row gutter={16}>
                  <Col span={6}>运费: ¥{detailDrawer.logisticsFee}</Col>
                  <Col span={6}>打木架: ¥{detailDrawer.woodPackingFee}</Col>
                  <Col span={6}>保价费: ¥{detailDrawer.insuranceFee}</Col>
                  <Col span={6}>其他: ¥{detailDrawer.otherFees}</Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row>
                  <Col span={12} />
                  <Col span={12} style={{ textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#cf1322' }}>
                    费用合计: ¥{detailDrawer.totalFees}
                  </Col>
                </Row>
              </Card>
            </div>
          </>
        )}
      </Drawer>

      <Modal
        title={printModal?.type === 'self' ? '📝 自提单' : '📦 打包发货清单'}
        open={!!printModal}
        onCancel={() => setPrintModal(null)}
        width={900}
        okText="打印"
        onOk={() => window.print()}
      >
        {printModal && (
          <div className="print-content" id="print-area">
            <div className="print-header">
              <h1>{printModal.type === 'self' ? '🏢 拆车场配件自提单' : '📦 发货打包清单'}</h1>
              <div style={{ marginTop: 6, color: '#666' }}>单号: {printModal.shipment.shipmentNumber}</div>
            </div>

            <Row gutter={24} style={{ marginBottom: 20 }}>
              <Col span={12}>
                <p><strong>客户名称：</strong>{printModal.shipment.customerName}</p>
                <p><strong>收件人：</strong>{printModal.shipment.receiver}</p>
                <p><strong>联系电话：</strong>{printModal.shipment.receiverPhone}</p>
              </Col>
              <Col span={12}>
                <p><strong>日期：</strong>{dayjs().format('YYYY年MM月DD日')}</p>
                <p><strong>方式：</strong>{shippingMethodInfo[printModal.shipment.shippingMethod].label}</p>
                {printModal.shipment.shippingMethod !== 'self_pickup' && (
                  <p><strong>地址：</strong>{printModal.shipment.receiverAddress}</p>
                )}
              </Col>
            </Row>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>序号</th>
                  <th>SKU编码</th>
                  <th>配件名称</th>
                  <th style={{ width: 80 }}>数量</th>
                  <th style={{ width: 100 }}>备注</th>
                </tr>
              </thead>
              <tbody>
                {printModal.shipment.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{item.sku}</td>
                    <td>{item.partName}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {printModal.shipment.shippingMethod !== 'self_pickup' && (
              <Row gutter={24} style={{ marginTop: 20 }}>
                <Col span={8}>物流公司: <strong>{printModal.shipment.logisticsCompany || '-'}</strong></Col>
                <Col span={8}>运单号: <strong>{printModal.shipment.trackingNumber || '-'}</strong></Col>
                <Col span={8}>合计件数: <strong>{printModal.shipment.packages}件</strong></Col>
              </Row>
            )}

            <div className="print-footer">
              <div>
                <p>📞 客服电话：400-XXX-XXXX</p>
                <p>📍 仓库地址：XX市XX区XX路XX号拆车场</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {printModal.type === 'self' ? (
                  <>
                    <p>经办人签字：__________________</p>
                    <p style={{ marginTop: 30 }}>
                      客户签字：__________________
                      <QRCode value={printModal.shipment.shipmentNumber} size={60}
                        style={{ display: 'inline-block', marginLeft: 30, verticalAlign: 'middle' }} />
                    </p>
                  </>
                ) : (
                  <>
                    <p>打包员：__________________</p>
                    <p style={{ marginTop: 10 }}>司机签字：__________________</p>
                    <p style={{ marginTop: 30 }}>
                      客户签收：__________________
                      <QRCode value={printModal.shipment.trackingNumber || printModal.shipment.shipmentNumber}
                        size={60} style={{ display: 'inline-block', marginLeft: 30, verticalAlign: 'middle' }} />
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
