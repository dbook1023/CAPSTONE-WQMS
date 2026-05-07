document.getElementById('searchInput').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#usersTable tbody tr').forEach(row => {
        row.style.display = (row.dataset.search||'').includes(q) ? '' : 'none';
    });
});

document.getElementById('addModal').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
});

function addUser() {
    const data = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        branch: document.getElementById('branch').value,
        branchCode: document.getElementById('branchCode').value
    };

    // Sanitize
    const sanitizedData = Sanitizer.sanitizeObject(data);

    console.log('Adding sanitized user:', sanitizedData);
    
    // Simulate success
    alert('User ' + sanitizedData.firstName + ' ' + sanitizedData.lastName + ' added successfully!');
    
    // Reset fields and close
    document.getElementById('firstName').value = '';
    document.getElementById('lastName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('branch').value = '';
    document.getElementById('branchCode').value = '';
    document.getElementById('addModal').classList.remove('open');
}
