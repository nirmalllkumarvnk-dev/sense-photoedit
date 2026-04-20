import type { backendInterface } from "../backend";

export const mockBackend: backendInterface = {
  createProject: async (_input) => BigInt(1),
  deleteProject: async (_id) => true,
  listProjects: async () => [
    {
      id: BigInt(1),
      height: BigInt(768),
      name: "Mountain Landscape",
      createdAt: BigInt(Date.now() * 1_000_000),
      updatedAt: BigInt(Date.now() * 1_000_000),
      width: BigInt(1024),
    },
  ],
  loadProject: async (_id) => ({
    id: BigInt(1),
    height: BigInt(768),
    imageRefs: [],
    owner: { toText: () => "aaaaa-aa" } as any,
    canvasJson: "{}",
    name: "Mountain Landscape",
    createdAt: BigInt(Date.now() * 1_000_000),
    layers: [
      {
        id: BigInt(1),
        fabricJson: "{}",
        name: "Background",
        visible: true,
      },
    ],
    updatedAt: BigInt(Date.now() * 1_000_000),
    width: BigInt(1024),
  }),
  saveProject: async (_input) => true,
};
