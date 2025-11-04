// src/components/AppMessage.tsx
import React, { useState } from "react";
import { Alert, message } from "antd";

export interface AppMessageRef {
  showError: (msg: string, toast?: boolean) => void;
  showSuccess: (msg: string, toast?: boolean) => void;
  clear: () => void;
}

interface Props {
  autoHide?: boolean;
}

const AppMessage = React.forwardRef<AppMessageRef, Props>(
  ({ autoHide = false }, ref) => {
    const [errorText, setErrorText] = useState<string | null>(null);
    const [successText, setSuccessText] = useState<string | null>(null);
    const [msgApi, contextHolder] = message.useMessage();
    React.useImperativeHandle(ref, () => ({
      showError: (msg, toast = true) => {
        setErrorText(msg);
        setSuccessText(null);
        if (toast) msgApi.error(msg);
        if (autoHide) setTimeout(() => setErrorText(null), 5000);
      },
      showSuccess: (msg, toast = true) => {
        setSuccessText(msg);
        setErrorText(null);
        if (toast) msgApi.success(msg);
        if (autoHide) setTimeout(() => setSuccessText(null), 5000);
      },
      clear: () => {
        setErrorText(null);
        setSuccessText(null);
      },
    }));

    return (
      <>
        {contextHolder}
        {/* {errorText && (
          <Alert
            type="error"
            showIcon
            message="Lỗi"
            description={errorText}
            style={{ marginBottom: 12 }}
          />
        )}
        {successText && (
          <Alert
            type="success"
            showIcon
            message="Thành công"
            description={successText}
            style={{ marginBottom: 12 }}
          />
        )} */}
      </>
    );
  }
);

export default AppMessage;
