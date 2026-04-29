/* ── FILTER TABS ─────────────────────────── */
const tabs = document.querySelectorAll('.tab-btn');
const cards = document.querySelectorAll('.alert-card');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        applyFilters();
    });
});

/* ── SEARCH ──────────────────────────────── */
document.getElementById('searchInput').addEventListener('input', applyFilters);

function applyFilters() {
    const filter = document.querySelector('.tab-btn.active').dataset.filter;
    const q = document.getElementById('searchInput').value.toLowerCase();

    cards.forEach(card => {
        const type = card.dataset.type;
        const status = card.dataset.status;
        const search = (card.dataset.search || '') + ' ' + card.textContent.toLowerCase();

        let show = true;

        if (filter === 'active') show = status === 'active';
        if (filter === 'resolved') show = status === 'resolved';
        if (filter === 'critical') show = type === 'critical';
        if (filter === 'warning') show = type === 'warning';

        if (q && !search.includes(q)) show = false;

        card.classList.toggle('hidden', !show);
    });
}

/* ── RESOLVE BUTTON ──────────────────────── */
function resolveAlert(btn) {
    const card = btn.closest('.alert-card');

    // Update card status
    card.dataset.status = 'resolved';

    // Add resolved badge next to existing type badge
    const titleRow = card.querySelector('.alert-title-row');
    if (!titleRow.querySelector('.badge.resolved')) {
        const resolvedBadge = document.createElement('span');
        resolvedBadge.className = 'badge resolved';
        resolvedBadge.innerHTML = `
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Resolved`;
        titleRow.appendChild(resolvedBadge);
    }

    // Swap button state
    btn.classList.add('resolved-state');
    btn.disabled = true;
    btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Resolved`;

    applyFilters();
}