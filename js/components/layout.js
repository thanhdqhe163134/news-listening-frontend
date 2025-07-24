function createHeader(title) {
    return `
        <div class="bg-white p-3 shadow-sm border-bottom">
            <h1 class="h4 mb-0">${title}</h1>
        </div>
    `;
}

function createSidebar(activePage = 'dashboard') {
    const pages = [
        { id: 'index', href: 'index.html', icon: 'bi-grid-fill', text: 'Dashboard' },
        { id: 'news', href: 'news.html', icon: 'bi-newspaper', text: 'Tin Tức' },
        { id: 'keywords', href: 'keywords.html', icon: 'bi-tags-fill', text: 'Quản lý Từ khóa' },
        { id: 'categories', href: 'categories.html', icon: 'bi-bookmark-fill', text: 'Quản lý Danh mục' },
        { id: 'sources', href: 'sources.html', icon: 'bi-newspaper', text: 'Quản lý Nguồn tin' },
    ];

    const links = pages.map(page => `
        <li class="nav-item">
            <a href="${page.href}" class="nav-link ${page.id === activePage ? 'active' : ''}">
                <i class="bi ${page.icon} me-2"></i>
                ${page.text}
            </a>
        </li>
    `).join('');

    return `
        <div class="main-sidebar d-flex flex-column flex-shrink-0 p-3 bg-light">
            <a href="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none">
                <i class="bi bi-robot me-2" style="font-size: 2rem;"></i>
                <span class="fs-4">Article Analysis</span>
            </a>
            <hr>
            <ul class="nav nav-pills flex-column mb-auto">
                ${links}
            </ul>
            <hr>

        </div>
    `;
}