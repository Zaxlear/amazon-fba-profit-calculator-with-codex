import { Form, Input, Modal } from "antd";

export function SaveDialog(props: {
  open: boolean;
  title: string;
  initialName?: string;
  initialDescription?: string;
  onCancel: () => void;
  onSubmit: (name: string, description: string) => void;
}) {
  const { open, title, initialName, initialDescription, onCancel, onSubmit } = props;
  const [form] = Form.useForm();

  return (
    <Modal
      open={open}
      title={title}
      okText="保存"
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
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: initialName ?? "", description: initialDescription ?? "" }}
      >
        <Form.Item
          label="项目名称"
          name="name"
          rules={[{ required: true, message: "请输入项目名称" }]}
        >
          <Input placeholder="例如：iPhone 15 手机壳利润预估" />
        </Form.Item>
        <Form.Item label="项目描述" name="description">
          <Input.TextArea rows={4} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

