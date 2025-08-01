/**
 * Thiết lập một cookie.
 * @param {string} name - Tên của cookie.
 * @param {string} value - Giá trị của cookie.
 * @param {number} days - Số ngày cookie tồn tại.
 */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            const value = c.substring(nameEQ.length, c.length);
            return decodeURIComponent(value);
        }
    }
    return null;
}

function deleteCookie(name) {  
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function googleLogin() {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    window.location.href = authUrl.toString();
}

function logout() {
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
    deleteCookie('user');
    window.location.reload();
}

function getCurrentUser() {
    const userCookie = getCookie('user');
    try {
        return userCookie ? JSON.parse(userCookie) : null;
    } catch (e) {
        console.error("Lỗi khi phân tích cookie của người dùng:", e);
        return null;
    }
}

function renderSavedProcurement(procurement) {
    const postedDate = procurement.posted_at ? new Date(procurement.posted_at).toLocaleDateString('vi-VN') : 'N/A';
    const linkHtml = procurement.original_link 
        ? `<a href="${procurement.original_link}" target="_blank" class="btn btn-sm btn-outline-primary mt-2">Xem chi tiết</a>` 
        : '';
    const itemTypeDisplay = procurement.item_type === 'tbmt' ? 'Thông báo mời thầu' : 'Kế hoạch LCNT';

    const unsaveButtonHtml = `
        <button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-2 unsave-procurement-btn" 
                title="Bỏ lưu"
                data-procurement-id="${procurement.user_procurement_id}"
                data-item-code="${procurement.item_code}">
            <i class="bi bi-bookmark-x-fill"></i>
        </button>
    `;

    return `
        <div class="card shadow-sm mb-3 position-relative">
            ${unsaveButtonHtml}
            <div class="card-body">
                <h6 class="card-title mb-1">${procurement.project_name}</h6>
                <p class="card-subtitle mb-2 text-muted small">
                    <strong>Mã:</strong> ${procurement.item_code} | 
                    <strong>Loại:</strong> ${itemTypeDisplay}
                </p>
                <p class="card-text small mb-1">
                    <strong>Bên mời thầu:</strong> ${procurement.procuring_entity || 'N/A'}
                </p>
                <p class="card-text small">
                    <strong>Ngày đăng:</strong> ${postedDate}
                </p>
                ${linkHtml}
            </div>
        </div>
    `;
}

function injectSavedItemsModal() {
    if (document.getElementById('savedItemsModal')) return; 

    const modalHtml = `
    <div class="modal fade" id="savedItemsModal" tabindex="-1" aria-labelledby="savedItemsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-scrollable modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="savedItemsModalLabel"><i class="bi bi-bookmark-fill me-2"></i>Mục đã lưu</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="modal-alert-container"></div>
                    <ul class="nav nav-tabs" id="savedItemsTab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="saved-articles-tab" data-bs-toggle="tab" data-bs-target="#saved-articles-pane" type="button" role="tab" aria-controls="saved-articles-pane" aria-selected="true">
                                <i class="bi bi-newspaper me-2"></i>Tin Tức
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="saved-procurements-tab" data-bs-toggle="tab" data-bs-target="#saved-procurements-pane" type="button" role="tab" aria-controls="saved-procurements-pane" aria-selected="false">
                                <i class="bi bi-briefcase-fill me-2"></i>Mua sắm công
                            </button>
                        </li>
                    </ul>
                    <div class="tab-content pt-3" id="savedItemsTabContent">
                        <div class="tab-pane fade show active" id="saved-articles-pane" role="tabpanel" aria-labelledby="saved-articles-tab" tabindex="0">
                            <div id="saved-articles-list" class="vstack gap-3"></div>
                        </div>
                        <div class="tab-pane fade" id="saved-procurements-pane" role="tabpanel" aria-labelledby="saved-procurements-tab" tabindex="0">
                            <div id="saved-procurements-list" class="vstack gap-3"></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Cập nhật giao diện header dựa trên trạng thái đăng nhập.
 */
async function initializeAuthUI() {
    const authContainer = document.getElementById('auth-status-container');
    if (!authContainer) return;
    const user = getCurrentUser();

    if (user) {
        // --- FIX IS HERE: Fetch both saved articles AND procurements globally ---
        try {
            const [articlesResult, procurementsResult] = await Promise.all([
                apiService.getSavedArticleIds(),
                apiService.fetchUserProcurements() // Fetch all saved procurements
            ]);

            if (articlesResult.success && Array.isArray(articlesResult.data)) {
                savedArticleIds = new Set(articlesResult.data);
            }

            if (procurementsResult.success && Array.isArray(procurementsResult.data)) {
                savedProcurements.clear();
                procurementsResult.data.forEach(item => {
                    savedProcurements.set(item.item_code, item.user_procurement_id);
                });
            }
        } catch (error) {
            console.error("Could not fetch saved items on init:", error);
        }
        // --- END FIX ---

        authContainer.innerHTML = `
            <div class="dropdown">
                <img src="${user.avatar_url}" alt="${user.username}" id="user-avatar" class="user-avatar dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" title="Tài khoản">
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="user-avatar">
                    <li><span class="dropdown-item-text">Chào, <strong>${user.username}</strong></span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item" href="#" id="saved-items-link">
                            <i class="bi bi-bookmark-fill me-2"></i>Mục đã lưu
                        </a>
                    </li>
                    <li><button class="dropdown-item" id="logout-btn"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</button></li>
                </ul>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
        
        injectSavedItemsModal();

        const savedItemsLink = document.getElementById('saved-items-link');
        const savedItemsModalElement = document.getElementById('savedItemsModal');

        if (savedItemsLink && savedItemsModalElement) {
            const savedItemsModal = new bootstrap.Modal(savedItemsModalElement);
            savedItemsLink.addEventListener('click', async (event) => {
                event.preventDefault();
                const articlesList = document.getElementById('saved-articles-list');
                const procurementsList = document.getElementById('saved-procurements-list');
                const loadingHtml = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';
                articlesList.innerHTML = loadingHtml;
                procurementsList.innerHTML = loadingHtml;
                savedItemsModal.show();

                try {
                    const [articlesResult, procurementsResult] = await Promise.all([
                        apiService.fetchSavedArticles(),
                        apiService.fetchUserProcurements()
                    ]);
                    if (articlesResult.success && Array.isArray(articlesResult.data)) {
                        articlesList.innerHTML = articlesResult.data.length > 0
                            ? articlesResult.data.map(createArticleCard).join('')
                            : '<div class="alert alert-info text-center">Bạn chưa lưu bài viết nào.</div>';
                    } else { throw new Error(articlesResult.message || "Không thể tải bài viết."); }
                    
                    if (procurementsResult.success && Array.isArray(procurementsResult.data)) {
                        procurementsList.innerHTML = procurementsResult.data.length > 0
                            ? procurementsResult.data.map(renderSavedProcurement).join('')
                            : '<div class="alert alert-info text-center">Bạn chưa lưu mục mua sắm công nào.</div>';
                    } else { throw new Error(procurementsResult.message || "Không thể tải mục mua sắm công."); }
                } catch (error) {
                    const errorHtml = `<div class="alert alert-danger">${error.message}</div>`;
                    articlesList.innerHTML = errorHtml;
                    procurementsList.innerHTML = errorHtml;
                }
            });

            savedItemsModalElement.addEventListener('click', async (event) => {
                const unsaveArticleBtn = event.target.closest('.save-icon-container');
                const unsaveProcurementBtn = event.target.closest('.unsave-procurement-btn');
                const modalAlertContainer = document.getElementById('modal-alert-container');
                
                const fadeOutAndRemove = (element) => {
                    const card = element.closest('.card');
                    if (card) {
                        card.style.transition = 'opacity 0.3s ease';
                        card.style.opacity = '0';
                        setTimeout(() => card.remove(), 300);
                    }
                };
                
                const checkAndShowEmptyMessage = (listElement, type) => {
                    setTimeout(() => {
                        if (listElement.children.length === 0) {
                            const message = type === 'article'
                                ? 'Bạn chưa lưu bài viết nào.'
                                : 'Bạn chưa lưu mục mua sắm công nào.';
                            listElement.innerHTML = `<div class="alert alert-info text-center">${message}</div>`;
                        }
                    }, 350);
                };

                if (unsaveArticleBtn) {
                    event.preventDefault();
                    event.stopPropagation();
                    const articleId = unsaveArticleBtn.dataset.articleId;
                    unsaveArticleBtn.style.pointerEvents = 'none';
                    try {
                        await apiService.unsaveArticle(articleId);
                        fadeOutAndRemove(unsaveArticleBtn);
                        savedArticleIds.delete(parseInt(articleId, 10));
                        checkAndShowEmptyMessage(document.getElementById('saved-articles-list'), 'article');
                        const mainPageIconContainer = document.querySelector(`.article-card[data-article-id-wrapper="${articleId}"] .save-icon-container`);
                        if (mainPageIconContainer) {
                            mainPageIconContainer.classList.remove('saved');
                            mainPageIconContainer.title = 'Lưu bài viết';
                            const icon = mainPageIconContainer.querySelector('.save-icon');
                            if (icon) icon.className = 'bi bi-bookmark save-icon';
                        }
                    } catch (error) {
                        modalAlertContainer.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">Lỗi: ${error.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
                        unsaveArticleBtn.style.pointerEvents = 'auto';
                    }
                }

                if (unsaveProcurementBtn) {
                    event.preventDefault();
                    const { procurementId, itemCode } = unsaveProcurementBtn.dataset;
                    unsaveProcurementBtn.disabled = true;
                     try {
                        await apiService.deleteUserProcurement(procurementId);
                        fadeOutAndRemove(unsaveProcurementBtn);
                        savedProcurements.delete(itemCode); // Use itemCode to delete from the global Map
                        checkAndShowEmptyMessage(document.getElementById('saved-procurements-list'), 'procurement');
                        const mainPageButton = document.querySelector(`.save-procurement-btn[data-item-code="${itemCode}"]`);
                        if (mainPageButton) {
                            mainPageButton.dataset.isSaved = 'false';
                            mainPageButton.title = 'Lưu tin';
                            const icon = mainPageButton.querySelector('i');
                            if (icon) icon.className = 'bi bi-bookmark';
                        }
                    } catch (error) {
                         modalAlertContainer.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">Lỗi: ${error.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
                         unsaveProcurementBtn.disabled = false;
                    }
                }
            });
        }
    } else {
        authContainer.innerHTML = `
            <button id="login-btn" class="btn btn-outline-primary d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                <span>Đăng nhập với Google</span>
            </button>
        `;
        document.getElementById('login-btn').addEventListener('click', googleLogin);
    }
}