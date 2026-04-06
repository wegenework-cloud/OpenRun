import type { LocalWorkspaceState } from "../types";

const LOCAL_WORKSPACE_KEY = "openrun.workspace.v1";

export function loadLocalWorkspaceState(
  defaultValue: LocalWorkspaceState,
): LocalWorkspaceState {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const storedValue = window.localStorage.getItem(LOCAL_WORKSPACE_KEY);

    if (!storedValue) {
      return defaultValue;
    }

    const parsed = JSON.parse(storedValue) as Partial<LocalWorkspaceState>;
    return { ...defaultValue, ...parsed };
  } catch {
    return defaultValue;
  }
}

export function saveLocalWorkspaceState(value: LocalWorkspaceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_WORKSPACE_KEY, JSON.stringify(value));
}
