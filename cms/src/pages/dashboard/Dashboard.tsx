import React from "react";
import { Card, List, Button, Tag, Typography, Flex } from "antd";
import {
  CalendarOutlined,
  ToolOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const fakeNotices = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  title: `Game Maintenance Notice #${i + 1}`,
  at: "08-12 11:49",
  status: "Công bố",
}));

/**
 * CalendarPlaceholderAnt — lưới giờ x ngày theo phong cách demo.
 * Sử dụng CSS Grid + token của AntD để đồng bộ màu/bo góc.
 */
function CalendarPlaceholderAnt() {
  // cột đầu trống + 12 cột giờ (00..11)
  const hours = ["", ...Array.from({ length: 12 }, (_, i) => String(i).padStart(2, "0"))];
  const days = ["Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy", "CN"];

  // màu sắc nhẹ nhàng theo theme token
  const headerBg = "#0e1526";
  const cellGapBg = "#1b2640";
  const cellBg = "var(--ant-color-bg-container)"; // theo theme hiện tại

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        background: cellGapBg, // đường kẻ
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px repeat(12, 1fr)",
          gap: 1, // kẻ ô
          background: cellGapBg,
        }}
      >
        {/* hàng header giờ */}
        {hours.map((h, idx) => (
          <div
            key={`h-${idx}`}
            style={{
              background: headerBg,
              textAlign: "center",
              padding: "8px 6px",
              color: "#9BB0D2",
              fontSize: 12,
            }}
          >
            {h && `${h}:00`}
          </div>
        ))}

        {/* 7 hàng ngày + 12 cột giờ mỗi hàng */}
        {days.map((d, rIdx) => (
          <React.Fragment key={`r-${rIdx}`}>
            {/* nhãn ngày (cột 0) */}
            <div
              style={{
                background: headerBg,
                color: "#BBD0F0",
                fontSize: 12,
                padding: "8px 10px",
                whiteSpace: "nowrap",
              }}
            >
              {d}
            </div>

            {/* 12 ô giờ */}
            {Array.from({ length: 12 }).map((_, cIdx) => (
              <div
                key={`c-${rIdx}-${cIdx}`}
                style={{
                  background: cellBg,
                  height: 40,
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div style={{ padding: 16 }}>
      <Flex gap={16} wrap={false}>
        {/* Cột trái: Thông báo bảo trì */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <ToolOutlined />
              <span>Thông báo bảo trì</span>
            </Flex>
          }
          style={{ width: 360, flex: "0 0 360px" }}
          styles={{
            body: { padding: 12, maxHeight: "70vh", overflow: "auto" },
          }}
        >
          <List
            dataSource={fakeNotices}
            split={false}
            renderItem={(n) => (
              <List.Item
                key={n.id}
                style={{
                  background: "#0e1526",
                  border: "1px solid #1b2640",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}
              >
                <Flex vertical gap={6} style={{ width: "100%" }}>
                  <Text style={{ color: "#E6F0FF" }}>{n.title}</Text>
                  <Flex align="center" gap={8}>
                    <CalendarOutlined style={{ color: "#9BB0D2" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {n.at}
                    </Text>
                    <Tag color="blue" style={{ marginLeft: "auto" }}>
                      {n.status}
                    </Tag>
                  </Flex>
                  <Button
                    size="small"
                    icon={<ArrowRightOutlined />}
                    style={{
                      width: "fit-content",
                      background: "#1f2a48",
                      color: "#E6F0FF",
                      borderColor: "#243255",
                    }}
                  >
                    Thao tác bảo trì trò chơi
                  </Button>
                </Flex>
              </List.Item>
            )}
          />
        </Card>

        {/* Cột phải: Lịch thao tác & bảo trì */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <CalendarOutlined />
              <span>Lịch Thao tác & bảo trì</span>
            </Flex>
          }
          style={{ width: "100%" }}
          styles={{ body: { padding: 12 } }}
        >
          <CalendarPlaceholderAnt />
        </Card>
      </Flex>
    </div>
  );
}
