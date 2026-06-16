import { useEffect, useState } from 'react';
import { Tabs, Badge, Button, Space, App as AntApp } from 'antd';
import {
  CarOutlined, AuditOutlined, CalculatorOutlined,
  TeamOutlined, TruckOutlined, SafetyOutlined,
  BellOutlined, LoadingOutlined
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
  const loadFromStorage = useAppStore(state => state.loadFromStorage);
  const checkExpiredReservations = useAppStore(state => state.checkExpiredReservations);
  const quotes = useAppStore(state => state.quotes);
  const shipments = useAppStore(state => state.shipments);
  const warrantyClaims = useAppStore(state => state.warrantyClaims);
  const currentUser = useAppStore(state => state.currentUser);
  const { message } = AntApp.useApp();

  const [now, setNow] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));
  const [loading, setLoading] = useState(true);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const hasData = await loadFromStorage();
        if (!hasData) {
          initMockData();
          message.info('首次启动，已加载演示数据');
        } else {
          message.success('数据加载成功');
        }
        const released = checkExpiredReservations();
        if (released > 0) {
          setExpiredCount(released);
          message.warning(`检测到 ${released} 个过期预留件，已自动释放回可售库存`);
        }
      } catch (e) {
        console.error('初始化失败:', e);
        initMockData();
      } finally {
        setLoading(false);
      }
    };
    init();

    const timeTimer = setInterval(() => {
      setNow(dayjs().format('YYYY-MM-DD HH:mm:ss'));
    }, 1000);

    const expiredTimer = setInterval(() => {
      const released = checkExpiredReservations();
      if (released > 0) {
        setExpiredCount(c => c + released);
        message.warning(`自动释放 ${released} 个过期预留件`);
      }
    }, 60 * 1000);

    return () => {
      clearInterval(timeTimer);
      clearInterval(expiredTimer);
    };
  }, [initMockData, loadFromStorage, checkExpiredReservations]);

  const negotiatingQuotes = quotes.filter(q => q.status === 'negotiating').length;
  const pendingShipments = shipments.filter(s => s.status === 'pending' || s.status === 'packed').length;
  const pendingClaims = warrantyClaims.filter(w => w.status === 'pending').length;

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: 18, color: '#666',
        background: '#f0f2f5'
      }}>
        <Space>
          <LoadingOutlined style={{ fontSize: 24 }} />
          正在加载数据...
        </Space>
      </div>
    );
  }

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
