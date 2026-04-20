import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export interface UpdateProjectInput {
    id: ProjectId;
    height: bigint;
    imageRefs: Array<string>;
    canvasJson: string;
    name: string;
    layers: Array<LayerData>;
    width: bigint;
}
export type ProjectId = bigint;
export interface LayerData {
    id: bigint;
    fabricJson: string;
    name: string;
    visible: boolean;
}
export interface CreateProjectInput {
    height: bigint;
    imageRefs: Array<string>;
    canvasJson: string;
    name: string;
    layers: Array<LayerData>;
    width: bigint;
}
export interface Project {
    id: ProjectId;
    height: bigint;
    imageRefs: Array<string>;
    owner: Principal;
    canvasJson: string;
    name: string;
    createdAt: Timestamp;
    layers: Array<LayerData>;
    updatedAt: Timestamp;
    width: bigint;
}
export interface ProjectSummary {
    id: ProjectId;
    height: bigint;
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    width: bigint;
}
export interface backendInterface {
    createProject(input: CreateProjectInput): Promise<ProjectId>;
    deleteProject(id: ProjectId): Promise<boolean>;
    listProjects(): Promise<Array<ProjectSummary>>;
    loadProject(id: ProjectId): Promise<Project | null>;
    saveProject(input: UpdateProjectInput): Promise<boolean>;
}
