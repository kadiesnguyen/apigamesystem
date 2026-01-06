import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    DatePicker,
    Flex,
    Input,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { fetchGameLogs, type GameLogRow, type GameLogQuery } from "@/services/logs";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

export default function GameLogs() {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<GameLogRow[]>([]);
    const [total, setTotal] = useState(0);

    // filters/params
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [q, setQ] = useState("");
    const [partnerId, setPartnerId] = useState<number | undefined>(undefined);
    const [gameId, setGameId] = useState<number | undefined>(undefined);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [sort, setSort] = useState<GameLogQuery["sort"]>("t.desc");

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchGameLogs({
                page,
                pageSize,
                q,
                partnerId,
                gameId,
                dateFrom: dateRange?.[0]?.toISOString(),
                dateTo: dateRange?.[1]?.toISOString(),
                sort,
            });
            setRows(res.data);
            setTotal(res.total);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [page, pageSize, q, partnerId, gameId, dateRange, sort]);

    const columns: ColumnsType<GameLogRow> = useMemo(
        () => [
            {
                title: "Thời gian",
                dataIndex: "t",
                width: 180,
                render: (t) => new Date(t).toLocaleString("vi-VN"),
            },
            {
                title: "Username",
                dataIndex: "username",
                ellipsis: true,
                width: 150,
            },
            {
                title: "Game ID",
                dataIndex: "gid",
                width: 100,
                render: (v) => <Tag color="geekblue">#{v}</Tag>,
            },
            {
                title: "Partner",
                dataIndex: "pid",
                width: 100,
                render: (v) => <Tag color="blue">#{v}</Tag>,
            },
            {
                title: "Đặt cược",
                dataIndex: "bet",
                align: "right",
                width: 130,
                render: (v) => <Text>{formatCurrency(Number(v))}</Text>,
            },
            {
                title: "Thắng",
                dataIndex: "win",
                align: "right",
                width: 130,
                render: (v) => (
                    <Text type={v > 0 ? "success" : undefined} strong={v > 0}>
                        {formatCurrency(Number(v))}
                    </Text>
                ),
            },
            {
                title: "Số dư trước",
                dataIndex: "bal_b",
                align: "right",
                width: 130,
                render: (v) => formatCurrency(Number(v)),
            },
            {
                title: "Số dư sau",
                dataIndex: "bal_a",
                align: "right",
                width: 130,
                render: (v) => formatCurrency(Number(v)),
            },
            {
                title: "Free Spin",
                dataIndex: "free",
                width: 100,
                render: (v, r) =>
                    v ? (
                        <Tag color="green">
                            Free {r.fsl !== undefined ? `(${r.fsl})` : ""}
                        </Tag>
                    ) : (
                        <Tag>No</Tag>
                    ),
            },
        ],
        []
    );

    const onChange = (p: TablePaginationConfig, _filters: any, sorter: any) => {
        if (p.current) setPage(p.current);
        if (p.pageSize) setPageSize(p.pageSize);
        if (sorter?.field) {
            const field = sorter.field === "t" ? "t" : sorter.field === "win" ? "win" : "bet";
            const order = sorter.order === "descend" ? "desc" : "asc";
            setSort(`${field}.${order}` as GameLogQuery["sort"]);
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
                    Lịch sử game
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
                        style={{ width: 200 }}
                    />
                    <Select
                        allowClear
                        placeholder="Partner"
                        value={partnerId}
                        onChange={(v) => {
                            setPage(1);
                            setPartnerId(v);
                        }}
                        style={{ width: 140 }}
                        options={[
                            { value: 1, label: "Partner #1" },
                            { value: 12, label: "Partner #12" },
                        ]}
                    />
                    <Select
                        allowClear
                        placeholder="Game"
                        value={gameId}
                        onChange={(v) => {
                            setPage(1);
                            setGameId(v);
                        }}
                        style={{ width: 140 }}
                        options={[
                            { value: 1, label: "Super Ace" },
                            { value: 2, label: "Sicbo" },
                        ]}
                    />
                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                            setPage(1);
                            setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
                        }}
                        showTime
                        format="DD/MM/YYYY HH:mm"
                    />
                    <Select
                        value={sort}
                        onChange={(v) => setSort(v as GameLogQuery["sort"])}
                        style={{ width: 160 }}
                        options={[
                            { value: "t.desc", label: "Mới nhất" },
                            { value: "t.asc", label: "Cũ nhất" },
                            { value: "win.desc", label: "Thắng cao nhất" },
                            { value: "bet.desc", label: "Cược cao nhất" },
                        ]}
                    />
                    <Button icon={<ReloadOutlined />} onClick={load}>
                        Tải lại
                    </Button>
                </Space>
            </Flex>

            <Table<GameLogRow>
                rowKey="_id"
                loading={loading}
                dataSource={rows}
                columns={columns}
                onChange={onChange}
                pagination={{
                    current: page,
                    pageSize,
                    total,
                    showSizeChanger: true,
                    showTotal: (t) => `Tổng ${t} bản ghi`,
                }}
                scroll={{ x: 1200 }}
                size="middle"
            />
        </Card>
    );
}
