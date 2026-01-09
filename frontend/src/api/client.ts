import type {
  BranchCreateRequest,
  FBACalculationResult,
  FBACalculatorInput,
  ProjectCreateRequest,
  ProjectNode,
  ProjectUpdateRequest,
  SavedProject,
  Settings
} from "../types";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export async function apiCalculate(
  input: FBACalculatorInput
): Promise<FBACalculationResult> {
  return requestJson<FBACalculationResult>("/api/calculate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function apiGetSettings(): Promise<Settings> {
  return requestJson<Settings>("/api/settings");
}

export async function apiUpdateSettings(settings: Settings): Promise<Settings> {
  return requestJson<Settings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings)
  });
}

export async function apiListProjects(): Promise<ProjectNode[]> {
  return requestJson<ProjectNode[]>("/api/projects");
}

export async function apiGetProject(id: string): Promise<SavedProject> {
  return requestJson<SavedProject>(`/api/projects/${encodeURIComponent(id)}`);
}

export async function apiCreateProject(
  payload: ProjectCreateRequest
): Promise<SavedProject> {
  return requestJson<SavedProject>("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function apiUpdateProject(
  id: string,
  payload: ProjectUpdateRequest
): Promise<SavedProject> {
  return requestJson<SavedProject>(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function apiDeleteProject(id: string): Promise<{ deletedIds: string[] }> {
  return requestJson<{ deletedIds: string[] }>(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function apiCreateBranch(
  parentId: string,
  payload: BranchCreateRequest
): Promise<SavedProject> {
  return requestJson<SavedProject>(
    `/api/projects/${encodeURIComponent(parentId)}/branch`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

