import React, { useRef, useState } from "react";
import { Card, Form, Input, Button, Select, Checkbox, Typography } from "antd";
import {
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  GlobalOutlined,
} from "@ant-design/icons";
import background from "@/assets/images/BG.webp";
import { useAuth } from "@/store/auth";
import { http, setAccessToken } from "@/lib/http";
import { useNavigate } from "react-router-dom";
const { Title, Text } = Typography;
import AppMessage, { AppMessageRef } from "@/components/AppMessage";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const msgRef = useRef<AppMessageRef>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    msgRef.current?.clear();

    try {
      const res = await http(`/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({
          username: values.username?.trim(),
          password: values.password,
          remember: values.remember === true,
          ua: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const errMsg =
          res.status === 401
            ? "Sai tài khoản hoặc mật khẩu."
            : "Đăng nhập thất bại, vui lòng thử lại.";
        msgRef.current?.showError(errMsg);
        return;
      }

      const { accessToken } = await res.json();
      console.log("Access token received:", accessToken);
      setAccessToken(accessToken);
      setAuth({ token: accessToken });
      msgRef.current?.showSuccess("Đăng nhập thành công!");
      setTimeout(() => navigate("/dashboard", { replace: true }), 500);
    } catch (e) {
      msgRef.current?.showError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <Card
        style={{
          width: 360,
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {/* <img src="/logo.png" alt="TC Gaming" style={{ height: 48, marginBottom: 8 }} /> */}
          <Title level={3} style={{ color: "#fff", margin: 0 }}>
            CMS
          </Title>
          <Text style={{ color: "#ddd" }}>đăng nhập vào tài khoản của bạn</Text>
        </div>

        <Form
          name="login"
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ remember: true, language: "vi" }}
        >
          <Form.Item
            label={<span style={{ color: "#fff" }}>Tài khoản</span>}
            name="username"
            rules={[{ required: true, message: "Vui lòng nhập tài khoản" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nhập tên tài khoản"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: "#fff" }}>Mật khẩu</span>}
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>
          {/* 
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Form.Item name="language" style={{ flex: 1, marginBottom: 0 }}>
              <Select
                prefix={<GlobalOutlined />}
                options={[
                  { value: "vi", label: "Tiếng Việt" },
                  { value: "en", label: "English" },
                  { value: "zh", label: "中文" },
                ]}
              />
            </Form.Item>
            <a href="#" style={{ marginTop: 4 }}>
              Quên mật khẩu?
            </a>
          </div> */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>
                {<span style={{ color: "#fff" }}>Nhớ mật khẩu?</span>}
              </Checkbox>
            </Form.Item>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", fontSize: 11, color: "#aaa" }}>
          Copyright © 2025
        </div>
      </Card>
      <AppMessage ref={msgRef} autoHide />
    </div>
  );
}
