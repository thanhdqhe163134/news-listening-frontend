document.addEventListener('DOMContentLoaded', () => {
    // === CONSTANTS & STATE ===
    const URLS = {
        plan: 'https://dauthau.asia/kehoach/luachon-nhathau/?',
        invitation: 'https://dauthau.asia/thongbao/moithau/goi-thau-dau-qua-mang/?field%5B0%5D=3&',
    };
    const TOTAL_PAGES = 3;

    let state = {
        currentPage: 1,
        isLoading: false,
        procurementType: 'plan', // 'plan' or 'invitation'
        selectedDate: new Date(),
    };

    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        alertContainer: document.getElementById('alert-container'),
        resultsContainer: document.getElementById('scrape-results-container'),
        paginationContainer: document.getElementById('pagination-container'),
        procurementTypeRadios: document.querySelectorAll('input[name="procurementType"]'),
        datePicker: document.getElementById('date-picker'),
    };
    
    // === HELPER FUNCTIONS ===
    function formatDateForApi(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatDateForInput(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Public Procurement');
        dom.mainSidebar.innerHTML = createSidebar('procurement');
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
            const code = firstCell.substring(0, 14);
            const description = firstCell.substring(14).trim();
            const originalCells = row.slice(1);
            return { code, description, originalCells };
        });

        const loadingSpinner = `<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>`;
        const initialRowsHtml = rowsData.map(r => {
            const cells = [r.code, r.description, ...r.originalCells, loadingSpinner].map(cell => `<td>${cell}</td>`).join('');
            return `<tr data-code="${r.code.split('-')[0]}">${cells}</tr>`;
        }).join('');

        dom.resultsContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered table-striped table-hover">
                    <thead class="table-light"><tr>${headersHtml}</tr></thead>
                    <tbody>${initialRowsHtml}</tbody>
                </table>
            </div>`;

        // Fetch the actual links from the new backend endpoint
        const kind = state.procurementType === 'plan' ? 'khlcnt' : 'tbmt';
        const itemsToFetch = rowsData.map(r => ({ kind, code: r.code.split('-')[0] }));
        
        try {
            const result = await apiService.getProcurementLinks(itemsToFetch);
            
            if(result && result.success && typeof result.data === 'object') {
                const linksMap = result.data; // The data is now a dictionary {code: link}
                
                // Update table with fetched links
                Object.keys(linksMap).forEach(code => {
                    const finalLink = linksMap[code];
                    const linkCell = document.querySelector(`tr[data-code="${code}"] td:last-child`);
                    if (linkCell) {
                        if (finalLink) {
                            linkCell.innerHTML = `<a href="${finalLink}" target="_blank" title="View on Mua Sắm Công"><i class="bi bi-box-arrow-up-right"></i></a>`;
                        } else {
                            linkCell.innerHTML = 'N/A';
                        }
                    }
                });
            } else {
                 throw new Error("Invalid data format received from link API.");
            }
        } catch (error) {
            showAlert('Could not retrieve procurement links from the server.', 'warning');
            document.querySelectorAll('tr[data-code] td:last-child').forEach(cell => cell.innerHTML = 'Error');
        }
    }

    function renderPagination() {
        let pageItems = '';
        for (let i = 1; i <= TOTAL_PAGES; i++) {
            const activeClass = i === state.currentPage ? 'active' : '';
            const disabledClass = state.isLoading ? 'disabled' : '';
            pageItems += `<li class="page-item ${activeClass} ${disabledClass}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        dom.paginationContainer.innerHTML = `<nav aria-label="Page navigation"><ul class="pagination">${pageItems}</ul></nav>`;
    }

    // === LOGIC FUNCTIONS ===
    function getApiUrl() {
        let baseUrl = URLS[state.procurementType];
        const formattedDate = formatDateForApi(state.selectedDate);
        return `${baseUrl}sto=${encodeURIComponent(formattedDate)}`;
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
        dom.datePicker.addEventListener('change', () => {
            state.selectedDate = new Date(dom.datePicker.value);
            executeScrape(1);
        });

        dom.paginationContainer.addEventListener('click', (e) => {
            e.preventDefault();
            const pageLink = e.target.closest('[data-page]');
            if (!pageLink || state.isLoading) return;
            const pageNumber = parseInt(pageLink.dataset.page, 10);
            if (pageNumber !== state.currentPage) {
                executeScrape(pageNumber);
            }
        });
    }

    // === INITIALIZATION ===
    function initialize() {
        renderLayout();
        dom.datePicker.value = formatDateForInput(state.selectedDate);
        setupEventListeners();
        executeScrape(1);
    }

    initialize();
});