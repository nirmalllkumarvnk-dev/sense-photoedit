// Common cross-cutting types shared across all domains
module {
  // Unique identifier for projects
  public type ProjectId = Nat;

  // Unix timestamp in nanoseconds (from Time.now())
  public type Timestamp = Int;

  // Image reference stored as a URL or asset key
  public type ImageRef = Text;
};
