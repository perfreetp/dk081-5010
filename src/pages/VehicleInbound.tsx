import { useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Input, Select, DatePicker, Tag, Modal,
  Form, InputNumber, Upload, Divider, Row, Col, Statistic, Progress,
  message, Popconfirm, Drawer, Descriptions, Badge
} from 'antd';
import {
  PlusOutlined, SearchOutlined, CarOutlined, UnorderedListOutlined,
  CheckCircleOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  UploadOutlined, AppstoreOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { Vehicle, Part } from '@/types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

const sourceLabels: Record<string, string> = {
  insurance: '保险公司', auction: '拍卖平台', private: '个人车主',
  scrap_station: '报废厂', other: '其他'
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '待拆解', color: 'default' },
  dismantling: { label: '拆解中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  archived: { label: '已归档', color: 'default' }
};

export default function VehicleInbound() {
  const vehicles = useAppStore(s => s.vehicles);
  const parts = useAppStore(s => s.parts);
  const addVehicle = useAppStore(s => s.addVehicle);
  const updateVehicle = useAppStore(s => s.updateVehicle);
  const deleteVehicle = useAppStore(s => s.deleteVehicle);
  const addPartsBatch = useAppStore(s => s.addPartsBatch);
  const currentUser = useAppStore(s => s.currentUser);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [dateRange, setDateRange] = useState<any>();
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [detailDrawer, setDetailDrawer] = useState<Vehicle | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm] = Form.useForm();
  const [partsForm] = Form.useForm();
  const [batchParts, setBatchParts] = useState<any[]>([]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchSearch = !searchText ||
        v.brand.includes(searchText) || v.model.includes(searchText) ||
        v.plateNumber.includes(searchText) || v.vin.includes(searchText) ||
        v.batchNumber.includes(searchText);
      const matchStatus = !statusFilter || v.status === statusFilter;
      const matchDate = !dateRange || (
        dayjs(v.inboundDate).isAfter(dateRange[0]) &&
        dayjs(v.inboundDate).isBefore(dateRange[1])
      );
      return matchSearch && matchStatus && matchDate;
    });
  }, [vehicles, searchText, statusFilter, dateRange]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const dismantling = vehicles.filter(v => v.status === 'dismantling').length;
    const completed = vehicles.filter(v => v.status === 'completed').length;
    const totalParts = parts.length;
    const pendingParts = parts.filter(p =>
      p.status === 'in_stock' && dayjs(p.inboundDate).isAfter(dayjs().subtract(30, 'day'))
    ).length;
    return { total, dismantling, completed, totalParts, pendingParts };
  }, [vehicles, parts]);

  const openVehicleModal = (vehicle?: Vehicle) => {
    setEditingVehicle(vehicle || null);
    if (vehicle) {
      vehicleForm.setFieldsValue({
        ...vehicle,
        inboundDate: dayjs(vehicle.inboundDate)
      });
    } else {
      vehicleForm.resetFields();
      vehicleForm.setFieldsValue({
        inboundDate: dayjs(),
        status: 'pending',
        batchNumber: `B${dayjs().format('YYYYMM')}${String(vehicles.length + 1).padStart(3, '0')}`
      });
    }
    setVehicleModalOpen(true);
  };

  const submitVehicle = () => {
    vehicleForm.validateFields().then(values => {
      const data = {
        ...values,
        inboundDate: values.inboundDate.toISOString(),
        photos: []
      };
      if (editingVehicle) {
        updateVehicle(editingVehicle.id, data);
        message.success('车辆信息已更新');
      } else {
        addVehicle(data);
        message.success('车辆登记成功');
      }
      setVehicleModalOpen(false);
    });
  };

  const openBatchAdd = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
    setBatchParts([{
      key: Date.now(),
      name: '', category: '', sku: '', oemNumber: '',
      condition: 'B', quantity: 1, costPrice: 0, basePrice: 0, minPrice: 0,
      position: '', warrantyDays: 30
    }]);
    partsForm.resetFields();
    setBatchModalOpen(true);
  };

  const addBatchRow = () => {
    setBatchParts([...batchParts, {
      key: Date.now(),
      name: '', category: '', sku: '', oemNumber: '',
      condition: 'B', quantity: 1, costPrice: 0, basePrice: 0, minPrice: 0,
      position: '', warrantyDays: 30
    }]);
  };

  const removeBatchRow = (key: number) => {
    setBatchParts(batchParts.filter(p => p.key !== key));
  };

  const updateBatchPart = (key: number, field: string, value: any) => {
    setBatchParts(batchParts.map(p => p.key === key ? { ...p, [field]: value } : p));
  };

  const submitBatchParts = () => {
    if (!currentVehicle) return;
    const validParts = batchParts.filter(p => p.name.trim());
    if (validParts.length === 0) {
      message.error('请至少填写一个配件');
      return;
    }
    const newParts = validParts.map(p => ({
      vehicleId: currentVehicle!.id,
      sku: p.sku || `${currentVehicle!.brand.slice(0, 2).toUpperCase()}-${currentVehicle!.model.slice(0, 2).toUpperCase()}-${String(currentVehicle!.year).slice(-2)}-${p.category?.slice(0, 3).toUpperCase() || 'PAR'}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      name: p.name,
      category: p.category || '其他',
      brand: currentVehicle!.brand,
      carModel: currentVehicle!.model,
      year: currentVehicle!.year,
      oemNumber: p.oemNumber || '',
      originalCode: '',
      condition: p.condition,
      conditionDescription: '',
      defects: [],
      testResults: [],
      position: p.position,
      quantity: p.quantity,
      costPrice: p.costPrice,
      basePrice: p.basePrice,
      minPrice: p.minPrice,
      status: 'in_stock' as const,
      photos: [],
      inboundDate: new Date().toISOString(),
      shelfLocation: p.position || '',
      warrantyDays: p.warrantyDays,
      remark: '',
      createdBy: currentUser
    }));
    addPartsBatch(newParts);
    message.success(`成功上架 ${newParts.length} 个配件`);
    if (currentVehicle.status === 'pending') {
      updateVehicle(currentVehicle.id, { status: 'dismantling' });
    }
    setBatchModalOpen(false);
  };

  const vehicleColumns: ColumnsType<Vehicle> = [
    {
      title: '批次号', dataIndex: 'batchNumber', width: 130, fixed: 'left',
      render: t => <span className="barcode">{t}</span>
    },
    {
      title: '车辆信息', key: 'vehicleInfo', width: 200,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.brand} {r.model} {r.year}</div>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>
            {r.plateNumber} · {r.displacement} · {r.transmission}
          </div>
        </div>
      )
    },
    { title: 'VIN码', dataIndex: 'vin', width: 180, ellipsis: true },
    { title: '里程', dataIndex: 'mileage', width: 90, render: v => `${v.toLocaleString()}km` },
    { title: '颜色', dataIndex: 'color', width: 70 },
    {
      title: '来源', dataIndex: 'source', width: 100,
      render: s => <Tag color="blue">{sourceLabels[s]}</Tag>
    },
    { title: '入厂日期', dataIndex: 'inboundDate', width: 110, render: d => dayjs(d).format('YYYY-MM-DD') },
    { title: '拆解员', dataIndex: 'dismantler', width: 90 },
    {
      title: '配件数', width: 80, align: 'center',
      render: (_, r) => {
        const count = parts.filter(p => p.vehicleId === r.id).length;
        return <Badge count={count} color="#1677ff" showZero />;
      }
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: s => {
        const st = statusLabels[s];
        return <Tag color={st.color}>{st.label}</Tag>;
      }
    },
    {
      title: '操作', key: 'action', width: 260, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setDetailDrawer(r)}>查看</Button>
          <Button type="link" size="small" icon={<AppstoreOutlined />} onClick={() => openBatchAdd(r)}>批量上架</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openVehicleModal(r)}>编辑</Button>
          <Popconfirm title="确认删除此车辆记录？" onConfirm={() => { deleteVehicle(r.id); message.success('已删除'); }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const vehicleParts = detailDrawer ? parts.filter(p => p.vehicleId === detailDrawer.id) : [];

  return (
    <div className="tab-panel">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon primary"><CarOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">累计入厂车辆</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-sub">本月新增 3 台</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <UnorderedListOutlined />
          </div>
          <div className="stat-content">
            <div className="stat-label">拆解中</div>
            <div className="stat-value">{stats.dismantling}</div>
            <Progress percent={stats.total ? Math.round(stats.dismantling / stats.total * 100) : 0} size="small" />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><CheckCircleOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">已完成拆解</div>
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-sub">完成率 {stats.total ? Math.round(stats.completed / stats.total * 100) : 0}%</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><AppstoreOutlined /></div>
          <div className="stat-content">
            <div className="stat-label">配件库存</div>
            <div className="stat-value">{stats.totalParts}</div>
            <div className="stat-sub">近30天新上架 {stats.pendingParts}</div>
          </div>
        </div>
      </div>

      <Card size="small" className="filter-card">
        <Row gutter={16} align="middle">
          <Col>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索品牌/车型/车牌/VIN/批次"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 320 }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="状态筛选"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
            >
              {Object.entries(statusLabels).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <RangePicker value={dateRange} onChange={setDateRange} />
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openVehicleModal()}>
                登记事故车
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={vehicleColumns}
        dataSource={filteredVehicles}
        rowKey="id"
        size="middle"
        scroll={{ x: 1500 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`
        }}
      />

      <Modal
        title={editingVehicle ? '编辑车辆信息' : '登记事故车'}
        open={vehicleModalOpen}
        onCancel={() => setVehicleModalOpen(false)}
        onOk={submitVehicle}
        width={900}
        okText="保存"
      >
        <Form form={vehicleForm} layout="vertical">
          <Divider orientation="left" plain>基本信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="batchNumber" label="批次编号" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="plateNumber" label="车牌号" rules={[{ required: true }]}>
                <Input placeholder="如：沪A88888" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="vin" label="VIN码" rules={[{ required: true, len: 17, message: 'VIN码应为17位' }]}>
                <Input placeholder="17位车架号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="brand" label="品牌" rules={[{ required: true }]}>
                <Input placeholder="如：大众" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="model" label="车型" rules={[{ required: true }]}>
                <Input placeholder="如：帕萨特" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="year" label="年款" rules={[{ required: true }]}>
                <InputNumber min={1990} max={2030} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="color" label="颜色">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="displacement" label="排量">
                <Input placeholder="如：2.0T" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="transmission" label="变速箱">
                <Select placeholder="请选择">
                  <Option value="手动">手动</Option>
                  <Option value="AT">AT自动</Option>
                  <Option value="CVT">CVT无级</Option>
                  <Option value="DCT">双离合DCT</Option>
                  <Option value="7速双离合">7速双离合</Option>
                  <Option value="6AT">6AT</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mileage" label="里程(km)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left" plain>来源信息</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="source" label="车源渠道" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(sourceLabels).map(([k, v]) => (
                    <Option key={k} value={k}>{v}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sourceDetail" label="来源详情">
                <Input placeholder="保险公司名称/拍卖平台/联系人等" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="inboundDate" label="入厂日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="accidentDescription" label="事故描述">
                <TextArea rows={3} placeholder="描述车辆损坏情况，帮助配件定级" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remark" label="备注">
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dismantler" label="负责拆解员">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="当前状态">
                <Select>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={`批量上架配件 - ${currentVehicle?.brand} ${currentVehicle?.model}`}
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        onOk={submitBatchParts}
        width={1300}
        okText="确认上架"
        footer={[
          <Button key="add" onClick={addBatchRow} icon={<PlusOutlined />}>添加一行</Button>,
          <Button key="cancel" onClick={() => setBatchModalOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={submitBatchParts}>确认上架 ({batchParts.filter(p => p.name).length})</Button>
        ]}
      >
        <div style={{ background: '#e6f4ff', padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          💡 提示：快速录入核心信息，成色缺陷和详细测试可在「件品评级」窗口完善
        </div>
        <Table
          size="small"
          pagination={false}
          dataSource={batchParts}
          rowKey="key"
          columns={[
            {
              title: '配件名称 *', dataIndex: 'name', width: 160,
              render: (_, r) => (
                <Input value={r.name} onChange={e => updateBatchPart(r.key, 'name', e.target.value)}
                  placeholder="如：发动机总成" size="small" />
              )
            },
            {
              title: '类别', dataIndex: 'category', width: 110,
              render: (_, r) => (
                <Select size="small" value={r.category} onChange={v => updateBatchPart(r.key, 'category', v)}
                  placeholder="选择" style={{ width: '100%' }}>
                  {['发动机', '变速箱', '底盘', '电器', '灯光', '外观', '内饰', '车门', '其他'].map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              )
            },
            {
              title: '安装位置', dataIndex: 'position', width: 100,
              render: (_, r) => (
                <Input size="small" value={r.position} onChange={e => updateBatchPart(r.key, 'position', e.target.value)}
                  placeholder="如：左前" />
              )
            },
            {
              title: '成色', dataIndex: 'condition', width: 70, align: 'center',
              render: (_, r) => (
                <Select size="small" value={r.condition} onChange={v => updateBatchPart(r.key, 'condition', v)}>
                  <Option value="A">A级</Option>
                  <Option value="B">B级</Option>
                  <Option value="C">C级</Option>
                  <Option value="D">D级</Option>
                </Select>
              )
            },
            {
              title: 'OEM号', dataIndex: 'oemNumber', width: 140,
              render: (_, r) => (
                <Input size="small" value={r.oemNumber} onChange={e => updateBatchPart(r.key, 'oemNumber', e.target.value)} />
              )
            },
            {
              title: '数量', dataIndex: 'quantity', width: 70,
              render: (_, r) => (
                <InputNumber size="small" min={1} value={r.quantity}
                  onChange={v => updateBatchPart(r.key, 'quantity', v || 1)} style={{ width: '100%' }} />
              )
            },
            {
              title: '成本价', dataIndex: 'costPrice', width: 100,
              render: (_, r) => (
                <InputNumber size="small" prefix="¥" min={0} value={r.costPrice}
                  onChange={v => updateBatchPart(r.key, 'costPrice', v || 0)} style={{ width: '100%' }} />
              )
            },
            {
              title: '基准价', dataIndex: 'basePrice', width: 100,
              render: (_, r) => (
                <InputNumber size="small" prefix="¥" min={0} value={r.basePrice}
                  onChange={v => {
                    updateBatchPart(r.key, 'basePrice', v || 0);
                    updateBatchPart(r.key, 'minPrice', Math.round((v || 0) * 0.85));
                  }} style={{ width: '100%' }} />
              )
            },
            {
              title: '底价', dataIndex: 'minPrice', width: 100,
              render: (_, r) => (
                <InputNumber size="small" prefix="¥" min={0} value={r.minPrice}
                  onChange={v => updateBatchPart(r.key, 'minPrice', v || 0)} style={{ width: '100%' }} />
              )
            },
            {
              title: '质保(天)', dataIndex: 'warrantyDays', width: 80,
              render: (_, r) => (
                <InputNumber size="small" min={0} value={r.warrantyDays}
                  onChange={v => updateBatchPart(r.key, 'warrantyDays', v || 0)} style={{ width: '100%' }} />
              )
            },
            {
              title: '', width: 50, align: 'center',
              render: (_, r) => (
                <Button type="text" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => removeBatchRow(r.key)} />
              )
            }
          ]}
        />
      </Modal>

      <Drawer
        title={`车辆详情 - ${detailDrawer?.brand} ${detailDrawer?.model}`}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={800}
      >
        {detailDrawer && (
          <>
            <div className="detail-section">
              <div className="detail-section-title">车辆信息</div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="批次号">{detailDrawer.batchNumber}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={statusLabels[detailDrawer.status].color}>
                    {statusLabels[detailDrawer.status].label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="品牌">{detailDrawer.brand}</Descriptions.Item>
                <Descriptions.Item label="车型">{detailDrawer.model} {detailDrawer.year}</Descriptions.Item>
                <Descriptions.Item label="车牌号">{detailDrawer.plateNumber}</Descriptions.Item>
                <Descriptions.Item label="VIN码">{detailDrawer.vin}</Descriptions.Item>
                <Descriptions.Item label="排量/变速箱">{detailDrawer.displacement} / {detailDrawer.transmission}</Descriptions.Item>
                <Descriptions.Item label="里程/颜色">{detailDrawer.mileage.toLocaleString()}km / {detailDrawer.color}</Descriptions.Item>
                <Descriptions.Item label="车源">
                  <Tag color="blue">{sourceLabels[detailDrawer.source]}</Tag>
                  {detailDrawer.sourceDetail}
                </Descriptions.Item>
                <Descriptions.Item label="入厂日期">{dayjs(detailDrawer.inboundDate).format('YYYY-MM-DD')}</Descriptions.Item>
                <Descriptions.Item label="事故描述" span={2}>{detailDrawer.accidentDescription}</Descriptions.Item>
              </Descriptions>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">已拆解配件 ({vehicleParts.length})</div>
              <Table
                size="small"
                dataSource={vehicleParts}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'SKU', dataIndex: 'sku', width: 180 },
                  { title: '名称', dataIndex: 'name' },
                  {
                    title: '成色', dataIndex: 'condition', width: 60, align: 'center',
                    render: c => <span className={`condition-badge condition-${c}`}>{c}级</span>
                  },
                  { title: '基准价', dataIndex: 'basePrice', width: 90, render: v => `¥${v}` },
                  {
                    title: '状态', dataIndex: 'status', width: 90,
                    render: s => {
                      const map: any = {
                        in_stock: { t: '在库', c: 'success' },
                        reserved: { t: '已预留', c: 'warning' },
                        sold: { t: '已售', c: 'default' },
                        pending_shipment: { t: '待发货', c: 'processing' },
                        shipped: { t: '已发货', c: 'blue' }
                      };
                      return <Tag color={map[s]?.c}>{map[s]?.t}</Tag>;
                    }
                  }
                ]}
              />
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
