// js/auth.js

/**
 * Chuyển hướng người dùng đến trang đăng nhập của Google.
 */
function googleLogin() {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'offline'); // Yêu cầu refresh token
    authUrl.searchParams.append('prompt', 'consent'); // Luôn hiển thị màn hình đồng ý

    window.location.href = authUrl.toString();
}

/**
 * Xóa thông tin đăng nhập và tải lại trang.
 */
function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.reload();
}

/**
 * Lấy thông tin người dùng từ localStorage.
 * @returns {object|null} Thông tin người dùng hoặc null nếu chưa đăng nhập.
 */
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

/**
 * Cập nhật giao diện header dựa trên trạng thái đăng nhập.
 */
function initializeAuthUI() {
    const authContainer = document.getElementById('auth-status-container');
    if (!authContainer) return;

    const user = getCurrentUser();

    if (user) {
        // Đã đăng nhập: Hiển thị avatar và dropdown đăng xuất
        authContainer.innerHTML = `
            <div class="dropdown">
                <img src="${user.avatar_url}" alt="${user.username}" id="user-avatar" class="user-avatar dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" title="Tài khoản">
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="user-avatar">
                    <li><a class="dropdown-item" href="#">Chào, ${user.username}</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item" id="logout-btn"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</button></li>
                </ul>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
    } else {
        // Chưa đăng nhập: Hiển thị nút đăng nhập
        authContainer.innerHTML = `
            <button id="login-btn" class="btn btn-outline-primary d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                <span>Đăng nhập với Google</span>
            </button>
        `;
        document.getElementById('login-btn').addEventListener('click', googleLogin);
    }
}
