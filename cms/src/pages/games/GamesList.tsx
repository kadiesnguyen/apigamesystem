import { useEffect, useMemo, useState } from "react";
import { Table, Tag, Input, Select, Button, Space, Avatar } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { fetchGames, type Game } from "@/services/games";

export default function GamesList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Game["category"] | undefined>();
  const [status, setStatus] = useState<Game["status"] | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    try {
      const { data, total } = await fetchGames({
        q,
        category,
        status,
        page,
        pageSize,
      });
      setRows(data);
      setTotal(total);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [q, category, status, page, pageSize]);

  const columns = useMemo<ColumnsType<Game>>(
    () => [
      {
        title: "Biểu tượng",
        dataIndex: "icon_url",
        key: "icon",
        width: 72,
        render: (v, r) => (
          <Avatar shape="square" src={v ?? undefined}>
            {r.name[0]}
          </Avatar>
        ),
      },
      { title: "ID", dataIndex: "id", key: "id", width: 90 },
      { title: "Mã", dataIndex: "code", key: "code", width: 140 },
      { title: "Tên trò chơi", dataIndex: "name", key: "name" },
      { title: "Loại", dataIndex: "category", key: "category", width: 110 },
      {
        title: "RTP",
        dataIndex: "rtp",
        key: "rtp",
        width: 90,
        render: (v) => `${v}%`,
      },
      {
        title: "Độ biến động",
        dataIndex: "volatility",
        key: "volatility",
        width: 130,
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (s) =>
          s === "active" ? (
            <Tag color="green">active</Tag>
          ) : s === "inactive" ? (
            <Tag color="red">inactive</Tag>
          ) : (
            <Tag>draft</Tag>
          ),
      },
      {
        title: "Cập nhật",
        dataIndex: "updated_at",
        key: "updated_at",
        width: 170,
        render: (v) => dayjs(v).format("DD/MM/YYYY HH:mm"),
      },
      {
        title: "Thao tác",
        key: "actions",
        fixed: "right",
        width: 120,
        render: (_, r) => (
          <Space>
            <Button size="small" onClick={() => nav(`/games/${r.id}`)}>
              Quản lý
            </Button>
          </Space>
        ),
      },
    ],
    [nav]
  );

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Tìm theo tên / mã…"
          allowClear
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          style={{ maxWidth: 260 }}
        />
        <Select
          placeholder="Loại"
          allowClear
          style={{ width: 160 }}
          value={category}
          onChange={(v) => {
            setPage(1);
            setCategory(v as any);
          }}
          options={[
            { value: "slot", label: "slot" },
            { value: "table", label: "table" },
            { value: "lottery", label: "lottery" },
          ]}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          style={{ width: 160 }}
          value={status}
          onChange={(v) => {
            setPage(1);
            setStatus(v as any);
          }}
          options={[
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" },
            { value: "draft", label: "draft" },
          ]}
        />
        <div className="flex-1" />
        <Button type="primary" onClick={() => nav("/games/new")}>
          Thêm trò chơi
        </Button>
      </div>
      {/* tạo 1 khoảng trắng */}
      <br />
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        onRow={(record) => ({
          onClick: () => nav(`/games/${record.id}`), // click dòng cũng đi tới trang quản lý
        })}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
          showTotal: (t) => `${t} trò chơi`,
        }}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
