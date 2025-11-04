import { useState } from "react";
import { Modal, Button } from "antd";

interface MyModalProps {
  title?: string;
  trigger?: React.ReactNode; // nút mở modal
  children?: React.ReactNode; // nội dung modal
  onOk?: () => void;
  onCancel?: () => void;
}

export default function MyModal({
  title = "Thông báo",
  trigger,
  children,
  onOk,
  onCancel,
}: MyModalProps) {
  const [open, setOpen] = useState(false);

  const handleOk = () => {
    if (onOk) onOk();
    setOpen(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    setOpen(false);
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="primary" onClick={() => setOpen(true)}>
          Mở Modal
        </Button>
      )}

      <Modal
        title={title}
        open={open}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        {children ?? <p>Nội dung modal ở đây...</p>}
      </Modal>
    </>
  );
}
