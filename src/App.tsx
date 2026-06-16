import { useEffect, useState } from 'react';
import { Tabs, Badge, Button, Space } from 'antd';
import {
  CarOutlined, AuditOutlined, CalculatorOutlined,
  TeamOutlined, TruckOutlined, SafetyOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAppStore } from '@/store/appStore';
import VehicleInbound from '@/pages/VehicleInbound';
import PartRating from '@/pages/PartRating';
import QuotationDesk from '@/pages/QuotationDesk';
import CustomerSeat from '@/pages/CustomerSeat';
import ShippingDesk from '@/pages/ShippingDesk';
import AfterSales from '@/pages/AfterSales';
import dayjs from 'dayjs';

export default function App() {
  const initMockData = useAppStore(state => state.initMockData);
  const quotes = useAppStore(state => state.quotes);
  const shipments = useAppStore(state => state.shipments);
  const warrantyClaims = useAppStore(state => state.warrantyClaims);
  const currentUser = useAppStore(state => state.currentUser);

  const [now, setNow] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));

  useEffect(() => {
    initMockData();
    const timer = setInterval(() => {
      setNow(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, [initMockData]);

  const negotiatingQuotes = quotes.filter(q => q.status === 'negotiating').length;
  const pendingShipments = shipments.filter(s => s.status === 'pending' || s.status === 'packed').length;
  const pendingClaims = warrantyClaims.filter(w => w.status === 'pending').length;

  const tabItems = [
    {
      key: 'inbound',
      label: (
        <Space>
          <CarOutlined />
          车辆拆解入库
        </Space>
      ),
      children: <VehicleInbound />
    },
    {
      key: 'rating',
      label: (
        <Space>
          <AuditOutlined />
          件品评级
        </Space>
      ),
      children: <PartRating />
    },
    {
      key: 'quotation',
      label: (
        <Space>
          <Badge count={negotiatingQuotes} size="small" offset={[6, 2]} color="#faad14">
            <CalculatorOutlined />
          </Badge>
          报价台
        </Space>
      ),
      children: <QuotationDesk />
    },
    {
      key: 'customer',
      label: (
        <Space>
          <TeamOutlined />
          客户席位
        </Space>
      ),
      children: <CustomerSeat />
    },
    {
      key: 'shipping',
      label: (
        <Space>
          <Badge count={pendingShipments} size="small" offset={[6, 2]} color="#1677ff">
            <TruckOutlined />
          </Badge>
          发货台
        </Space>
      ),
      children: <ShippingDesk />
    },
    {
      key: 'aftersales',
      label: (
        <Space>
          <Badge count={pendingClaims} size="small" offset={[6, 2]} color="#ff4d4f">
            <SafetyOutlined />
          </Badge>
          售后记录
        </Space>
      ),
      children: <AfterSales />
    }
  ];

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">🔧</div>
          拆车场报价工作台
          <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8, fontWeight: 400 }}>
            专业拆车件交易前台
          </span>
        </div>
        <div className="app-header-right">
          <span className="time-info">{now}</span>
          <Button
            type="text"
            icon={<BellOutlined style={{ color: '#fff' }} />}
            style={{ color: '#fff' }}
          >
            消息
            {(negotiatingQuotes + pendingShipments + pendingClaims) > 0 && (
              <Badge
                count={negotiatingQuotes + pendingShipments + pendingClaims}
                size="small"
                style={{ marginLeft: 6 }}
              />
            )}
          </Button>
          <span className="user-info">
            👤 {currentUser}
          </span>
        </div>
      </div>

      <Tabs
        className="main-tabs"
        defaultActiveKey="inbound"
        size="large"
        items={tabItems}
        destroyOnHidden={false}
      />
    </div>
  );
}
