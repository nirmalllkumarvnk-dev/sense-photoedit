// Domain logic for project management
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Types "../types/projects";

module {
  // Internal state types
  public type ProjectStore = Map.Map<Types.ProjectId, Types.Project>;

  // Generate the next available project ID (increments counter)
  public func nextId(counter : Nat) : Nat {
    counter + 1;
  };

  // Create a new project record from input
  public func createProject(
    id : Types.ProjectId,
    owner : Principal,
    input : Types.CreateProjectInput,
    now : Types.Timestamp,
  ) : Types.Project {
    {
      id;
      owner;
      name = input.name;
      canvasJson = input.canvasJson;
      layers = input.layers;
      imageRefs = input.imageRefs;
      width = input.width;
      height = input.height;
      createdAt = now;
      updatedAt = now;
    };
  };

  // Convert a full project to its summary representation
  public func toSummary(project : Types.Project) : Types.ProjectSummary {
    {
      id = project.id;
      name = project.name;
      width = project.width;
      height = project.height;
      createdAt = project.createdAt;
      updatedAt = project.updatedAt;
    };
  };

  // Save (insert or overwrite) a project in the store
  public func saveProject(store : ProjectStore, project : Types.Project) {
    store.add(project.id, project);
  };

  // Load a project by ID, returns null if not found
  public func loadProject(store : ProjectStore, id : Types.ProjectId) : ?Types.Project {
    store.get(id);
  };

  // List all projects owned by a given principal as summaries
  public func listUserProjects(store : ProjectStore, owner : Principal) : [Types.ProjectSummary] {
    let filtered = store.values().filter(func(p : Types.Project) : Bool {
      Principal.equal(p.owner, owner)
    });
    let mapped = filtered.map(func(p : Types.Project) : Types.ProjectSummary { toSummary(p) });
    mapped.toArray();
  };

  // Delete a project by ID; returns true if it existed and was owned by caller
  public func deleteProject(store : ProjectStore, id : Types.ProjectId, caller : Principal) : Bool {
    switch (store.get(id)) {
      case null { false };
      case (?project) {
        if (Principal.equal(project.owner, caller)) {
          store.remove(id);
          true;
        } else {
          false;
        };
      };
    };
  };

  // Apply an update input to an existing project record
  public func applyUpdate(
    existing : Types.Project,
    input : Types.UpdateProjectInput,
    now : Types.Timestamp,
  ) : Types.Project {
    {
      existing with
      name = input.name;
      canvasJson = input.canvasJson;
      layers = input.layers;
      imageRefs = input.imageRefs;
      width = input.width;
      height = input.height;
      updatedAt = now;
    };
  };
};
