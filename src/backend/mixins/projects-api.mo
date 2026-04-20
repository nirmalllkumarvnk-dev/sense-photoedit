// Public API mixin for project management
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/projects";
import ProjectLib "../lib/projects";

// Exposes CRUD operations for user projects
mixin (
  store : ProjectLib.ProjectStore,
  idCounter : { var value : Nat },
) {

  // Create a new project for the authenticated caller
  public shared ({ caller }) func createProject(
    input : Types.CreateProjectInput
  ) : async Types.ProjectId {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers not allowed");
    let id = ProjectLib.nextId(idCounter.value);
    idCounter.value := id;
    let now = Time.now();
    let project = ProjectLib.createProject(id, caller, input, now);
    ProjectLib.saveProject(store, project);
    id;
  };

  // Save (overwrite) an existing project owned by the caller
  public shared ({ caller }) func saveProject(
    input : Types.UpdateProjectInput
  ) : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers not allowed");
    switch (ProjectLib.loadProject(store, input.id)) {
      case null { false };
      case (?existing) {
        if (not Principal.equal(existing.owner, caller)) { return false };
        let now = Time.now();
        let updated = ProjectLib.applyUpdate(existing, input, now);
        ProjectLib.saveProject(store, updated);
        true;
      };
    };
  };

  // Load a full project by ID (must be owned by caller)
  public shared query ({ caller }) func loadProject(
    id : Types.ProjectId
  ) : async ?Types.Project {
    switch (ProjectLib.loadProject(store, id)) {
      case null { null };
      case (?project) {
        if (Principal.equal(project.owner, caller)) { ?project } else { null };
      };
    };
  };

  // List project summaries for the authenticated caller
  public shared query ({ caller }) func listProjects() : async [Types.ProjectSummary] {
    ProjectLib.listUserProjects(store, caller);
  };

  // Delete a project by ID (must be owned by caller)
  public shared ({ caller }) func deleteProject(
    id : Types.ProjectId
  ) : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Anonymous callers not allowed");
    ProjectLib.deleteProject(store, id, caller);
  };
};
