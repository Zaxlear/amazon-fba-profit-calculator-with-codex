import { useAppStore } from "../store";

export function useProjects() {
  const projects = useAppStore((s) => s.projects);
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentProjectMeta = useAppStore((s) => s.currentProjectMeta);

  const refreshProjects = useAppStore((s) => s.refreshProjects);
  const selectProject = useAppStore((s) => s.selectProject);
  const loadProject = useAppStore((s) => s.loadProject);
  const saveProject = useAppStore((s) => s.saveProject);
  const branchFromSelected = useAppStore((s) => s.branchFromSelected);
  const deleteSelected = useAppStore((s) => s.deleteSelected);

  return {
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
  };
}

