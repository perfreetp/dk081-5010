import { useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Modal, Form,
  InputNumber, Divider, Row, Col, message, Drawer, Descriptions,
  Tabs, Statistic, Empty, Progress
} from 'antd';
import {
  SearchOutlined, PlusOutlined, SafetyCertificateOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EditOutlined, AppstoreOutlined, RiseOutlined,
  BarChartOutlined, PieChartOutlined, FireOutlined,
  ThunderboltOutlined, CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { WarrantyClaim, Part } from '@/types';
import dayjs from 'dayjs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const { Option } = Select;
const { TextArea } = Input;

const claimStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'warning' },
  approved: { label: '已受理', color: 'processing' },
  rejected: { label: '已拒绝', color: 'error' },
  completed: { label: '已完成', color: 'success' }
};

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];

export default function AfterSales() {
  const warrantyClaims = useAppStore(s => s.warrantyClaims);
  const parts = useAppStore(s => s.parts);
  const shipments = useAppStore(s => s.shipments);
  const customers = useAppStore(s => s.customers);
  const quotes = useAppStore(s => s.quotes);
  const addWarrantyClaim = useAppStore(s => s.addWarrantyClaim);
  const updateWarrantyClaim = useAppStore(s => s.updateWarrantyClaim);
  const currentUser = useAppStore(s => s.currentUser);

  const [activeTab, setActiveTab] = useState<string>('warranty');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [modal, setModal] = useState<{ open: boolean; editing?: WarrantyClaim }>({ open: false });
  const [detailDrawer, setDetailDrawer] = useState<WarrantyClaim | null>(null);
  const [form] = Form.useForm();

  const filteredClaims = useMemo(() => {
    return warrantyClaims.filter(c => {
      const matchSearch = !searchText ||
        c.claimNumber.includes(searchText) ||
        c.partName.includes(searchText) ||
        c.customerName.includes(searchText) ||
        c.problemDescription.includes(searchText);
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [warrantyClaims, searchText, statusFilter]);

  const claimStats = useMemo(() => {
    const total = warrantyClaims.length;
    const pending = warrantyClaims.filter(c => c.status === 'pending').length;
    const completed = warrantyClaims.filter(c => c.status === 'completed').length;
    const refund = warrantyClaims.filter(c => c.status === 'completed')
      .reduce((s, c) => s + c.refundAmount, 0);
    return { total, pending, completed, refund };
  }, [warrantyClaims]);

  const inventoryStats = useMemo(() => {
    const totalStock = parts.length;
    const inStock = parts.filter(p => p.status === 'in_stock').length;
    const sold = parts.filter(p => p.status === 'sold' || p.status === 'shipped').length;
    const reserved = parts.filter(p => p.status === 'reserved').length;

    const byCategory: Record<string, { stock: number; sold: number; days: number }> = {};
    parts.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = { stock: 0, sold: 0, days: 0 };
      if (p.status === 'in_stock' || p.status === 'reserved') {
        byCategory[p.category].stock++;
        byCategory[p.category].days += dayjs().diff(dayjs(p.inboundDate), 'day');
      } else {
        byCategory[p.category].sold++;
      }
    });

    const categoryData = Object.entries(byCategory).map(([name, v]) => ({
      name,
      库存: v.stock,
      已售: v.sold,
      周转率: v.stock > 0 ? Math.round(v.sold / (v.stock + v.sold) * 100) : 0,
      avgDays: v.stock > 0 ? Math.round(v.days / v.stock) : 0
    })).sort((a, b) => b.库存 + b.已售 - a.库存 - a.已售);

    const conditionPieData = ['A', 'B', 'C', 'D'].map(c => ({
      name: `${c}级`,
      value: parts.filter(p => p.condition === c).length
    })).filter(x => x.value > 0);

    const topFastMoving = categoryData.slice(0, 8).map(c => ({
      name: c.name,
      销售: c.已售,
      平均天数: c.avgDays || 30
    }));

    const overstock = parts.filter(p => {
      if (p.status !== 'in_stock') return false;
      return dayjs().diff(dayjs(p.inboundDate), 'day') > 60;
    }).sort((a, b) =>
      dayjs(b.inboundDate).diff(dayjs(a.inboundDate), 'day') -
      dayjs(a.inboundDate).diff(dayjs(b.inboundDate), 'day')
    );

    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date = dayjs().subtract(5 - i, 'month');
      const monthStart = date.startOf('month');
      const monthEnd = date.endOf('month');
      const soldCount = parts.filter(p =>
        (p.status === 'sold' || p.status === 'shipped')
      ).filter(p => {
        const shipment = shipments.find(s => s.items.some(it => it.partId === p.id));
        if (!shipment || !shipment.shippedDate) return false;
        const d = dayjs(shipment.shippedDate);
        return d.isAfter(monthStart) && d.isBefore(monthEnd);
      }).length;
      const inboundCount = parts.filter(p =>
        dayjs(p.inboundDate).isAfter(monthStart) && dayjs(p.inboundDate).isBefore(monthEnd)
      ).length;
      const revenue = quotes.filter(q =>
        q.status === 'accepted' && dayjs(q.createdAt).isAfter(monthStart) && dayjs(q.createdAt).isBefore(monthEnd)
      ).reduce((s, q) => s + (q.acceptedPrice || q.finalAmount), 0);
      return {
        name: date.format('M月'),
        入库: inboundCount,
        出库: soldCount,
        销售额: Math.round(revenue / 1000)
      };
    });

    return { totalStock, inStock, sold, reserved, categoryData, conditionPieData, topFastMoving, overstock, monthlyData };
  }, [parts, shipments, quotes]);

  const openModal = (claim?: WarrantyClaim) => {
    if (claim) {
      form.setFieldsValue(claim);
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'pending',
        refundAmount: 0
      });
    }
    setModal({ open: true, editing: claim });
  };

  const submitClaim = () => {
    form.validateFields().then(values => {
      const part = parts.find(p => p.id === values.partId);
      const shipment = shipments.find(s => s.id === values.shipmentId);
      const saleDate = shipment?.shippedDate || new Date().toISOString();
      const daysUsed = dayjs().diff(dayjs(saleDate), 'day');

      const data: any = {
        claimNumber: modal.editing ? modal.editing.claimNumber :
          `WC${dayjs().format('YYYYMMDD')}${String(warrantyClaims.length + 1).padStart(3, '0')}`,
        ...values,
        partName: part?.name || values.partName,
        sku: part?.sku || '',
        saleDate,
        claimDate: new Date().toISOString(),
        daysUsed,
        warrantyDaysLeft: Math.max(0, (part?.warrantyDays || 30) - daysUsed),
        handler: currentUser,
        resolvedAt: ['completed', 'rejected'].includes(values.status) ? new Date().toISOString() : undefined
      };
      if (modal.editing) {
        updateWarrantyClaim(modal.editing.id, data);
        message.success('售后记录已更新');
      } else {
        addWarrantyClaim(data);
        message.success('售后记录已创建');
      }
      setModal({ open: false });
    });
  };

  const claimColumns: ColumnsType<WarrantyClaim> = [
    {
      title: '工单号', dataIndex: 'claimNumber', width: 140, fixed: 'left',
      render: t => <span className="barcode">{t}</span>
    },
    {
      title: '配件信息', width: 180,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.partName}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.sku}</div>
        </div>
      )
    },
    {
      title: '客户', width: 150,
      render: (_, r) => (
        <div>
          <div>{r.customerName}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            使用 {r.daysUsed}天 / 剩{r.warrantyDaysLeft}天
          </div>
        </div>
      )
    },
    {
      title: '质保进度', width: 160,
      render: (_, r) => {
        const part = parts.find(p => p.id === r.partId);
        const total = part?.warrantyDays || 30;
        const percent = Math.round(r.daysUsed / total * 100);
        const exceeded = r.daysUsed > total;
        return (
          <div>
            <Progress percent={Math.min(percent, 100)} size="small"
              status={exceeded ? 'exception' : r.warrantyDaysLeft < 7 ? 'active' : undefined} />
          </div>
        );
      }
    },
    {
      title: '问题描述', dataIndex: 'problemDescription', width: 200, ellipsis: true
    },
    {
      title: '退款', dataIndex: 'refundAmount', width: 90, align: 'right',
      render: v => v > 0 ? <span style={{ color: '#ff4d4f' }}>¥{v}</span> : '-'
    },
    {
      title: '处理状态', dataIndex: 'status', width: 90,
      render: s => {
        const st = claimStatusMap[s];
        return <Tag color={st.color}>{st.label}</Tag>;
      }
    },
    {
      title: '处理员', dataIndex: 'handler', width: 80
    },
    {
      title: '操作', key: 'action', width: 140, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => setDetailDrawer(r)}>详情</Button>
          <Button type="link" size="small" onClick={() => openModal(r)} icon={<EditOutlined />}>处理</Button>
        </Space>
      )
    }
  ];

  const overstockColumns: ColumnsType<Part> = [
    {
      title: 'SKU', dataIndex: 'sku', width: 160,
      render: t => <span className="barcode" style={{ fontSize: 12 }}>{t}</span>
    },
    {
      title: '配件名称', key: 'info',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>{r.brand} {r.carModel} {r.year} · {r.category}</div>
        </div>
      )
    },
    {
      title: '成色', dataIndex: 'condition', width: 60, align: 'center',
      render: c => <span className={`condition-badge condition-${c}`}>{c}</span>
    },
    {
      title: '库龄', width: 100,
      render: (_, r) => {
        const days = dayjs().diff(dayjs(r.inboundDate), 'day');
        const color = days > 90 ? '#ff4d4f' : days > 60 ? '#faad14' : '#1677ff';
        return (
          <div style={{ color, fontWeight: 600 }}>{days}天
            <div style={{ background: '#f5f5f5', borderRadius: 3, height: 4, marginTop: 4 }}>
              <div style={{ width: `${Math.min(days / 180 * 100, 100)}%`, background: color, height: '100%', borderRadius: 3 }} />
            </div>
          </div>
        );
      }
    },
    { title: '库位', dataIndex: 'shelfLocation', width: 100 },
    {
      title: '价格', width: 180,
      render: (_, r) => (
        <div style={{ fontSize: 13 }}>
          <Row>
            <Col span={12}>成本: ¥{r.costPrice}</Col>
            <Col span={12} style={{ color: '#cf1322' }}>报价: ¥{r.basePrice}</Col>
          </Row>
          <div style={{ color: '#8c8c8c', marginTop: 2 }}>
            积压资金: ¥{r.costPrice * r.quantity}
          </div>
        </div>
      )
    },
    {
      title: '建议', width: 120,
      render: (_, r) => {
        const days = dayjs().diff(dayjs(r.inboundDate), 'day');
        if (days > 120) return <Tag color="error">🔥 急售清仓</Tag>;
        if (days > 90) return <Tag color="warning">降价促销</Tag>;
        return <Tag color="blue">关注</Tag>;
      }
    }
  ];

  return (
    <div className="tab-panel">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'warranty',
            label: <Space><SafetyCertificateOutlined />售后/质保工单</Space>,
            children: (
              <>
                <div className="stat-cards">
                  <div className="stat-card">
                    <div className="stat-icon warning"><ClockCircleOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">待处理工单</div>
                      <div className="stat-value" style={{ color: '#faad14' }}>{claimStats.pending}</div>
                      <div className="stat-sub">需及时跟进</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon primary"><SafetyCertificateOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">累计工单</div>
                      <div className="stat-value">{claimStats.total}</div>
                      <div className="stat-sub">
                        完成率 {claimStats.total ? Math.round(claimStats.completed / claimStats.total * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon success"><CheckCircleOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">已处理完成</div>
                      <div className="stat-value" style={{ color: '#52c41a' }}>{claimStats.completed}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon error"><span style={{ fontSize: 20 }}>💸</span></div>
                    <div className="stat-content">
                      <div className="stat-label">累计退款</div>
                      <div className="stat-value" style={{ color: '#ff4d4f' }}>¥{claimStats.refund.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <Card size="small" className="filter-card">
                  <Row gutter={16} align="middle">
                    <Col>
                      <Input allowClear prefix={<SearchOutlined />}
                        placeholder="工单号/配件/客户/问题描述"
                        value={searchText} onChange={e => setSearchText(e.target.value)}
                        style={{ width: 300 }} />
                    </Col>
                    <Col>
                      <Select allowClear placeholder="处理状态" value={statusFilter}
                        onChange={setStatusFilter} style={{ width: 130 }}>
                        {Object.entries(claimStatusMap).map(([k, v]) => (
                          <Option key={k} value={k}>{v.label}</Option>
                        ))}
                      </Select>
                    </Col>
                    <Col flex="auto" />
                    <Col>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                        新建售后工单
                      </Button>
                    </Col>
                  </Row>
                </Card>

                <Table
                  columns={claimColumns}
                  dataSource={filteredClaims}
                  rowKey="id"
                  size="middle"
                  scroll={{ x: 1300 }}
                  pagination={{
                    pageSize: 10, showSizeChanger: true,
                    showTotal: t => `共 ${t} 条售后工单`
                  }}
                  locale={{ emptyText: <Empty description="暂无售后工单，客户反馈良好 👍" /> }}
                />
              </>
            )
          },
          {
            key: 'analytics',
            label: <Space><BarChartOutlined />库存与销售分析</Space>,
            children: (
              <>
                <div className="stat-cards">
                  <div className="stat-card">
                    <div className="stat-icon primary"><AppstoreOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">配件库存</div>
                      <div className="stat-value">{inventoryStats.totalStock}</div>
                      <div className="stat-sub">在库 {inventoryStats.inStock} · 预留 {inventoryStats.reserved}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon success"><RiseOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">累计出库</div>
                      <div className="stat-value" style={{ color: '#52c41a' }}>{inventoryStats.sold}</div>
                      <div className="stat-sub">
                        周转率 {inventoryStats.totalStock ? Math.round(inventoryStats.sold / inventoryStats.totalStock * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon warning"><FireOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">积压配件{'(>60天)'}</div>
                      <div className="stat-value" style={{ color: '#faad14' }}>{inventoryStats.overstock.length}</div>
                      <div className="stat-sub">
                        金额 ¥{inventoryStats.overstock.reduce((s, p) => s + p.costPrice, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon cyan"><ThunderboltOutlined /></div>
                    <div className="stat-content">
                      <div className="stat-label">最畅销类别</div>
                      <div className="stat-value" style={{ color: '#13c2c2' }}>
                        {inventoryStats.categoryData[0]?.name || '-'}
                      </div>
                      <div className="stat-sub">
                        销售 {inventoryStats.categoryData[0]?.已售 || 0} 件
                      </div>
                    </div>
                  </div>
                </div>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card title={<span><BarChartOutlined /> 近6个月出入库与销售趋势</span>} size="small">
                      <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                          <LineChart data={inventoryStats.monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="入库" stroke="#1677ff" strokeWidth={2} />
                            <Line type="monotone" dataKey="出库" stroke="#52c41a" strokeWidth={2} />
                            <Line type="monotone" dataKey="销售额" stroke="#faad14" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title={<span><PieChartOutlined /> 库存成色分布</span>} size="small">
                      <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={inventoryStats.conditionPieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              dataKey="value"
                            >
                              {inventoryStats.conditionPieData.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={24}>
                    <Card title={<span><RiseOutlined /> 各类别销售表现（按销量排序）</span>} size="small">
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart data={inventoryStats.categoryData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="库存" fill="#1677ff" />
                            <Bar dataKey="已售" fill="#52c41a" />
                            <Bar dataKey="周转率" fill="#faad14" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  size="small"
                  title={
                    <Space>
                      <FireOutlined style={{ color: '#ff4d4f' }} />
                      <span>积压预警清单（入库超过60天未售出）</span>
                      <Tag color="red">共 {inventoryStats.overstock.length} 件</Tag>
                      <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 12 }}>
                        🔔 及时促销、降价清仓，减少资金占用
                      </span>
                    </Space>
                  }
                  style={{ borderColor: '#ffa39e', background: '#fff2f0' }}
                >
                  {inventoryStats.overstock.length === 0 ? (
                    <Empty description="暂无积压配件，库存健康 👍" />
                  ) : (
                    <Table
                      size="small"
                      columns={overstockColumns}
                      dataSource={inventoryStats.overstock}
                      rowKey="id"
                      pagination={{ pageSize: 8, showTotal: t => `共 ${t} 件积压配件` }}
                      scroll={{ x: 1100 }}
                    />
                  )}
                </Card>

                <Card size="small" title="📋 各类别周转率明细" style={{ marginTop: 16 }}>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={inventoryStats.categoryData}
                    rowKey="name"
                    columns={[
                      { title: '类别', dataIndex: 'name', width: 120 },
                      { title: '库存数', dataIndex: 'stock', width: 80, align: 'center' },
                      { title: '已售数', dataIndex: '已售', width: 80, align: 'center' },
                      {
                        title: '周转率', dataIndex: '周转率', width: 160,
                        render: v => (
                          <Progress percent={v} size="small"
                            status={v >= 40 ? 'success' : v >= 20 ? 'active' : 'exception'} />
                        )
                      },
                      {
                        title: '平均库龄', dataIndex: 'avgDays', width: 100,
                        render: v => v ? `${v}天` : '-'
                      },
                      {
                        title: '分析', width: 150,
                        render: (_, r) => {
                          if (r.周转率 >= 60) return <Tag color="green">畅销 · 补货</Tag>;
                          if (r.周转率 >= 30) return <Tag color="blue">正常</Tag>;
                          if (r.周转率 >= 15) return <Tag color="gold">一般</Tag>;
                          return <Tag color="red">滞销 · 促销</Tag>;
                        }
                      }
                    ]}
                  />
                </Card>
              </>
            )
          }
        ]}
      />

      <Modal
        title={modal.editing ? `处理售后工单 - ${modal.editing.claimNumber}` : '新建售后工单'}
        open={modal.open}
        onCancel={() => setModal({ open: false })}
        onOk={submitClaim}
        width={800}
        okText={modal.editing ? '更新工单' : '创建工单'}
      >
        <Form form={form} layout="vertical">
          <div className="detail-section-title">关联信息</div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="partId" label="选择配件" rules={[{ required: true }]}>
                <Select
                  showSearch optionFilterProp="children"
                  placeholder="搜索SKU/名称"
                  onChange={(v, opt: any) => {
                    const p = parts.find(x => x.id === v);
                    if (p) form.setFieldsValue({ partName: p.name, sku: p.sku });
                  }}
                >
                  {parts.map(p => (
                    <Option key={p.id} value={p.id}>[{p.sku}] {p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shipmentId" label="关联发货单">
                <Select allowClear showSearch optionFilterProp="children">
                  {shipments.map(s => (
                    <Option key={s.id} value={s.id}>{s.shipmentNumber} - {s.customerName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerId" label="客户" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="children"
                  onChange={(v) => {
                    const c = customers.find(x => x.id === v);
                    if (c) form.setFieldsValue({ customerName: c.name });
                  }}>
                  {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="处理状态" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(claimStatusMap).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="detail-section-title">问题描述</div>
          <Form.Item name="problemDescription" label="客户反馈问题" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="详细描述故障现象、出现时间、使用情况" />
          </Form.Item>

          <div className="detail-section-title">处理方案</div>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="resolution" label="处理结果/方案">
                <TextArea rows={3} placeholder="维修/换货/退款/补偿方案等" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="refundAmount" label="退款金额(¥)">
                <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="replacementPartId" label="更换配件">
                <Select allowClear showSearch>
                  {parts.filter(p => p.status === 'in_stock').map(p => (
                    <Option key={p.id} value={p.id}>[{p.sku}] {p.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={`售后工单详情 - ${detailDrawer?.claimNumber}`}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={720}
        extra={
          <Button type="primary" onClick={() => { setDetailDrawer(null); openModal(detailDrawer!); }}>
            <EditOutlined /> 处理
          </Button>
        }
      >
        {detailDrawer && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="工单状态"
                    value={claimStatusMap[detailDrawer.status].label}
                    valueStyle={{
                      fontSize: 18,
                      color: {
                        pending: '#faad14', approved: '#1677ff',
                        rejected: '#ff4d4f', completed: '#52c41a'
                      }[detailDrawer.status]
                    }} />
                </Col>
                <Col span={12}>
                  <Statistic title="质保剩余" value={detailDrawer.warrantyDaysLeft} suffix="天"
                    valueStyle={{ color: detailDrawer.warrantyDaysLeft < 7 ? '#ff4d4f' : undefined }} />
                </Col>
              </Row>
            </Card>

            <div className="detail-section">
              <div className="detail-section-title">基础信息</div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="工单号">{detailDrawer.claimNumber}</Descriptions.Item>
                <Descriptions.Item label="处理员">{detailDrawer.handler}</Descriptions.Item>
                <Descriptions.Item label="配件名称">{detailDrawer.partName}</Descriptions.Item>
                <Descriptions.Item label="SKU">{detailDrawer.sku}</Descriptions.Item>
                <Descriptions.Item label="客户">{detailDrawer.customerName}</Descriptions.Item>
                <Descriptions.Item label="发货单号">{detailDrawer.shipmentId || '-'}</Descriptions.Item>
                <Descriptions.Item label="销售日期">{dayjs(detailDrawer.saleDate).format('YYYY-MM-DD')}</Descriptions.Item>
                <Descriptions.Item label="报修日期">{dayjs(detailDrawer.claimDate).format('YYYY-MM-DD')}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">质保进度</div>
              <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8 }}>
                <Row gutter={16}>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>已使用</div>
                    <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{detailDrawer.daysUsed}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>天</div>
                  </Col>
                  <Col span={8} style={{ display: 'flex', alignItems: 'center' }}>
                    <Progress
                      type="dashboard"
                      percent={Math.min(Math.round(detailDrawer.daysUsed /
                        (parts.find(p => p.id === detailDrawer.partId)?.warrantyDays || 30) * 100), 100)}
                      size={100}
                      status={detailDrawer.warrantyDaysLeft < 7 ? 'exception' : 'normal'}
                    />
                  </Col>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>剩余</div>
                    <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4,
                      color: detailDrawer.warrantyDaysLeft < 7 ? '#ff4d4f' : '#52c41a' }}>
                      {detailDrawer.warrantyDaysLeft}
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>天</div>
                  </Col>
                </Row>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">问题与处理</div>
              <Card size="small" style={{ marginBottom: 12 }}
                title={<span><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> 客户反馈</span>}>
                <div style={{ padding: '4px 8px' }}>{detailDrawer.problemDescription}</div>
              </Card>
              <Card size="small"
                title={<span><CheckCircleOutlined style={{ color: '#52c41a' }} /> 处理方案</span>}>
                <div style={{ padding: '4px 8px' }}>
                  {detailDrawer.resolution || '处理中...'}
                  {detailDrawer.refundAmount > 0 && (
                    <div style={{ marginTop: 8, color: '#ff4d4f' }}>
                      退款金额：¥{detailDrawer.refundAmount.toLocaleString()}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
