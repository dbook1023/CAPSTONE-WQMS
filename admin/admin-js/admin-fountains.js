/* ── LIVE SEARCH ────────────────────────────── */
document.getElementById('searchInput').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.fountain-card').forEach(card => {
        const name     = (card.dataset.name     || '').toLowerCase();
        const location = (card.dataset.location || '').toLowerCase();
        const id       = (card.dataset.id       || '').toLowerCase();
        card.style.display = (name.includes(q) || location.includes(q) || id.includes(q)) ? '' : 'none';
    });
});

/* ── TOGGLE MONITORING LABEL ────────────────── */
document.querySelectorAll('.toggle-wrap:not(.disabled)').forEach(toggle => {
    toggle.addEventListener('click', () => {
        const label = toggle.closest('.fc-monitoring').querySelector('.monitoring-status');
        const isOn  = toggle.classList.contains('on');
        label.textContent  = isOn ? 'Enabled' : 'Disabled';
        label.className    = 'monitoring-status ' + (isOn ? 'enabled' : 'disabled');
    });
});