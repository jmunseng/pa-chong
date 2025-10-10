export function filterNew() {
  const rows = document.querySelectorAll('.table .row');
  rows.forEach((row) => {
    if (
      !row.classList.contains('header') &&
      !row.classList.contains('new-item')
    ) {
      row.style.display = row.style.display === 'none' ? 'flex' : 'none';
    }
  });
}

export function filterDrop() {
  const rows = document.querySelectorAll('.table .row');
  rows.forEach((row) => {
    if (
      !row.classList.contains('header') &&
      !row.classList.contains('price-dropped')
    ) {
      row.style.display = row.style.display === 'none' ? 'flex' : 'none';
    }
  });
}
