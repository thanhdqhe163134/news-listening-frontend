function createPagination(paginationData) {
    const { page: currentPage, pages: totalPages } = paginationData;
    if (totalPages <= 1) return '';

    const createPageItem = (p, text = p, active = false, disabled = false) => 
        `<li class="page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${p}">${text}</a>
        </li>`;

    const createEllipsisItem = () => `<li class="page-item disabled"><span class="page-link">...</span></li>`;

    const windowSize = 2;
    let html = '<ul class="pagination pagination-sm">';
    html += createPageItem(currentPage - 1, '&laquo;', false, currentPage === 1);

    if (currentPage > windowSize + 1) {
        html += createPageItem(1);
        if (currentPage > windowSize + 2) {
            html += createEllipsisItem();
        }
    }

    for (let i = Math.max(1, currentPage - windowSize); i <= Math.min(totalPages, currentPage + windowSize); i++) {
        html += createPageItem(i, i, i === currentPage);
    }

    if (currentPage < totalPages - windowSize) {
        if (currentPage < totalPages - windowSize - 1) {
            html += createEllipsisItem();
        }
        html += createPageItem(totalPages);
    }
    
    html += createPageItem(currentPage + 1, '&raquo;', false, currentPage === totalPages);
    html += '</ul>';
    return html;
}