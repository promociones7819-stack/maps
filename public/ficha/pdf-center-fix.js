(() => {
  if (!window.PDFLib?.PDFPage?.prototype?.drawText) return;

  const proto = window.PDFLib.PDFPage.prototype;
  if (proto.__fichaAutoescuelaCentered) return;

  const original = proto.drawText;
  const targets = [
    { fromX: 280.4, toX: 296.0 },   // Manual
    { fromX: 338.4, toX: 348.0 },   // Automático
    { fromX: 412.4, toX: 415.5 }    // Adaptado
  ];

  proto.drawText = function(text, options = {}) {
    let next = options;

    // Corrige únicamente las X del tipo de vehículo de la página práctica.
    if (text === 'X' && Number(options.size) === 9 && Math.abs(Number(options.y) - 635) < 1.5) {
      const match = targets.find(t => Math.abs(Number(options.x) - t.fromX) < 1.5);
      if (match) {
        next = { ...options, x: match.toX, y: 637.4 };
      }
    }

    return original.call(this, text, next);
  };

  proto.__fichaAutoescuelaCentered = true;
})();