import { useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Tag, Modal, Form,
  InputNumber, Divider, Row, Col, Rate, message, Radio,
  Checkbox, Drawer, Descriptions, Avatar, Badge, List, Dropdown, Menu
} from 'antd';
import {
  SearchOutlined, FilterOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ExclamationOutlined, EditOutlined,
  CameraOutlined, StarOutlined, StarFilled
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppStore } from '@/store/appStore';
import type { Part, PartTest } from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const conditionDescriptions: Record<string, { label: string; desc: string }> = {
  A: { label: 'A级·极品', desc: '成色极新，功能100%，无任何瑕疵，接近全新件' },
  B: { label: 'B级·良品', desc: '成色良好，功能正常，轻微使用痕迹或小瑕疵' },
  C: { label: 'C级·一般', desc: '成色一般，功能完好，有明显使用痕迹或需小修复' },
  D: { label: 'D级·瑕疵品', desc: '有明显缺陷，作为拆车件或配件出售，价格极低' }
};

const commonDefects = [
  '表面划痕', '轻微凹陷', '卡扣断裂', '灯面雾化', '渗油痕迹',
  '插头损坏', '传感器缺失', '磨损严重', '需要喷漆', '需修复'
];

const standardTests = [
  { name: '外观检查', category: '外观' },
  { name: '功能测试', category: '功能' },
  { name: '电气测试', category: '电器' },
  { name: '密封性能', category: '性能' },
  { name: '异响检测', category: '性能' },
  { name: '压力测试', category: '性能' }
];

const conditionStats = {
  A: { color: '#52c41a', bg: '#f6ffed' },
  B: { color: '#1677ff', bg: '#e6f4ff' },
  C: { color: '#faad14', bg: '#fffbe6' },
  D: { color: '#ff4d4f', bg: '#fff2f0' }
};

