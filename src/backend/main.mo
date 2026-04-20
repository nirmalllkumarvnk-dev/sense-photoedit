// Sense PhotoEdit — composition root
// Wires stable state and delegates all public methods to mixins
import Map "mo:core/Map";
import ProjectLib "lib/projects";
import ProjectsApi "mixins/projects-api";
import Types "types/projects";

actor {
  // Project storage: projectId -> Project
  let projectStore : ProjectLib.ProjectStore = Map.empty<Nat, Types.Project>();

  // Monotonic project ID counter
  let idCounter = { var value : Nat = 0 };

  // Delegate all project API calls to the projects mixin
  include ProjectsApi(projectStore, idCounter);
};
