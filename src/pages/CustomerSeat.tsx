import { useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Modal, Form,
  InputNumber, Divider, Row, Col, message, Drawer, Descriptions,
  Avatar, Badge, Statistic, List, Popconfirm, Tabs, Switch, Tooltip,
  Timeline, Empty
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  PhoneOutlined, WechatOutlined, CrownOutlined,
  RiseOutlined, GiftOutlined, SafetyCertificateOutlined,
  StarOutlined, TeamOutlined, UserOutlined, HeartOutlined,
  SettingOutlined, CheckOutlined, StopOutlined, BarChartOutlined,
  HistoryOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { Customer, Quote, PricingStrategy, CustomerType, PartCondition } from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const typeInfo: Record<string, { label: string; color: string; icon: string }> = {
  repair_shop: { label: '维修厂', color: '#1677ff', icon: '🔧' },
  individual: { label: '个人客户', color: '#52c41a', icon: '👤' },
  dealer: { label: '批发商', color: '#722ed1', icon: '🏭' },
  insurance: { label: '保险公司', color: '#fa8c16', icon: '🛡️' },
  export: { label: '出口商', color: '#13c2c2', icon: '🌏' }
};

const statusInfo: Record<string, { label: string; color: string }> = {
  active: { label: '合作中', color: 'success' },
  inactive: { label: '暂停', color: 'default' },
  blacklist: { label: '黑名单', color: 'error' }
};

const partCategories = ['发动机', '变速箱', '底盘', '电器', '灯光', '车身', '车门', '内饰', '轮毂', '其他'];

export default function CustomerSeat() {
  const customers = useAppStore(s => s.customers);
  const quotes = useAppStore(s => s.quotes);
  const pricingStrategies = useAppStore(s => s.pricingStrategies);
  const addCustomer = useAppStore(s => s.addCustomer);
  const updateCustomer = useAppStore(s => s.updateCustomer);
  const deleteCustomer = useAppStore(s => s.deleteCustomer);
  const addPricingStrategy = useAppStore(s => s.addPricingStrategy);
  const updatePricingStrategy = useAppStore(s => s.updatePricingStrategy);
  const togglePricingStrategyStatus = useAppStore(s => s.togglePricingStrategyStatus);
  const deletePricingStrategy = useAppStore(s => s.deletePricingStrategy);
  const calculatePrice = useAppStore(s => s.calculatePrice);

  const [activeTab, setActiveTab] = useState('customers');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>();
  const [modal, setModal] = useState<{ open: boolean; editing?: Customer }>({ open: false });
  const [strategyModal, setStrategyModal] = useState<{ open: boolean; editing?: PricingStrategy }>({ open: false });
  const [detailDrawer, setDetailDrawer] = useState<Customer | null>(null);
  const [strategyHistoryDrawer, setStrategyHistoryDrawer] = useState<PricingStrategy | null>(null);
  const [form] = Form.useForm();
  const [strategyForm] = Form.useForm();
  const [strategyTypeFilter, setStrategyTypeFilter] = useState<string>();

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = !searchText ||
        c.name.includes(searchText) || c.contact.includes(searchText) ||
        c.phone.includes(searchText) || c.wechat.includes(searchText);
      const matchType = !typeFilter || c.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [customers, searchText, typeFilter]);

  const filteredStrategies = useMemo(() => {
    return pricingStrategies.filter(s => {
      const matchType = !strategyTypeFilter || s.customerType === strategyTypeFilter;
      return matchType;
    });
  }, [pricingStrategies, strategyTypeFilter]);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    customers.forEach(c => {
      byType[c.type] = (byType[c.type] || 0) + 1;
    });
    const active = customers.filter(c => c.status === 'active').length;
    const totalDeal = quotes.filter(q => q.status === 'accepted')
      .reduce((s, q) => s + (q.acceptedPrice || q.finalAmount), 0);
    return { byType, active, totalDeal };
  }, [customers, quotes]);

  const strategyStats = useMemo(() => {
    const active = pricingStrategies.filter(s => s.status === 'active').length;
    const byType: Record<string, number> = {};
    pricingStrategies.forEach(s => {
      byType[s.customerType] = (byType[s.customerType] || 0) + 1;
    });
    return { total: pricingStrategies.length, active, byType };
  }, [pricingStrategies]);

  const openModal = (customer?: Customer) => {
    if (customer) {
      form.setFieldsValue(customer);
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'active',
        discountRate: 0,
        creditLimit: 0
      });
    }
    setModal({ open: true, editing: customer });
  };

  const submit = () => {
    form.validateFields().then(values => {
      if (modal.editing) {
        updateCustomer(modal.editing.id, values);
        message.success('客户信息已更新');
      } else {
        addCustomer(values);
        message.success('客户已添加');
      }
      setModal({ open: false });
    });
  };

  const openStrategyModal = (strategy?: PricingStrategy) => {
    if (strategy) {
      strategyForm.setFieldsValue(strategy);
    } else {
      strategyForm.resetFields();
      strategyForm.setFieldsValue({
        customerType: 'repair_shop',
        markupRate: 50,
        discountRate: 10,
        status: 'active'
      });
    }
    setStrategyModal({ open: true, editing: strategy });
  };

  const submitStrategy = () => {
    strategyForm.validateFields().then(values => {
      if (strategyModal.editing) {
        updatePricingStrategy(strategyModal.editing.id, values);
        message.success('报价策略已更新');
      } else {
        addPricingStrategy(values);
        message.success('报价策略已添加');
      }
      setStrategyModal({ open: false });
    });
  };

  const toggleStrategyStatus = (id: string, currentStatus: 'active' | 'inactive') => {
    togglePricingStrategyStatus(id);
    message.success(currentStatus === 'active' ? '策略已停用' : '策略已启用');
  };

  const getCustomerStats = (customerId: string) => {
    const customerQuotes = quotes.filter(q => q.customerId === customerId);
    const totalQuotes = customerQuotes.length;
    const accepted = customerQuotes.filter(q => q.status === 'accepted');
    const totalAmount = accepted.reduce((s, q) => s + (q.acceptedPrice || q.finalAmount), 0);
    const conversion = totalQuotes ? Math.round(accepted.length / totalQuotes * 100) : 0;
    const firstDeal = customerQuotes.length > 0
      ? dayjs(customerQuotes[customerQuotes.length - 1].createdAt).format('YYYY-MM-DD')
      : '-';
    return { totalQuotes, acceptedCount: accepted.length, totalAmount, conversion, firstDeal, history: customerQuotes };
  };

  const customerColumns: ColumnsType<Customer> = [
    {
      title: '客户名称', dataIndex: 'name', width: 200, fixed: 'left',
      render: (t, r) => {
        const custStats = getCustomerStats(r.id);
        const isBig = custStats.totalAmount >= 50000;
        return (
          <Space>
            <Avatar
              style={{ background: typeInfo[r.type].color }}
              icon={<UserOutlined />}
            />
            <div>
              <div style={{ fontWeight: 600 }}>
                {t} {isBig && <CrownOutlined style={{ color: '#faad14' }} />}
              </div>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                联系人: {r.contact}
              </div>
            </div>
          </Space>
        );
      }
    },
    {
      title: '类型', dataIndex: 'type', width: 110,
      render: t => (
        <Tag color={typeInfo[t].color} style={{ padding: '4px 10px' }}>
          {typeInfo[t].icon} {typeInfo[t].label}
        </Tag>
      )
    },
    {
      title: '联系方式', width: 220,
      render: (_, r) => (
        <div style={{ fontSize: 13 }}>
          <div><PhoneOutlined style={{ color: '#52c41a' }} /> {r.phone}</div>
          {r.wechat && <div><WechatOutlined style={{ color: '#07c160' }} /> {r.wechat}</div>}
        </div>
      )
    },
    {
      title: '地址', dataIndex: 'address', width: 200, ellipsis: true
    },
    {
      title: '折扣/账期', width: 160,
      render: (_, r) => (
        <div style={{ fontSize: 13 }}>
          <div><GiftOutlined style={{ color: '#eb2f96' }} /> 折扣: {r.discountRate}%</div>
          <div>💰 额度: ¥{r.creditLimit.toLocaleString()}</div>
          <div>📋 付款: {r.paymentTerms}</div>
        </div>
      )
    },
    {
      title: '交易统计', width: 160,
      render: (_, r) => {
        const s = getCustomerStats(r.id);
        return (
          <div style={{ fontSize: 13 }}>
            <div>报价: {s.totalQuotes}次 / 成交: {s.acceptedCount}次</div>
            <div style={{ color: s.conversion >= 50 ? '#52c41a' : '#8c8c8c' }}>
              成交率: {s.conversion}%
            </div>
            <div className="price-highlight">累计: ¥{s.totalAmount.toLocaleString()}</div>
          </div>
        );
      }
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: s => <Tag color={statusInfo[s].color}>{statusInfo[s].label}</Tag>
    },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => setDetailDrawer(r)}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(r)}>编辑</Button>
          <Popconfirm
            title="确认删除该客户？"
            onConfirm={() => { deleteCustomer(r.id); message.success('已删除'); }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const strategyColumns: ColumnsType<PricingStrategy> = [
    {
      title: '适用客户', dataIndex: 'customerType', width: 120,
      render: t => (
        <Tag color={typeInfo[t]?.color || '#8c8c8c'} style={{ padding: '4px 10px' }}>
          {typeInfo[t]?.icon} {typeInfo[t]?.label}
        </Tag>
      )
    },
    {
      title: '适用品类', dataIndex: 'partCategory', width: 120,
      render: t => t || <Tag color="default">全部品类</Tag>
    },
    {
      title: '适用成色', dataIndex: 'condition', width: 100,
      render: t => t ? (
        <Tag color={({ A: 'green', B: 'blue', C: 'orange' } as any)[t] || 'default'}>
          {t}级
        </Tag>
      ) : <Tag color="default">全部成色</Tag>
    },
    {
      title: '加价率', dataIndex: 'markupRate', width: 100,
      render: t => <span style={{ color: '#fa8c16', fontWeight: 600 }}>+{t}%</span>
    },
    {
      title: '折扣率', dataIndex: 'discountRate', width: 100,
      render: t => <span style={{ color: '#52c41a', fontWeight: 600 }}>-{t}%</span>
    },
    {
      title: '实际报价', width: 180,
      render: (_, r) => {
        const demoBase = 10000;
        const demoPrice = calculatePrice(demoBase, r.customerType, r.partCategory || '', r.condition || '');
        const effectiveRate = Math.round((demoPrice / demoBase - 1) * 100);
        return (
          <div style={{ fontSize: 13 }}>
            <div>示例: ¥{demoBase} → <span className="price-highlight">¥{demoPrice}</span></div>
            <div style={{ color: effectiveRate >= 0 ? '#fa8c16' : '#52c41a' }}>
              综合倍率: {effectiveRate >= 0 ? '+' : ''}{effectiveRate}%
            </div>
          </div>
        );
      }
    },
    {
      title: '说明', dataIndex: 'description', ellipsis: true
    },
    {
      title: '生效时间', dataIndex: 'effectiveDate', width: 110,
      render: d => d ? dayjs(d).format('YYYY-MM-DD') : '-'
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s, r) => (
        <Tooltip title={s === 'active' ? '点击停用' : '点击启用'}>
          <Switch
            checked={s === 'active'}
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<StopOutlined />}
            onChange={() => toggleStrategyStatus(r.id, s)}
          />
        </Tooltip>
      )
    },
    {
      title: '操作', key: 'action', width: 200, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openStrategyModal(r)}>编辑</Button>
          <Button type="link" size="small" icon={<HistoryOutlined />} onClick={() => setStrategyHistoryDrawer(r)}>变更记录</Button>
          <Popconfirm
            title="确认删除该策略？"
            onConfirm={() => { deletePricingStrategy(r.id); message.success('已删除'); }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const customerTabContent = (
    <>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon primary"><TeamOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">客户总数</div>
            <div className="stat-value">{customers.length}</div>
            <div className="stat-sub">活跃 {stats.active}</div>
          </div>
        </div>
        {Object.entries(typeInfo).slice(0, 3).map(([k, v]) => (
          <div className="stat-card" key={k} onClick={() => setTypeFilter(k)} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: v.color + '22', color: v.color }}>
              <span style={{ fontSize: 24 }}>{v.icon}</span>
            </div>
            <div className="stat-content">
              <div className="stat-label" style={{ color: v.color }}>{v.label}</div>
              <div className="stat-value" style={{ color: v.color }}>{stats.byType[k] || 0}</div>
              <div className="stat-sub">点击筛选</div>
            </div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-icon cyan"><RiseOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">累计成交金额</div>
            <div className="stat-value" style={{ color: '#13c2c2' }}>¥{stats.totalDeal.toLocaleString()}</div>
            <div className="stat-sub">全部历史成交</div>
          </div>
        </div>
      </div>

      <Card size="small" className="filter-card">
        <Row gutter={16} align="middle">
          <Col>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="客户名称/联系人/电话/微信"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="客户类型"
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 140 }}
            >
              {Object.entries(typeInfo).map(([k, v]) => (
                <Option key={k} value={k}>{v.icon} {v.label}</Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto" />
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新增客户
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={customerColumns}
        dataSource={filteredCustomers}
        rowKey="id"
        size="middle"
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 10, showSizeChanger: true,
          showTotal: t => `共 ${t} 位客户`
        }}
      />
    </>
  );

  const strategyTabContent = (
    <>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon primary"><BarChartOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">策略总数</div>
            <div className="stat-value">{strategyStats.total}</div>
            <div className="stat-sub">启用中 {strategyStats.active}</div>
          </div>
        </div>
        {Object.entries(typeInfo).slice(0, 4).map(([k, v]) => (
          <div className="stat-card" key={k} onClick={() => setStrategyTypeFilter(k)} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: v.color + '22', color: v.color }}>
              <span style={{ fontSize: 24 }}>{v.icon}</span>
            </div>
            <div className="stat-content">
              <div className="stat-label" style={{ color: v.color }}>{v.label}策略</div>
              <div className="stat-value" style={{ color: v.color }}>{strategyStats.byType[k] || 0}</div>
              <div className="stat-sub">点击筛选</div>
            </div>
          </div>
        ))}
      </div>

      <Card size="small" className="filter-card">
        <Row gutter={16} align="middle">
          <Col>
            <Select
              allowClear
              placeholder="适用客户类型"
              value={strategyTypeFilter}
              onChange={setStrategyTypeFilter}
              style={{ width: 200 }}
            >
              {Object.entries(typeInfo).map(([k, v]) => (
                <Option key={k} value={k}>{v.icon} {v.label}</Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto">
            <span style={{ color: '#8c8c8c', fontSize: 13 }}>
              <SafetyCertificateOutlined style={{ marginRight: 4, color: '#1677ff' }} />
              报价台选客户后，系统自动按匹配度最高的策略算价。匹配优先级：客户类型 + 配件品类 + 成色 {'>>'} 客户类型 + 配件品类 {'>>'} 客户类型
            </span>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openStrategyModal()}>
              新增策略
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={strategyColumns}
        dataSource={filteredStrategies}
        rowKey="id"
        size="middle"
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 10, showSizeChanger: true,
          showTotal: t => `共 ${t} 条策略`
        }}
      />

      <Card size="small" style={{ marginTop: 16 }}>
        <div style={{ color: '#8c8c8c', fontSize: 13, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: '#262626', marginBottom: 8 }}>
            <SettingOutlined style={{ marginRight: 4 }} /> 报价规则说明
          </div>
          <div>• <b>加价率</b>：基于配件底价上浮的比例，如加价50%表示底价10000元的配件报价15000元</div>
          <div>• <b>折扣率</b>：给客户的优惠折扣，如折扣10%表示报价再打9折</div>
          <div>• <b>匹配逻辑</b>：系统按"客户类型+品类+成色"最精确匹配，越具体优先级越高</div>
          <div>• <b>示例计算</b>：底价10000元 + 加价50% = 15000元 - 折扣10% = 13500元（最终报价）</div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="tab-panel">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'customers', label: <Space><TeamOutlined />客户管理</Space>, children: customerTabContent },
          { key: 'strategies', label: <Space><SettingOutlined />报价策略</Space>, children: strategyTabContent }
        ]}
      />

      <Modal
        title={modal.editing ? '编辑客户' : '新增客户'}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        onOk={submit}
        width={800}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <div className="detail-section-title" style={{ marginBottom: 12 }}>基本信息</div>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="name" label="客户名称" rules={[{ required: true }]}>
                <Input placeholder="公司名/个人姓名" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="type" label="客户类型" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(typeInfo).map(([k, v]) => (
                    <Option key={k} value={k}>{v.icon} {v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contact" label="联系人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label="联系电话" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="wechat" label="微信号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="address" label="地址">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="taxNumber" label="税号">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <div className="detail-section-title" style={{ margin: '8px 0 12px' }}>交易条款</div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="creditLimit" label="信用额度(¥)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="discountRate" label="默认折扣(%)">
                <InputNumber style={{ width: '100%' }} min={0} max={90} suffix="%" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentTerms" label="付款方式">
                <Select>
                  <Option value="款到发货">款到发货</Option>
                  <Option value="货到付款">货到付款</Option>
                  <Option value="月结30天">月结30天</Option>
                  <Option value="月结45天">月结45天</Option>
                  <Option value="月结60天">月结60天</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="preferredBrand" label="主营/偏好品牌（选填）">
            <Select mode="tags" placeholder="输入品牌名后回车" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="客户状态">
                <Select>
                  {Object.entries(statusInfo).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="备注">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={strategyModal.editing ? '编辑报价策略' : '新增报价策略'}
        open={strategyModal.open}
        onCancel={() => setStrategyModal({ open: false })}
        onOk={submitStrategy}
        width={700}
        okText="保存"
      >
        <Form form={strategyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerType" label="适用客户类型" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(typeInfo).map(([k, v]) => (
                    <Option key={k} value={k}>{v.icon} {v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select>
                  <Option value="active"><CheckOutlined /> 启用</Option>
                  <Option value="inactive"><StopOutlined /> 停用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="partCategory" label="适用配件品类（选填）">
                <Select allowClear placeholder="不填则适用于所有品类">
                  {partCategories.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="condition" label="适用成色（选填）">
                <Select allowClear placeholder="不填则适用于所有成色">
                  <Option value="A">A级 - 准新件</Option>
                  <Option value="B">B级 - 优良件</Option>
                  <Option value="C">C级 - 瑕疵件</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="markupRate" label="加价率(%)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={200} suffix="%" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountRate" label="折扣率(%)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={50} suffix="%" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="策略说明">
            <Input placeholder="如：维修厂发动机件高量折扣" />
          </Form.Item>

          <Card size="small" style={{ background: '#fafafa' }}>
            <div style={{ fontSize: 13, color: '#8c8c8c' }}>
              <div style={{ marginBottom: 8 }}><b>实时预览</b>（以底价 ¥10,000 为例）</div>
              {strategyForm.getFieldsValue().customerType && (
                <div>
                  最终报价：<span className="price-highlight" style={{ fontSize: 18 }}>
                    ¥{calculatePrice(
                      10000,
                      strategyForm.getFieldsValue().customerType,
                      strategyForm.getFieldsValue().partCategory || '',
                      strategyForm.getFieldsValue().condition || ''
                    ).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </Form>
      </Modal>

      <Drawer
        title={`客户详情 - ${detailDrawer?.name}`}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={800}
        extra={
          <Space>
            <Button type="primary" onClick={() => { setDetailDrawer(null); openModal(detailDrawer!); }}>
              <EditOutlined /> 编辑
            </Button>
          </Space>
        }
      >
        {detailDrawer && (
          <>
            {(() => {
              const custStats = getCustomerStats(detailDrawer.id);
              return (
                <>
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={16} align="middle">
                      <Col>
                        <Avatar
                          size={64}
                          style={{ background: typeInfo[detailDrawer.type].color, fontSize: 28 }}
                          icon={<UserOutlined />}
                        />
                      </Col>
                      <Col flex="auto">
                        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>
                          {detailDrawer.name}
                          {custStats.totalAmount >= 50000 && (
                            <Tag color="gold" style={{ marginLeft: 8 }}>
                              <CrownOutlined /> VIP客户
                            </Tag>
                          )}
                        </div>
                        <Space>
                          <Tag color={typeInfo[detailDrawer.type].color}>
                            {typeInfo[detailDrawer.type].icon} {typeInfo[detailDrawer.type].label}
                          </Tag>
                          <Tag color={statusInfo[detailDrawer.status].color}>
                            {statusInfo[detailDrawer.status].label}
                          </Tag>
                        </Space>
                      </Col>
                    </Row>
                  </Card>

                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small"><Statistic title="累计报价" value={custStats.totalQuotes} suffix="次" /></Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small"><Statistic title="成交订单" value={custStats.acceptedCount} suffix="单" /></Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small"><Statistic title="成交率" value={custStats.conversion} suffix="%"
                        valueStyle={{ color: custStats.conversion >= 50 ? '#52c41a' : undefined }} /></Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small"><Statistic title="累计成交" value={custStats.totalAmount} prefix="¥" /></Card>
                    </Col>
                  </Row>

                  <div className="detail-section">
                    <div className="detail-section-title">联系信息</div>
                    <Descriptions bordered size="small" column={2}>
                      <Descriptions.Item label="联系人">{detailDrawer.contact}</Descriptions.Item>
                      <Descriptions.Item label="电话">
                        <a href={`tel:${detailDrawer.phone}`}><PhoneOutlined /> {detailDrawer.phone}</a>
                      </Descriptions.Item>
                      <Descriptions.Item label="微信号">{detailDrawer.wechat || '-'}</Descriptions.Item>
                      <Descriptions.Item label="税号">{detailDrawer.taxNumber || '-'}</Descriptions.Item>
                      <Descriptions.Item label="地址" span={2}>{detailDrawer.address || '-'}</Descriptions.Item>
                    </Descriptions>
                  </div>

                  <div className="detail-section">
                    <div className="detail-section-title">交易条款</div>
                    <Descriptions bordered size="small" column={2}>
                      <Descriptions.Item label="信用额度">¥{detailDrawer.creditLimit.toLocaleString()}</Descriptions.Item>
                      <Descriptions.Item label="默认折扣">{detailDrawer.discountRate}%</Descriptions.Item>
                      <Descriptions.Item label="付款方式">{detailDrawer.paymentTerms}</Descriptions.Item>
                      <Descriptions.Item label="偏好品牌">
                        {detailDrawer.preferredBrand?.length
                          ? detailDrawer.preferredBrand.map(b => <Tag key={b}>{b}</Tag>)
                          : '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>

                  {custStats.history.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-section-title">历史报价记录</div>
                      <List
                        size="small"
                        bordered
                        dataSource={custStats.history.slice().reverse()}
                        renderItem={(item: Quote) => (
                          <List.Item>
                            <Row style={{ width: '100%' }} align="middle">
                              <Col span={5} className="barcode" style={{ fontSize: 12 }}>{item.quoteNumber}</Col>
                              <Col span={5}>{item.items.length}件配件</Col>
                              <Col span={5}>
                                <span className="price-highlight">¥{item.finalAmount}</span>
                              </Col>
                              <Col span={5}>
                                <Tag color={({
                                  draft: 'default', sent: 'processing', negotiating: 'warning',
                                  accepted: 'success', rejected: 'error', expired: 'default'
                                } as any)[item.status]}>
                                  {({
                                    draft: '草稿', sent: '已发送', negotiating: '议价中',
                                    accepted: '已成交', rejected: '已拒绝', expired: '已过期'
                                  } as any)[item.status]}
                                </Tag>
                              </Col>
                              <Col span={4} style={{ color: '#8c8c8c', fontSize: 12 }}>
                                {dayjs(item.createdAt).format('YYYY-MM-DD')}
                              </Col>
                            </Row>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </Drawer>

      <Drawer
        title={`策略变更记录 - ${strategyHistoryDrawer?.description}`}
        open={!!strategyHistoryDrawer}
        onClose={() => setStrategyHistoryDrawer(null)}
        width={680}
      >
        {strategyHistoryDrawer && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="适用客户">
                  <Tag color={typeInfo[strategyHistoryDrawer.customerType]?.color}>
                    {typeInfo[strategyHistoryDrawer.customerType]?.icon} {typeInfo[strategyHistoryDrawer.customerType]?.label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="适用范围">
                  {strategyHistoryDrawer.partCategory || '全部品类'}
                  {strategyHistoryDrawer.condition ? ` · ${strategyHistoryDrawer.condition}级` : ''}
                </Descriptions.Item>
                <Descriptions.Item label="加价率">
                  <span style={{ color: '#fa8c16', fontWeight: 600 }}>+{strategyHistoryDrawer.markupRate}%</span>
                </Descriptions.Item>
                <Descriptions.Item label="折扣率">
                  <span style={{ color: '#52c41a', fontWeight: 600 }}>-{strategyHistoryDrawer.discountRate}%</span>
                </Descriptions.Item>
                <Descriptions.Item label="生效时间">
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {strategyHistoryDrawer.effectiveDate
                    ? dayjs(strategyHistoryDrawer.effectiveDate).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(strategyHistoryDrawer.createdAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <div className="detail-section-title" style={{ marginBottom: 12 }}>
              <HistoryOutlined style={{ marginRight: 4 }} /> 变更历史
            </div>
            <Timeline
              items={(strategyHistoryDrawer.changeHistory || []).slice().reverse().map((ch, idx) => ({
                color: idx === 0 ? 'blue' : 'gray',
                children: (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {ch.remark}
                    </div>
                    <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                      字段「<code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3 }}>{ch.field}</code>」
                      从 <span style={{ color: '#ff4d4f' }}>{ch.oldValue}</span>
                      {' → '}
                      改为 <span style={{ color: '#52c41a' }}>{ch.newValue}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 6 }}>
                      {dayjs(ch.time).format('YYYY-MM-DD HH:mm')} · 操作人：{ch.operator}
                    </div>
                  </div>
                )
              }))}
            />
            {(!strategyHistoryDrawer.changeHistory || strategyHistoryDrawer.changeHistory.length === 0) && (
              <Empty description="暂无变更记录" />
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
