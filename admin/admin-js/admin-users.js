document.getElementById('searchInput').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#usersTable tbody tr').forEach(row => {
        row.style.display = (row.dataset.search||'').includes(q) ? '' : 'none';
    });
});
document.getElementById('addModal').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
});