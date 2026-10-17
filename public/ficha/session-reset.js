(() => {
  const DBKEY = 'traza-bizkaia-ficha-autoescuela-v2';

  function clearPracticalRatingsWithApp() {
    const practicalTab = document.querySelector('.tab[data-tab="practical"]');
    const historyTab = document.querySelector('.tab[data-tab="history"]');
    if (!practicalTab || !historyTab) return;

    practicalTab.click();
    let guard = 0;
    while (guard++ < 500) {
      const selected = document.querySelector('.rating button.selected');
      if (!selected) break;
      selected.click();
    }

    // Persist the now-empty score sheet using the app's own save path.
    document.querySelector('#saveBtn')?.click();
    historyTab.click();
  }

  // The app saves the class first. Immediately afterwards clear the working
  // practical scores, while the snapshot saved in history remains untouched.
  document.addEventListener('click', event => {
    if (!event.target.closest('#addClass')) return;
    setTimeout(clearPracticalRatingsWithApp, 0);
  });

  function activeStudentAndPermit(db) {
    const buttons = [...document.querySelectorAll('#studentList .studentBtn')];
    const active = document.querySelector('#studentList .studentBtn.active');
    if (!active) return null;
    const q = (document.querySelector('#studentSearch')?.value || '').trim().toLowerCase();
    const rows = Object.values(db.students || {})
      .filter(s => (s.name || '').toLowerCase().includes(q))
      .sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const student = rows[buttons.indexOf(active)];
    if (!student) return null;
    const label = document.querySelector('.permitChip.active')?.textContent?.trim();
    const permit = Object.keys(window.DGT_DATA || {}).find(k => window.DGT_DATA[k].label === label);
    if (!permit || !student.permits?.[permit]) return null;
    return { student, permit, pdata: student.permits[permit] };
  }

  function cumulativeRatings(pdata) {
    const result = {};
    const history = [...(pdata.history || [])].sort((a,b) => {
      const da = a.date || '', db = b.date || '';
      if (da !== db) return da.localeCompare(db);
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
    for (const entry of history) {
      for (const [item, value] of Object.entries(entry.ratings || {})) {
        const n = Number(value) || 0;
        if (n >= 1 && n <= 5) result[item] = n;
      }
    }
    // An unsaved/current class can still override the accumulated history.
    for (const [item, value] of Object.entries(pdata.practical || {})) {
      const n = Number(value) || 0;
      if (n >= 1 && n <= 5) result[item] = n;
    }
    return result;
  }

  // The official PDF must keep showing the learner's latest achieved level even
  // though the on-screen score sheet is cleared after each saved lesson.
  // pdf-enhance reads a fresh snapshot from localStorage, so provide it a
  // temporary cumulative view for this click only; stored data is not changed.
  document.addEventListener('click', event => {
    if (!event.target.closest('#pdfFilled')) return;
    const raw = localStorage.getItem(DBKEY);
    if (!raw) return;
    let cloned;
    try { cloned = JSON.parse(raw); } catch { return; }
    const ctx = activeStudentAndPermit(cloned);
    if (!ctx) return;
    ctx.pdata.practical = cumulativeRatings(ctx.pdata);
    const virtualRaw = JSON.stringify(cloned);

    const nativeGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (this === localStorage && key === DBKEY) return virtualRaw;
      return nativeGetItem.call(this, key);
    };
    setTimeout(() => { Storage.prototype.getItem = nativeGetItem; }, 0);
  }, true);
})();