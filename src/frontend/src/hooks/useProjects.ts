/**
 * useProjects — TanStack Query hooks for backend project operations.
 *
 * All data persistence goes through the Internet Computer backend canister
 * via the useActor hook. Never use localStorage or sessionStorage as primary store.
 */

import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type {
  CreateProjectInput,
  Project,
  ProjectId,
  ProjectSummary,
  UpdateProjectInput,
} from "../backend.d.ts";
import type { Layer } from "../types/editor";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (id: bigint) =>
    [...projectKeys.all, "detail", id.toString()] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert frontend Layer[] to backend LayerData[] */
export function layersToBackend(layers: Layer[]) {
  return layers.map((l) => ({
    id: BigInt(l.id),
    name: l.name,
    visible: l.visible,
    fabricJson: l.fabricJson,
  }));
}

/** Convert backend LayerData[] to frontend Layer[] */
export function layersFromBackend(backendLayers: Project["layers"]): Layer[] {
  return backendLayers.map((l) => ({
    id: Number(l.id),
    name: l.name,
    visible: l.visible,
    locked: false,
    opacity: 100,
    blendMode: "normal" as const,
    fabricJson: l.fabricJson,
  }));
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List all projects for the current user */
export function useListProjects() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<ProjectSummary[]>({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProjects();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

/** Load a single project by ID */
export function useLoadProject(id: bigint | null) {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<Project | null>({
    queryKey: projectKeys.detail(id ?? BigInt(0)),
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.loadProject(id);
    },
    enabled: !!actor && !isFetching && id !== null,
    staleTime: 10_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Create a new project in the backend */
export function useCreateProject() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<ProjectId, Error, CreateProjectInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend not connected");
      return actor.createProject(input);
    },
    onSuccess: () => {
      // Invalidate the list so it refreshes
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

/** Save / update an existing project */
export function useSaveProject() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, UpdateProjectInput>({
    mutationFn: async (input) => {
      if (!actor) throw new Error("Backend not connected");
      return actor.saveProject(input);
    },
    onSuccess: (_data, variables) => {
      // Invalidate both list and the specific detail cache
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(variables.id),
      });
    },
  });
}

/** Delete a project by ID */
export function useDeleteProject() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Backend not connected");
      return actor.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}
