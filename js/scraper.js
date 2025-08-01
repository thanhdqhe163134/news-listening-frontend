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
    
    let savedProcurements = new Map();

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
    function parseApiDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split(' ');
        if (parts.length < 2) return null;
        const timeParts = parts[0].split(':');
        const dateParts = parts[1].split('/');
        if (timeParts.length !== 2 || dateParts.length !== 3) return null;
        const dateObj = new Date(Date.UTC(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1]));
        return dateObj.toISOString();
    }

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Mua sắm công');
        dom.mainSidebar.innerHTML = createSidebar('scraper');
        initializeAuthUI(); 
    }

    function showAlert(message, type = 'danger') {
        dom.alertContainer.innerHTML = '';
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        dom.alertContainer.prepend(alertDiv);
    }

    async function renderTableAndFetchLinks(scrapedData) {
        const table = scrapedData.data[0];
        const idColumnHeader = state.procurementType === 'plan' ? 'Mã KHLCNT' : 'Mã TBMT';
        
        const newHeaders = [...table.headers];
        newHeaders[0] = 'Tên dự án';
        newHeaders.unshift(idColumnHeader);
        newHeaders.push('Link', 'Lưu');

        const headersHtml = newHeaders.map(h => `<th>${h}</th>`).join('');

        const rowsData = table.rows.map(row => {
            const firstCell = row[0] || '';
            // --- FIX IS HERE: Use a regular expression for robust code extraction ---
            const codeMatch = firstCell.match(/^([A-Z0-9-]+)/);
            const code = codeMatch ? codeMatch[0] : '';
            const description = firstCell.substring(code.length).trim();
            // --- END FIX ---
            const procuringEntity = row[1] || '';
            const publishedDateStr = row[2] || '';
            const originalCells = row.slice(1);
            return { code, description, procuringEntity, publishedDateStr, originalCells };
        });

        const getLinkButton = `<button class="btn btn-sm btn-outline-primary get-link-btn" title="Mở link gốc"><i class="bi bi-box-arrow-up-right"></i></button>`;

        const initialRowsHtml = rowsData.map(r => {
            // This logic correctly sets the green icon if the item is saved
            const isSaved = savedProcurements.has(r.code);
            const saveIconClass = isSaved ? 'bi-bookmark-check-fill text-success' : 'bi-bookmark';
            const saveTitle = isSaved ? 'Bỏ lưu' : 'Lưu tin';
            const userProcurementId = isSaved ? savedProcurements.get(r.code) : '';
            
            const saveButton = `
                <button class="btn btn-sm btn-light save-procurement-btn" 
                        title="${saveTitle}"
                        data-item-code="${r.code}"
                        data-project-name="${r.description.replace(/"/g, '&quot;')}"
                        data-procuring-entity="${r.procuringEntity.replace(/"/g, '&quot;')}"
                        data-published-at="${r.publishedDateStr}"
                        data-is-saved="${isSaved}"
                        data-procurement-id="${userProcurementId}">
                    <i class="bi ${saveIconClass}"></i>
                </button>`;

            const cells = [r.code, r.description, ...r.originalCells, getLinkButton, saveButton].map(cell => `<td>${cell}</td>`).join('');
            return `<tr>${cells}</tr>`;
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
        for (let i = 1; i <= TOTAL_PAGES; i++) {
            const activeClass = i === state.currentPage ? 'active' : '';
            const disabledClass = state.isLoading ? 'disabled' : '';
            pageItems += `<li class="page-item ${activeClass} ${disabledClass}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        dom.paginationContainer.innerHTML = `<nav aria-label="Page navigation"><ul class="pagination">${pageItems}</ul></nav>`;
    }

    // === LOGIC FUNCTIONS ===
    async function loadSavedProcurements() {
        if (!getCurrentUser()) return;
        try {
            const result = await apiService.fetchUserProcurements();
            if (result.success && result.data) {
                savedProcurements.clear();
                result.data.forEach(item => {
                    savedProcurements.set(item.item_code, item.user_procurement_id);
                });
            }
        } catch (error) {
            console.error("Failed to load saved procurements:", error);
        }
    }
    
    function getApiUrl() {
        let baseUrl = URLS[state.procurementType];
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        return `${baseUrl}&sfrom=${encodeURIComponent(formatDate(oneYearAgo))}&sto=${encodeURIComponent(formatDate(today))}`;
    }

    async function executeScrape(page) {
        if (state.isLoading) return;
        state.isLoading = true;
        state.currentPage = page;
        const apiUrl = getApiUrl();

        dom.resultsContainer.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>`;
        renderPagination(); 
        
        try {
            await loadSavedProcurements();
            const result = await apiService.scrapeTables(apiUrl, state.currentPage);
            if (result && result.success && result.data.data && result.data.data.length > 0) {
                await renderTableAndFetchLinks(result.data);
            } else {
                dom.resultsContainer.innerHTML = `<div class="alert alert-warning text-center">Không tìm thấy dữ liệu trên trang ${state.currentPage}.</div>`;
            }
        } catch (error) {
            showAlert(error.message || 'Lỗi khi tải dữ liệu.', 'danger');
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
            if (pageNumber !== state.currentPage) executeScrape(pageNumber);
        });

        dom.resultsContainer.addEventListener('click', async (e) => {
            const getLinkBtn = e.target.closest('.get-link-btn');
            const saveBtn = e.target.closest('.save-procurement-btn');

            if (getLinkBtn) {
                e.preventDefault();
                const row = getLinkBtn.closest('tr');
                const code = row.cells[0].textContent;
                const linkCell = getLinkBtn.parentElement;
                
                getLinkBtn.disabled = true;
                getLinkBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
                
                const kind = state.procurementType === 'plan' ? 'khlcnt' : 'tbmt';
                try {
                    const result = await apiService.getProcurementLinks([{ kind, code }]);
                    const finalLink = result?.data?.[0]?.link;
                    if (finalLink) {
                        window.open(finalLink, '_blank');
                        linkCell.innerHTML = `<a href="${finalLink}" target="_blank" class="btn btn-sm btn-success" title="Đã mở link">${code}</a>`;
                    } else throw new Error();
                } catch (error) {
                    showAlert('Không thể lấy link.', 'danger');
                    getLinkBtn.disabled = false;
                    getLinkBtn.innerHTML = `<i class="bi bi-box-arrow-up-right"></i>`;
                }
            }

            if (saveBtn) {
                e.preventDefault();
                if (!getCurrentUser()) {
                    showAlert('Vui lòng đăng nhập để sử dụng tính năng này.', 'warning');
                    return;
                }

                const { itemCode, projectName, procuringEntity, publishedAt, isSaved, procurementId } = saveBtn.dataset;
                const itemType = state.procurementType === 'plan' ? 'khlcnt' : 'tbmt';

                saveBtn.disabled = true;
                saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

                try {
                    if (isSaved === 'true') {
                        await apiService.deleteUserProcurement(procurementId);
                        savedProcurements.delete(itemCode);
                        showAlert('Đã bỏ lưu tin thành công.', 'info');
                    } else {
                        const payload = {
                            item_code: itemCode,
                            item_type: itemType,
                            project_name: projectName,
                            procuring_entity: procuringEntity,
                            posted_at: parseApiDate(publishedAt) 
                        };
                        const result = await apiService.saveUserProcurement(payload);
                        if (result.success && result.data) {
                            savedProcurements.set(itemCode, result.data.user_procurement_id);
                            saveBtn.dataset.procurementId = result.data.user_procurement_id;
                            showAlert('Lưu tin thành công.', 'success');
                        }
                    }
                    
                    const wasSaved = isSaved === 'true';
                    saveBtn.dataset.isSaved = !wasSaved;
                    saveBtn.title = wasSaved ? 'Lưu tin' : 'Bỏ lưu';
                } catch (error) {
                    showAlert(error.message, 'danger');
                } finally {
                    saveBtn.disabled = false;
                    const icon = saveBtn.querySelector('i') || document.createElement('i');
                    icon.className = saveBtn.dataset.isSaved === 'true' ? 'bi bi-bookmark-check-fill text-success' : 'bi bi-bookmark';
                    saveBtn.innerHTML = '';
                    saveBtn.appendChild(icon);
                }
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