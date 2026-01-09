import { Button, Divider, Empty, Modal, Space, Tree, Typography } from "antd";
import type { DataNode } from "antd/es/tree";
import { useState } from "react";

import type { ProjectNode } from "../../types";
import { useProjects } from "../../hooks/useProjects";
import { BranchDialog } from "./BranchDialog";
import { SaveDialog } from "./SaveDialog";

function toTreeData(nodes: ProjectNode[]): DataNode[] {
  const build = (n: ProjectNode): DataNode => ({
    key: n.project.id,
    title: (
      <span>
        <Typography.Text strong>{n.project.branchPath}</Typography.Text>
        <Typography.Text className="ml-2">{n.project.name}</Typography.Text>
      </span>
    ),
    children: n.children.map(build)
  });
  return nodes.map(build);
}

export function ProjectTree() {
  const {
    projects,
    selectedProjectId,
    currentProjectId,
    currentProjectMeta,
    refreshProjects,
    selectProject,
    loadProject,
    saveProject,
    branchFromSelected,
    deleteSelected
  } = useProjects();

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<"create" | "update">("create");
  const [branchOpen, setBranchOpen] = useState(false);

  const canUpdate = Boolean(currentProjectId && currentProjectMeta);

  return (
    <div className="h-full flex flex-col">
      <Space wrap>
        <Button onClick={() => void refreshProjects()}>刷新</Button>
        <Button
          type="primary"
          onClick={() => {
            setSaveMode("create");
            setSaveOpen(true);
          }}
        >
          新建保存
        </Button>
        <Button
          disabled={!canUpdate}
          onClick={() => {
            setSaveMode("update");
            setSaveOpen(true);
          }}
        >
          更新保存
        </Button>
      </Space>

      <Divider style={{ margin: "12px 0" }} />

      {projects.length === 0 ? (
        <Empty description="暂无项目" />
      ) : (
        <Tree
          className="flex-1 overflow-auto"
          defaultExpandAll
          selectedKeys={selectedProjectId ? [selectedProjectId] : []}
          onSelect={(keys) => selectProject((keys[0] as string) ?? null)}
          treeData={toTreeData(projects)}
        />
      )}

      <Divider style={{ margin: "12px 0" }} />

      <Space wrap>
        <Button disabled={!selectedProjectId} onClick={() => void loadProject()}>
          加载到计算器
        </Button>
        <Button disabled={!selectedProjectId} onClick={() => setBranchOpen(true)}>
          创建分支
        </Button>
        <Button
          danger
          disabled={!selectedProjectId}
          onClick={() => {
            Modal.confirm({
              title: "确认删除？",
              content: "将级联删除所有子分支。",
              okText: "删除",
              okButtonProps: { danger: true },
              cancelText: "取消",
              onOk: async () => void deleteSelected()
            });
          }}
        >
          删除
        </Button>
      </Space>

      <SaveDialog
        open={saveOpen}
        title={saveMode === "create" ? "保存新项目" : "更新当前项目"}
        initialName={saveMode === "update" ? currentProjectMeta?.name : undefined}
        initialDescription={saveMode === "update" ? currentProjectMeta?.description : undefined}
        onCancel={() => setSaveOpen(false)}
        onSubmit={(name, description) => {
          setSaveOpen(false);
          void saveProject({ name, description }, saveMode);
        }}
      />

      <BranchDialog
        open={branchOpen}
        onCancel={() => setBranchOpen(false)}
        onSubmit={(name, description) => {
          setBranchOpen(false);
          void branchFromSelected({ name, description });
        }}
      />
    </div>
  );
}
