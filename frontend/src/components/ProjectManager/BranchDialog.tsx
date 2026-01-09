import { Form, Input, Modal } from "antd";

export function BranchDialog(props: {
  open: boolean;
  onCancel: () => void;
  onSubmit: (name: string, description: string) => void;
}) {
  const { open, onCancel, onSubmit } = props;
  const [form] = Form.useForm();

  return (
    <Modal
      open={open}
      title="创建预测分支"
      okText="创建"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then((values) => onSubmit(values.name, values.description ?? ""))
          .catch(() => {});
      }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ name: "", description: "" }}>
        <Form.Item
          label="分支名称"
          name="name"
          rules={[{ required: true, message: "请输入分支名称" }]}
        >
          <Input placeholder="例如：乐观预测 - 日销10件" />
        </Form.Item>
        <Form.Item label="分支描述" name="description">
          <Input.TextArea rows={4} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

