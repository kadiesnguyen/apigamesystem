import { useEffect, useState } from "react";
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
    InputNumber,
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

function formatDateTime(dateStr: string) {
    return dayjs(dateStr).format("DD/MM/YYYY HH:mm:ss");
}

export default function GameLogs() {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<GameLogRow[]>([]);
    const [total, setTotal] = useState(0);

    // Filter parameters
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [q, setQ] = useState("");
    const [partnerId, setPartnerId] = useState<number | undefined>(undefined);
    const [gameId, setGameId] = useState<number | undefined>(undefined);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [sort, setSort] = useState<GameLogQuery['sort']>("t.desc");

    const load = async () => {
        setLoading(true);
        try {
            const params: GameLogQuery = {
                page,
                pageSize,
                q: q.trim() || undefined,
                partnerId,
                gameId,
                sort,
            };

            if (dateRange) {
                params.dateFrom = dateRange[0].toISOString();
                params.dateTo = dateRange[1].toISOString();
            }

            const res = await fetchGameLogs(params);
            setRows(res.data);
            setTotal(res.total);
        } catch (err) {
            console.error("Failed to load game logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [page, pageSize, partnerId, gameId, sort]);

    const handleSearch = () => {
        setPage(1);
        load();
    };

    const handleReset = () => {
        setPage(1);
        setQ("");
        setPartnerId(undefined);
        setGameId(undefined);
        setDateRange(null);
        setSort("t.desc");
        // Reset will trigger load via useEffect
    };

    const columns: ColumnsType<GameLogRow> = [
        {
            title: "Time",
            dataIndex: "t",
            key: "t",
            width: 150,
            sorter: true,
            render: (val: string) => (
                <Text style={{ fontSize: 12 }}>{formatDateTime(val)}</Text>
            ),
        },
        {
            title: "Username",
            dataIndex: "username",
            key: "username",
            width: 120,
            render: (val: string) => <Text strong>{val}</Text>,
        },
        {
            title: "Game ID",
            dataIndex: "gid",
            key: "gid",
            width: 80,
            align: "center",
        },
        {
            title: "Partner ID",
            dataIndex: "pid",
            key: "pid",
            width: 80,
            align: "center",
        },
        {
            title: "Bet",
            dataIndex: "bet",
            key: "bet",
            width: 100,
            align: "right",
            sorter: true,
            render: (val: number) => (
                <Text style={{ color: "#d32f2f" }}>{formatCurrency(val)}</Text>
            ),
        },
        {
            title: "Win",
            dataIndex: "win",
            key: "win",
            width: 100,
            align: "right",
            sorter: true,
            render: (val: number) => (
                <Text style={{ color: val > 0 ? "#2e7d32" : "#666" }}>
                    {formatCurrency(val)}
                </Text>
            ),
        },
        {
            title: "Balance Before",
            dataIndex: "bal_b",
            key: "bal_b",
            width: 120,
            align: "right",
            render: (val: number) => formatCurrency(val),
        },
        {
            title: "Balance After",
            dataIndex: "bal_a",
            key: "bal_a",
            width: 120,
            align: "right",
            render: (val: number) => formatCurrency(val),
        },
        {
            title: "Free Spin",
            dataIndex: "free",
            key: "free",
            width: 80,
            align: "center",
            render: (val: boolean, record: GameLogRow) => (
                <Space>
                    {val && <Tag color="blue">FREE</Tag>}
                    {record.fsl && record.fsl > 0 && (
                        <Tag color="cyan">{record.fsl} left</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: "Config Ver",
            dataIndex: "cfgv",
            key: "cfgv",
            width: 80,
            align: "center",
            render: (val?: number) => val || "-",
        },
    ];

    const paginationConfig: TablePaginationConfig = {
        current: page,
        pageSize: pageSize,
        total: total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} logs`,
        onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize ?? 20);
        },
    };

    return (
        <div style={{ padding: "24px" }}>
            <Title level={2}>Game Logs</Title>

            <Card style={{ marginBottom: "16px" }}>
                <Flex wrap="wrap" gap="middle" align="center">
                    <Input
                        placeholder="Search username..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 200 }}
                        prefix={<SearchOutlined />}
                    />

                    <InputNumber
                        placeholder="Partner ID"
                        value={partnerId}
                        onChange={(val) => setPartnerId(val ?? undefined)}
                        style={{ width: 120 }}
                    />

                    <InputNumber
                        placeholder="Game ID"
                        value={gameId}
                        onChange={(val) => setGameId(val ?? undefined)}
                        style={{ width: 120 }}
                    />

                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                        showTime={{ format: "HH:mm" }}
                        format="DD/MM/YYYY HH:mm"
                        style={{ width: 280 }}
                    />

                    <Select
                        value={sort}
                        onChange={setSort}
                        style={{ width: 140 }}
                        options={[
                            { label: "Time ↓", value: "t.desc" },
                            { label: "Time ↑", value: "t.asc" },
                            { label: "Win ↓", value: "win.desc" },
                            { label: "Win ↑", value: "win.asc" },
                            { label: "Bet ↓", value: "bet.desc" },
                            { label: "Bet ↑", value: "bet.asc" },
                        ]}
                    />

                    <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                        Search
                    </Button>

                    <Button icon={<ReloadOutlined />} onClick={handleReset}>
                        Reset
                    </Button>
                </Flex>
            </Card>

            <Card>
                <Table
                    columns={columns}
                    dataSource={rows}
                    rowKey="_id"
                    pagination={paginationConfig}
                    loading={loading}
                    scroll={{ x: 1200 }}
                    size="small"
                />
            </Card>
        </div>
    );
}