export default function PartRating() {
  const parts = useAppStore(s => s.parts);
  const updatePart = useAppStore(s => s.updatePart);
  const vehicles = useAppStore(s => s.vehicles);

  const [searchText, setSearchText] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>();
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [vehicleFilter, setVehicleFilter] = useState<string>();
  const [editModal, setEditModal] = useState<Part | null>(null);
  const [detailDrawer, setDetailDrawer] = useState<Part | null>(null);
  const [form] = Form.useForm();

  const categories = useMemo(() => [...new Set(parts.map(p => p.category))], [parts]);

  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      const matchSearch = !searchText ||
        p.name.includes(searchText) || p.sku.includes(searchText) ||
        p.brand.includes(searchText) || p.carModel.includes(searchText) ||
        p.oemNumber.includes(searchText);
      const matchCondition = !conditionFilter || p.condition === conditionFilter;
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      const matchVehicle = !vehicleFilter || p.vehicleId === vehicleFilter;
      return matchSearch && matchCondition && matchCategory && matchVehicle;
    });
  }, [parts, searchText, conditionFilter, categoryFilter, vehicleFilter]);

  const conditionDistribution = useMemo(() => {
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    parts.forEach(p => { dist[p.condition]++; });
    return dist;
  }, [parts]);

  const openEdit = (part: Part) => {
    setEditModal(part);
    form.setFieldsValue({
      name: part.name,
      category: part.category,
      condition: part.condition,
      conditionDescription: part.conditionDescription,
      defects: part.defects,
      oemNumber: part.oemNumber,
      originalCode: part.originalCode,
      position: part.position,
      costPrice: part.costPrice,
      basePrice: part.basePrice,
      minPrice: part.minPrice,
      shelfLocation: part.shelfLocation,
      warrantyDays: part.warrantyDays,
      remark: part.remark
    });
  };

  const submitEdit = () => {
    form.validateFields().then(values => {
      if (editModal) {
        updatePart(editModal.id, values);
        message.success('评级信息已更新');
        setEditModal(null);
      }
    });
  };

  const batchSetCondition = (condition: string) => {
    message.success(`已选择 ${condition} 级批量评级模式，点击表格多选行后应用`);
  };

  const columns: ColumnsType<Part> = [
    {
      title: 'SKU/编码', dataIndex: 'sku', width: 180, fixed: 'left',
      render: (t, r) => (
        <div>
          <div className="barcode" style={{ fontSize: 12 }}>{t}</div>
          {r.oemNumber && <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 2 }}>OEM: {r.oemNumber}</div>}
        </div>
      )
    },
    {
      title: '配件信息', key: 'info', width: 200,
      render: (_, r) => {
        const v = vehicles.find(x => x.id === r.vehicleId);
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>
              {r.brand} {r.carModel} {r.year} · {r.category}
            </div>
            {v && <div style={{ color: '#bfbfbf', fontSize: 11, marginTop: 2 }}>来源: {v.plateNumber}</div>}
          </div>
        );
      }
    },
    {
      title: '成色评级', dataIndex: 'condition', width: 130, align: 'center',
      render: (c) => {
        const info = conditionDescriptions[c];
        return (
          <div>
            <span className={`condition-badge condition-${c}`} style={{ fontSize: 14, padding: '4px 12px', fontWeight: 700 }}>
              {c}级
            </span>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
              {info.label.split('·')[1]}
            </div>
          </div>
        );
      }
    },
    {
      title: '缺陷/问题', dataIndex: 'defects', width: 160,
      render: (arr: string[]) => {
        if (!arr || arr.length === 0) {
          return <span style={{ color: '#52c41a' }}><CheckCircleOutlined /> 无</span>;
        }
        return (
          <div>
            {arr.slice(0, 2).map((d, i) => (
              <Tag key={i} color="orange" style={{ marginBottom: 2 }}>{d}</Tag>
            ))}
            {arr.length > 2 && <Tag>+{arr.length - 2}</Tag>}
          </div>
        );
      }
    },
    {
      title: '测试通过率', width: 130, align: 'center',
      render: (_, r) => {
        const passed = r.testResults.filter(t => t.result === 'pass').length;
        const total = r.testResults.length;
        if (total === 0) return <Tag color="default">未测试</Tag>;
        const rate = Math.round(passed / total * 100);
        const color = rate >= 80 ? '#52c41a' : rate >= 50 ? '#faad14' : '#ff4d4f';
        return (
          <div>
            <span style={{ fontWeight: 600, color }}>{passed}/{total}</span>
            <div style={{ background: '#f5f5f5', borderRadius: 4, height: 6, marginTop: 4 }}>
              <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 4 }} />
            </div>
          </div>
        );
      }
    },
    {
      title: '价格', width: 200,
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div><span style={{ color: '#8c8c8c' }}>成本: </span>¥{r.costPrice}</div>
          <div style={{ fontWeight: 600 }}><span style={{ color: '#8c8c8c' }}>报价: </span>
            <span className="price-highlight">¥{r.basePrice}</span>
          </div>
          <div style={{ color: '#faad14' }}><span style={{ color: '#8c8c8c' }}>底价: </span>¥{r.minPrice}</div>
        </div>
      )
    },
    {
      title: '库位/质保', width: 130,
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div>📍 {r.shelfLocation || '-'}</div>
          <div style={{ marginTop: 2, color: '#1677ff' }}>🛡️ {r.warrantyDays}天</div>
        </div>
      )
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s) => {
        const map: any = {
          in_stock: { t: '在库', c: 'success' },
          reserved: { t: '已预留', c: 'warning' },
          sold: { t: '已售', c: 'default' },
          pending_shipment: { t: '待发', c: 'processing' }
        };
        return <Tag color={map[s]?.c}>{map[s]?.t}</Tag>;
      }
    },
    {
      title: '入厂', dataIndex: 'inboundDate', width: 90,
      render: d => {
        const days = dayjs().diff(dayjs(d), 'day');
        return (
          <div style={{ fontSize: 12 }}>
            <div>{dayjs(d).format('MM-DD')}</div>
            <div style={{ color: days > 60 ? '#ff4d4f' : days > 30 ? '#faad14' : '#8c8c8c' }}>
              {days}天前
            </div>
          </div>
        );
      }
    },
    {
      title: '操作', key: 'action', width: 140, fixed: 'right',
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => setDetailDrawer(r)}>详情</Button>
          <Button type="link" size="small" onClick={() => openEdit(r)} icon={<EditOutlined />}>评级</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="tab-panel">
      <div className="stat-cards">
        {(['A', 'B', 'C', 'D'] as const).map(c => {
          const count = conditionDistribution[c] || 0;
          const stat = conditionStats[c];
          return (
            <div className="stat-card" key={c} onClick={() => setConditionFilter(c)} style={{ cursor: 'pointer' }}>
              <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>
                {c === 'A' ? <StarFilled /> : c === 'B' ? <StarOutlined /> : <ExclamationOutlined />}
              </div>
              <div className="stat-content">
                <div className="stat-label" style={{ color: stat.color }}>
                  {conditionDescriptions[c].label}
                </div>
                <div className="stat-value" style={{ color: stat.color }}>{count}</div>
                <div className="stat-sub">占比 {parts.length ? Math.round(count / parts.length * 100) : 0}%</div>
              </div>
            </div>
          );
        })}
      </div>

      <Card size="small" className="filter-card">
        <Row gutter={[16, 12]} align="middle">
          <Col>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索配件名称/SKU/品牌/OEM"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="成色"
              value={conditionFilter}
              onChange={setConditionFilter}
              style={{ width: 100 }}
            >
              {Object.keys(conditionDescriptions).map(c => (
                <Option key={c} value={c}>{c}级</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="类别"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 120 }}
            >
              {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="来源车辆"
              value={vehicleFilter}
              onChange={setVehicleFilter}
              style={{ width: 200 }}
            >
              {vehicles.map(v => (
                <Option key={v.id} value={v.id}>{v.plateNumber} · {v.brand}{v.model}</Option>
              ))}
            </Select>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Dropdown overlay={
                <Menu>
                  {Object.keys(conditionDescriptions).map(c => (
                    <Menu.Item key={c} onClick={() => batchSetCondition(c)}>
                      {conditionDescriptions[c].label}
                    </Menu.Item>
                  ))}
                </Menu>
              }>
                <Button icon={<FilterOutlined />}>批量评级</Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredParts}
        rowKey="id"
        rowSelection={{}}
        size="middle"
        scroll={{ x: 1600 }}
        pagination={{
          pageSize: 12,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 个配件`
        }}
      />

      <Modal
        title={editModal ? `件品评级 - ${editModal.name}` : ''}
        open={!!editModal}
        onCancel={() => setEditModal(null)}
        onOk={submitEdit}
        width={900}
        okText="保存评级"
      >
        {editModal && (
          <div>
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>SKU:</span> <strong>{editModal.sku}</strong>
                </Col>
                <Col span={12}>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>来源:</span> {editModal.brand} {editModal.carModel} {editModal.year}
                </Col>
              </Row>
            </div>

            <Form form={form} layout="vertical">
              <div className="detail-section-title" style={{ marginBottom: 12 }}>成色评级</div>
              <Form.Item name="condition" label="选择成色等级" rules={[{ required: true }]}>
                <Radio.Group>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {Object.entries(conditionDescriptions).map(([key, info]) => (
                      <Radio value={key} key={key}>
                        <div style={{ display: 'inline-block', marginLeft: 8 }}>
                          <span className={`condition-badge condition-${key}`}>{key}级</span>
                          <span style={{ fontWeight: 600, marginLeft: 8 }}>{info.label}</span>
                          <span style={{ color: '#8c8c8c', marginLeft: 12, fontSize: 12 }}>{info.desc}</span>
                        </div>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </Form.Item>

              <div className="detail-section-title" style={{ marginBottom: 12 }}>缺陷记录</div>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item name="defects" label="常见缺陷（可多选）">
                    <Checkbox.Group options={commonDefects} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="conditionDescription" label="详细成色描述">
                <TextArea rows={3} placeholder="详细描述成色情况、瑕疵位置、注意事项等" />
              </Form.Item>

              <div className="detail-section-title" style={{ marginBottom: 12 }}>基础信息</div>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="name" label="配件名称"><Input /></Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="category" label="类别">
                    <Select>
                      {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="position" label="安装位置"><Input /></Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="oemNumber" label="OEM号"><Input /></Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="originalCode" label="原厂编码"><Input /></Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="shelfLocation" label="库位"><Input /></Form.Item>
                </Col>
              </Row>

              <div className="detail-section-title" style={{ marginBottom: 12 }}>定价策略</div>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="costPrice" label="成本价">
                    <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="basePrice" label="基准价（对外报价）">
                    <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="minPrice" label="底线价（最低价）">
                    <InputNumber prefix="¥" style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="warrantyDays" label="质保天数">
                    <InputNumber suffix="天" style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="remark" label="备注">
                    <TextArea rows={1} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        )}
      </Modal>

      <Drawer
        title={`配件详情 - ${detailDrawer?.name}`}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={720}
      >
        {detailDrawer && (
          <>
            <div className="detail-section">
              <div className="detail-section-title">基础信息</div>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="SKU编码">{detailDrawer.sku}</Descriptions.Item>
                <Descriptions.Item label="OEM号">{detailDrawer.oemNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="配件名称">{detailDrawer.name}</Descriptions.Item>
                <Descriptions.Item label="类别">{detailDrawer.category}</Descriptions.Item>
                <Descriptions.Item label="适用车型">{detailDrawer.brand} {detailDrawer.carModel} {detailDrawer.year}</Descriptions.Item>
                <Descriptions.Item label="安装位置">{detailDrawer.position || '-'}</Descriptions.Item>
                <Descriptions.Item label="库位">{detailDrawer.shelfLocation || '-'}</Descriptions.Item>
                <Descriptions.Item label="入库时间">{dayjs(detailDrawer.inboundDate).format('YYYY-MM-DD')}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">成色评级</div>
              <Card style={{ background: conditionStats[detailDrawer.condition].bg, border: 'none' }}>
                <Row align="middle" gutter={16}>
                  <Col>
                    <span
                      className={`condition-badge condition-${detailDrawer.condition}`}
                      style={{ fontSize: 32, padding: '12px 24px', fontWeight: 800 }}
                    >
                      {detailDrawer.condition}
                    </span>
                  </Col>
                  <Col flex="auto">
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{conditionDescriptions[detailDrawer.condition].label}</div>
                    <div style={{ color: '#595959', fontSize: 13 }}>{conditionDescriptions[detailDrawer.condition].desc}</div>
                  </Col>
                </Row>
              </Card>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                  <strong>成色描述：</strong>{detailDrawer.conditionDescription || '无'}
                </div>
                {detailDrawer.defects && detailDrawer.defects.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong style={{ fontSize: 13 }}>缺陷记录：</strong>
                    <div style={{ marginTop: 6 }}>
                      {detailDrawer.defects.map((d, i) => (
                        <Tag key={i} color="red">{d}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">测试项目</div>
              <List
                size="small"
                bordered
                dataSource={detailDrawer.testResults.length > 0 ? detailDrawer.testResults :
                  standardTests.map(t => ({ testName: t.name, result: 'na' as const, remark: '未测试' }))}
                renderItem={(item: PartTest) => (
                  <List.Item>
                    <Row style={{ width: '100%' }} align="middle">
                      <Col flex="auto">{item.testName}</Col>
                      <Col>
                        {item.result === 'pass' ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>通过</Tag>
                        ) : item.result === 'fail' ? (
                          <Tag color="red" icon={<CloseCircleOutlined />}>不通过</Tag>
                        ) : (
                          <Tag color="default">未测试</Tag>
                        )}
                      </Col>
                      <Col style={{ width: 200, marginLeft: 16, color: '#8c8c8c', fontSize: 12 }}>
                        {item.remark}
                      </Col>
                    </Row>
                  </List.Item>
                )}
              />
            </div>

            <div className="detail-section">
              <div className="detail-section-title">价格信息</div>
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>成本价</div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>¥{detailDrawer.costPrice}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ textAlign: 'center', borderColor: '#ff4d4f' }}>
                    <div style={{ color: '#ff4d4f', fontSize: 12 }}>对外报价</div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4, color: '#ff4d4f' }}>¥{detailDrawer.basePrice}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ textAlign: 'center', borderColor: '#faad14' }}>
                    <div style={{ color: '#faad14', fontSize: 12 }}>底线价格</div>
                    <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4, color: '#faad14' }}>¥{detailDrawer.minPrice}</div>
                  </Card>
                </Col>
              </Row>
              <div style={{ marginTop: 12, color: '#52c41a', fontWeight: 600 }}>
                🛡️ 质保期：{detailDrawer.warrantyDays}天
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
