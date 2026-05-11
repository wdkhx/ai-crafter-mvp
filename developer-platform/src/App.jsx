import {
  ApiOutlined,
  AppstoreOutlined,
  ExperimentOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  RocketOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Layout,
  List,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getData, postData } from './api.js';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

const menu = [
  { key: 'intelligence', label: '技术情报中心', icon: <ExperimentOutlined /> },
  { key: 'components', label: 'Agent 组件库', icon: <AppstoreOutlined /> },
  { key: 'workflow', label: '工作流编排器', icon: <NodeIndexOutlined /> },
  { key: 'gateway', label: 'API 网关', icon: <ApiOutlined /> }
];

export default function App() {
  const [active, setActive] = useState('intelligence');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [components, setComponents] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [intelligence, setIntelligence] = useState([]);

  const publishedWorkflow = useMemo(() => workflows.find((item) => item.workflowId === 'paper-writing-fixed-v1'), [workflows]);

  async function loadAll() {
    setLoading(true);
    try {
      const [nextMetrics, nextComponents, nextWorkflows, nextIntelligence] = await Promise.all([
        getData('/platform/metrics'),
        getData('/platform/components'),
        getData('/platform/workflows'),
        getData('/platform/intelligence')
      ]);
      setMetrics(nextMetrics);
      setComponents(nextComponents);
      setWorkflows(nextWorkflows);
      setIntelligence(nextIntelligence);
    } catch (error) {
      message.error(error.response?.data?.message || '加载失败，请确认后端已启动');
    } finally {
      setLoading(false);
    }
  }

  async function refreshIntelligence() {
    setLoading(true);
    try {
      const data = await postData('/platform/intelligence/refresh');
      setIntelligence(data);
      message.success('技术情报已刷新');
    } catch (error) {
      message.error(error.response?.data?.message || '刷新失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <Layout className="app-shell">
      <Sider width={260} className="side">
        <div className="brand">
          <RocketOutlined />
          <span>AI CRAFTER</span>
        </div>
        <div className="menu">
          {menu.map((item) => (
            <button
              key={item.key}
              className={active === item.key ? 'menu-item active' : 'menu-item'}
              onClick={() => setActive(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </Sider>
      <Layout>
        <Header className="topbar">
          <div>
            <Title level={3}>Agent 工具生产平台</Title>
            <Text type="secondary">独立于小程序的工作流配置、组件管理与技术情报系统</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadAll}>刷新</Button>
        </Header>
        <Content className="content">
          <Alert
            className="notice"
            type="info"
            showIcon
            message="MVP 边界"
            description="开发者平台只管理 Agent 组件、工作流、技术情报和 API 状态，不直接处理 C 端用户请求。"
          />
          {loading ? (
            <div className="loading"><Spin size="large" /></div>
          ) : (
            <>
              <Metrics metrics={metrics} />
              {active === 'intelligence' && <Intelligence data={intelligence} onRefresh={refreshIntelligence} />}
              {active === 'components' && <Components data={components} />}
              {active === 'workflow' && <Workflow workflow={publishedWorkflow} />}
              {active === 'gateway' && <Gateway />}
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

function Metrics({ metrics }) {
  return (
    <Row gutter={[16, 16]} className="metric-row">
      <Col xs={12} lg={6}><Card><Statistic title="任务成功率" value={metrics?.success_rate || 0} suffix="%" /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="运行中任务" value={metrics?.running_tasks || 0} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="Agent 组件" value={metrics?.components || 0} /></Card></Col>
      <Col xs={12} lg={6}><Card><Statistic title="技术情报" value={metrics?.intelligence_items || 0} /></Card></Col>
    </Row>
  );
}

function Intelligence({ data, onRefresh }) {
  return (
    <Card
      title="技术情报中心"
      extra={<Button type="primary" icon={<ReloadOutlined />} onClick={onRefresh}>抓取最新情报</Button>}
    >
      <List
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={<a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>}
              description={
                <Space direction="vertical" size={6}>
                  <Text>{item.summary}</Text>
                  <Text type="secondary">应用建议：{item.applicationAdvice}</Text>
                  <Space wrap>
                    <Tag color="blue">{item.source}</Tag>
                    {(item.tags || []).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    <Tag color="green">评分 {item.rating}/5</Tag>
                  </Space>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}

function Components({ data }) {
  const columns = [
    { title: '组件名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', render: (value) => <Tag color="blue">{value}</Tag> },
    { title: '版本', dataIndex: 'version' },
    { title: '描述', dataIndex: 'description' }
  ];
  return <Card title="Agent 组件库"><Table rowKey="componentId" columns={columns} dataSource={data} pagination={false} /></Card>;
}

function Workflow({ workflow }) {
  if (!workflow) return <Card>暂无工作流，请先运行 seed。</Card>;
  return (
    <Card title={workflow.name}>
      <Descriptions bordered column={2} className="workflow-desc">
        <Descriptions.Item label="版本">{workflow.version}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color="green">{workflow.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="最长耗时">{workflow.config?.maxDurationMinutes} 分钟</Descriptions.Item>
        <Descriptions.Item label="取消任务">{workflow.config?.allowCancel ? '支持' : '不支持'}</Descriptions.Item>
      </Descriptions>
      <Timeline
        className="workflow-line"
        items={(workflow.nodes || []).map((node) => ({
          color: node.type === 'agent' ? 'blue' : 'green',
          children: <span>{node.label}</span>
        }))}
      />
    </Card>
  );
}

function Gateway() {
  return (
    <Card title="API 网关">
      <Paragraph>小程序端通过标准 REST API 调用后端，不感知 Agent 组件和工作流内部实现。</Paragraph>
      <div className="endpoint">POST /api/v1/tools/paper-writing</div>
      <div className="endpoint">GET /api/v1/tasks/:taskId</div>
      <div className="endpoint">GET /api/v1/history</div>
      <div className="endpoint">POST /api/v1/tasks/:taskId/cancel</div>
    </Card>
  );
}
