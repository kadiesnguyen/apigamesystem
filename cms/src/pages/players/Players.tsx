import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { fetchPlayers, type PlayerRow } from "@/services/players";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n}`;
  }
}

export default function Players() {
  const navigate = useNavigate(); // 👈
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [total, setTotal] = useState(0);

  // bộ lọc/params
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [partnerId, setPartnerId] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<
    "id.asc" | "id.desc" | "created_at.desc" | "created_at.asc"
  >("id.asc");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchPlayers({ page, pageSize, q, partnerId, sort });
      setRows(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, q, partnerId, sort]);

  const columns: ColumnsType<PlayerRow> = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 90, sorter: true },
      {
        title: "Partner",
        dataIndex: "partner_id",
        width: 110,
        render: (v) => <Tag color="blue">#{v}</Tag>,
      },
      { title: "Username", dataIndex: "username", ellipsis: true },
      {
        title: "Số dư",
        dataIndex: "total_balance",
        align: "right",
        width: 140,
        render: (v) => <Text strong>{formatCurrency(Number(v))}</Text>, // 👈 format
      },
      {
        title: "Tạo lúc",
        dataIndex: "created_at",
        width: 180,
        render: (t) => new Date(t).toLocaleString("vi-VN"),
      },
      {
        title: "Hành động",
        dataIndex: "actions",
        width: 130,
        render: (_v, r) => (
          <Button type="link" onClick={() => navigate(`/players/${r.id}`)}>
            Chi tiết
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const onChange = (p: TablePaginationConfig, _filters: any, sorter: any) => {
    if (p.current) setPage(p.current);
    if (p.pageSize) setPageSize(p.pageSize);
    if (sorter?.field) {
      const field = sorter.field === "id" ? "id" : "created_at";
      const order = sorter.order === "descend" ? "desc" : "asc";
      setSort(`${field}.${order}` as any);
    }
  };

  return (
    <Card>
      <Flex
        align="center"
        justify="space-between"
        wrap="wrap"
        gap={12}
        style={{ marginBottom: 12 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Danh sách người chơi
        </Title>
        <Space wrap>
          <Input
            allowClear
            placeholder="Tìm username…"
            prefix={<SearchOutlined />}
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value.trim());
            }}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder="Lọc theo Partner"
            value={partnerId}
            onChange={(v) => {
              setPage(1);
              setPartnerId(v);
            }}
            style={{ width: 180 }}
            options={[
              { value: 1, label: "Partner #1" },
              { value: 12, label: "Partner #12" },
            ]}
          />
          <Select
            value={sort}
            onChange={(v) => setSort(v as any)}
            style={{ width: 200 }}
            options={[
              { value: "id.asc", label: "ID ↑" },
              { value: "id.desc", label: "ID ↓" },
              { value: "created_at.desc", label: "Mới nhất" },
              { value: "created_at.asc", label: "Cũ nhất" },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Tải lại
          </Button>
        </Space>
      </Flex>

      <Table<PlayerRow>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        onChange={onChange}
        // 👇 click cả dòng để đi vào chi tiết (tuỳ chọn)
        onRow={(record) => ({
          onClick: () => navigate(`/players/${record.id}`),
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `Tổng ${t} người chơi`,
        }}
      />
    </Card>
  );
}
