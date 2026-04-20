// Domain types for the projects domain
import Common "common";

module {
  public type ProjectId = Common.ProjectId;
  public type Timestamp = Common.Timestamp;

  // A single canvas layer stored as serializable data
  public type LayerData = {
    id : Nat;
    name : Text;
    visible : Bool;
    // JSON-serialized Fabric.js layer object
    fabricJson : Text;
  };

  // Full project record stored per user
  public type Project = {
    id : ProjectId;
    owner : Principal;
    name : Text;
    // JSON-serialized Fabric.js canvas state
    canvasJson : Text;
    layers : [LayerData];
    // Stored image references (uploaded asset URLs/keys)
    imageRefs : [Text];
    width : Nat;
    height : Nat;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // Lightweight summary for listing projects (omits heavy canvas/layer data)
  public type ProjectSummary = {
    id : ProjectId;
    name : Text;
    width : Nat;
    height : Nat;
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  // Input for creating a new project
  public type CreateProjectInput = {
    name : Text;
    canvasJson : Text;
    layers : [LayerData];
    imageRefs : [Text];
    width : Nat;
    height : Nat;
  };

  // Input for updating an existing project
  public type UpdateProjectInput = {
    id : ProjectId;
    name : Text;
    canvasJson : Text;
    layers : [LayerData];
    imageRefs : [Text];
    width : Nat;
    height : Nat;
  };
};
