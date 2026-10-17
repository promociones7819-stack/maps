// Compatibility bridge for classic scripts.
// data.js declares DGT_DATA with `const`, which is not exposed as window.DGT_DATA.
// The enhancement modules intentionally read it from window so expose the same object here.
if (typeof DGT_DATA !== 'undefined') {
  window.DGT_DATA = DGT_DATA;
}
