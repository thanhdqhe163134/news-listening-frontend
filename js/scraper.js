document.addEventListener('DOMContentLoaded', () => {
    // === CONSTANTS & STATE ===
    const URLS = {
        plan: 'https://dauthau.asia/kehoach/luachon-nhathau/?q=d%E1%BB%B1+%C3%A1n+c%E1%BA%A7u%2C+%C4%91%C6%B0%E1%BB%9Dng%2C+%C4%91%C6%B0%E1%BB%9Dng+s%E1%BA%AFt&type_search=1&type_info=2&type_info3=1&is_advance=1&is_province=0&is_kqlcnt=0&q2=giao+th%C3%B4ng%2C+x%C3%A2y+d%E1%BB%B1ng&type_choose_id=0&type_choose_id=0&search_idprovincekq=1&search_idprovince_khtt=1&goods_2=0&searchkind=0&type_view_open=0&sl_nhathau=0&sl_nhathau_cgtt=0&search_idprovince_plan=1&keyword_id_province=0&oda=-1&khlcnt=0&search_rq_province=-1&search_rq_province=1&rq_form_value=0&searching=1&',
        invitation: 'https://dauthau.asia/thongbao/moithau/goi-thau-dau-qua-mang/?goods=0&searchkind=0&type_choose_id=17&khlcnt=0&q=b%C3%A1o+c%C3%A1o+nghi%C3%AAn+c%E1%BB%A9u+kh%E1%BA%A3+thi%2C+thi%E1%BA%BFt+k%E1%BA%BF+k%E1%BB%B9+thu%E1%BA%ADt%2C+BIM%2C+BCNCKT%2C+TKKT&phanmucid%5B0%5D=254&phanmucid%5B1%5D=256&phanmucid%5B2%5D=258&phanmucid%5B3%5D=274&search_idprovince=1&field%5B0%5D=3&q2=giao+th%C3%B4ng%2C+x%C3%A2y+d%E1%BB%B1ng&is_advance=1&',
    };
    const TOTAL_PAGES = 5;

    let state = {
        currentPage: 1,
        isLoading: false,
        procurementType: 'invitation',
    };

    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        alertContainer: document.getElementById('alert-container'),
        resultsContainer: document.getElementById('scrape-results-container'),
        paginationContainer: document.getElementById('pagination-container'),
        procurementTypeRadios: document.querySelectorAll('input[name="procurementType"]'),
    };
    
    // === HELPER FUNCTIONS ===
    function formatDateForApi(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Mua sắm công');
        dom.mainSidebar.innerHTML = createSidebar('scraper');
        initializeAuthUI(); 
    }

    function showAlert(message, type = 'danger') {
        dom.alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
    }

    async function renderTableAndFetchLinks(scrapedData) {
        const table = scrapedData.data[0];
        const idColumnHeader = state.procurementType === 'plan' ? 'Mã KHLCNT' : 'Mã TBMT';
        
        const newHeaders = [...table.headers];
        newHeaders[0] = 'Tên dự án';
        newHeaders.unshift(idColumnHeader);
        newHeaders.push('Link');

        const headersHtml = newHeaders.map(h => `<th>${h}</th>`).join('');

        const rowsData = table.rows.map(row => {
            const firstCell = row[0] || '';
            const code = firstCell.substring(0, 15);
            const description = firstCell.substring(15).trim();
            const originalCells = row.slice(1);
            return { code, description, originalCells };
        });

        const getLinkButton = `<button class="btn btn-sm btn-outline-primary get-link-btn"><i class="bi bi-box-arrow-up-right"></i></button>`;
        const initialRowsHtml = rowsData.map(r => {
            const cells = [r.code, r.description, ...r.originalCells, getLinkButton].map(cell => `<td>${cell}</td>`).join('');
            return `<tr data-code="${r.code.split('-')[0]}">${cells}</tr>`;
        }).join('');

        dom.resultsContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-hover">
                    <thead class="table-light"><tr>${headersHtml}</tr></thead>
                    <tbody>${initialRowsHtml}</tbody>
                </table>
            </div>`;
    }

    function renderPagination() {
        let pageItems = '';
        const pageCount = Math.max(3, TOTAL_PAGES); 
        for (let i = 1; i <= pageCount; i++) {
            if (i > TOTAL_PAGES && TOTAL_PAGES < 4) break;

            const activeClass = i === state.currentPage ? 'active' : '';
            const disabledClass = state.isLoading || (i > TOTAL_PAGES) ? 'disabled' : '';
            pageItems += `<li class="page-item ${activeClass} ${disabledClass}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        dom.paginationContainer.innerHTML = `<nav aria-label="Page navigation"><ul class="pagination">${pageItems}</ul></nav>`;
    }

    // === LOGIC FUNCTIONS ===
    function getApiUrl() {
        let baseUrl = URLS[state.procurementType];
        
        // MODIFIED: Calculate date range from one year ago to today.
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        const formattedToday = formatDateForApi(today);
        const formattedOneYearAgo = formatDateForApi(oneYearAgo);
        
        return `${baseUrl}&sfrom=${encodeURIComponent(formattedOneYearAgo)}&sto=${encodeURIComponent(formattedToday)}`;
    }

    async function executeScrape(page) {
        if (state.isLoading) return;
        state.isLoading = true;
        state.currentPage = page;
        const apiUrl = getApiUrl();

        dom.resultsContainer.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>`;
        dom.alertContainer.innerHTML = '';
        renderPagination(); 
        
        try {
            const result = await apiService.scrapeTables(apiUrl, state.currentPage);
            if (result && result.success && result.data.data && result.data.data.length > 0) {
                await renderTableAndFetchLinks(result.data);
            } else {
                dom.resultsContainer.innerHTML = `<div class="alert alert-warning text-center">No data found for the selected criteria on page ${state.currentPage}.</div>`;
            }
        } catch (error) {
            showAlert(error.message || 'An error occurred while fetching data.');
            dom.resultsContainer.innerHTML = '';
        } finally {
            state.isLoading = false;
            renderPagination();
        }
    }

    function handleTypeChange() {
        state.procurementType = document.querySelector('input[name="procurementType"]:checked').value;
        executeScrape(1);
    }

    // === EVENT LISTENERS ===
    function setupEventListeners() {
        dom.procurementTypeRadios.forEach(radio => radio.addEventListener('change', handleTypeChange));

        dom.paginationContainer.addEventListener('click', (e) => {
            e.preventDefault();
            const pageLink = e.target.closest('[data-page]');
            if (!pageLink || pageLink.parentElement.classList.contains('disabled')) return;
            const pageNumber = parseInt(pageLink.dataset.page, 10);
            if (pageNumber !== state.currentPage) {
                executeScrape(pageNumber);
            }
        });

        dom.resultsContainer.addEventListener('click', async (e) => {
            const getLinkBtn = e.target.closest('.get-link-btn');
            if (!getLinkBtn) return;
        
            e.preventDefault();
        
            const row = getLinkBtn.closest('tr');
            const code = row.dataset.code;
            const linkCell = getLinkBtn.parentElement;
        
            getLinkBtn.disabled = true;
            getLinkBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Opening...`;
        
            const kind = state.procurementType === 'plan' ? 'khlcnt' : 'tbmt';
            const itemsToFetch = [{ kind, code }];
        
            try {
                const result = await apiService.getProcurementLinks(itemsToFetch);
        
                const finalLink = result?.data?.[0]?.link;
        
                if (finalLink) {
                    window.open(finalLink, '_blank');
                    linkCell.innerHTML = `<a href="${finalLink}" target="_blank" title="Link opened in new tab">${code}</a>`;
                } else {
                    throw new Error(result?.message || `Link not found for ${code}.`);
                }
            } catch (error) {
                showAlert(error.message || 'Could not retrieve the procurement link.', 'danger');
                getLinkBtn.disabled = false;
                getLinkBtn.innerHTML = `<i class="bi bi-box-arrow-up-right"></i>`;
            }
        });
    }

    // === INITIALIZATION ===
    function initialize() {
        renderLayout();
        setupEventListeners();
        executeScrape(1);
    }

    initialize();
});