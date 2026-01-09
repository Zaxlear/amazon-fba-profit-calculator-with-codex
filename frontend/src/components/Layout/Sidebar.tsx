import { Layout } from "antd";

import { ProjectTree } from "../ProjectManager/ProjectTree";

export function Sidebar() {
  return (
    <Layout.Sider width={320} theme="light" breakpoint="lg" collapsedWidth={0}>
      <div className="h-full p-3">
        <ProjectTree />
      </div>
    </Layout.Sider>
  );
}

