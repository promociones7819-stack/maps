// MapLibre 6 moved WebGL options under canvasContextAttributes.
// Both engines must retain the rendered image between their render and capture loops.
export const recordingContextOptions=isMapbox=>isMapbox
 ? {preserveDrawingBuffer:true}
 : {canvasContextAttributes:{preserveDrawingBuffer:true}};
