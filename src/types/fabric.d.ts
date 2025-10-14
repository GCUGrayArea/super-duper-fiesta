// Type extensions for Fabric.js to include custom properties
declare global {
  namespace fabric {
    interface Object {
      shapeId?: string;
    }
  }
}
