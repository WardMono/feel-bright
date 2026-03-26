(function () {
    'use strict';

    // --------------------------
    // small helpers
    // --------------------------
    function safeGetValue(selectors, form) {
        for (const sel of selectors) {
            const el = form ? form.querySelector(sel) : document.querySelector(sel);
            if (el && typeof el.value !== 'undefined') return (el.value || '').trim();
        }
        return '';
    }

    // Live password requirement checker for REGISTER form
window.validatePasswordStrength = function () {
  const pass = document.getElementById('gatePassword')?.value || '';
  const reqBox = document.getElementById('gatePasswordRequirements');
  if (!reqBox) return;
  reqBox.classList.remove('hidden');

  const setColor = (id, ok) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = ok ? '#16a34a' : '#dc2626';
  };

  setColor('gateLengthReq', pass.length >= 8);
  setColor('gateLowerReq', /[a-z]/.test(pass));
  setColor('gateUpperReq', /[A-Z]/.test(pass));
  setColor('gateNumberReq', /\d/.test(pass));
  setColor('gateSpecialReq', /[@$!%*?&]/.test(pass));
};

// Live confirm-password match check
window.validatePasswordMatch = function () {
  const pass = document.getElementById('gatePassword')?.value || '';
  const conf = document.getElementById('gateConfirmPassword')?.value || '';
  const ue = document.getElementById('unlockError');

  if (conf.length === 0) {
    if (ue) ue.classList.add('hidden');
    return;
  }

  if (pass !== conf) {
    if (ue) {
      ue.textContent = 'Passwords do not match.';
      ue.classList.remove('hidden');
    }
  } else {
    if (ue) ue.classList.add('hidden');
  }
};

    // --------------------------
    // post-auth redirect helpers
    // --------------------------
    function setPostAuthRedirect(url) { try { localStorage.setItem('fb_post_login_redirect', url); } catch (e) { } }
    function getPostAuthRedirect() { try { return localStorage.getItem('fb_post_login_redirect'); } catch (e) { return null; } }
    function clearPostAuthRedirect() { try { localStorage.removeItem('fb_post_login_redirect'); } catch (e) { } }

    // --------------------------
    // strip leading emoji/pictographs helper
    // --------------------------
    function stripLeadingEmoji(text) {
        if (!text) return text || '';
        try {
            return text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim();
        } catch (e) {
            return text.replace(/^[^\w\d\s]+/, '').trim();
        }
    }

    // --------------------------
    // loading overlay helpers
    // --------------------------
    function showLoadingOverlaySimple(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay') || document.getElementById('resultsLoadingOverlay');
        if (!overlay) return;
        const msgEl = overlay.querySelector('.mt-4') || overlay.querySelector('#loadingMessage') || overlay.querySelector('.loading-message');
        if (msgEl) msgEl.textContent = message;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        overlay.style.display = 'flex';
    }
    function hideLoadingOverlaySimple() {
        const overlay = document.getElementById('loadingOverlay') || document.getElementById('resultsLoadingOverlay');
        if (!overlay) return;
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        overlay.style.display = 'none';
    }

    // ==============================
    // Confirmation modal (#postRegisterModal)
    // ==============================
    function showCenteredConfirmation(message, options = {}) {
        const modal = document.getElementById('postRegisterModal');
        if (!modal) { alert(message); return; }
        const cleanMessage = stripLeadingEmoji(message || '');
        const msgEl = document.getElementById('postRegMsg');
        if (msgEl) { msgEl.textContent = cleanMessage || ''; msgEl.innerHTML = msgEl.textContent; }

        // defensive cleanup
        modal.querySelectorAll('.fa-check, .fa-check-circle, .check-icon, .check-fill').forEach(el => {
            try {
                if (el.classList && (el.classList.contains('check-fill') || el.classList.contains('check-icon'))) {
                    el.classList.remove('check-fill', 'check-icon');
                } else {
                    el.remove();
                }
            } catch (_) { }
        });

        const primaryBtn = document.getElementById('postRegBackHomeBtn');
        if (primaryBtn) {
            primaryBtn.textContent = options.primaryText || 'Back to Home';
            const newBtn = primaryBtn.cloneNode(true);
            primaryBtn.parentNode.replaceChild(newBtn, primaryBtn);

            if (typeof options.primaryAction === 'function') {
                newBtn.addEventListener('click', (ev) => { ev.preventDefault(); options.primaryAction(); }, { once: true });
            } else if (options.logoutOnPrimary) {
                newBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    try { fetch('/logout', { method: 'POST', credentials: 'include' }).finally(() => { window.location.href = 'index.html?openLogin=1'; }); }
                    catch (_) { window.location.href = 'index.html?openLogin=1'; }
                }, { once: true });
            } else if (options.primaryHref) {
                newBtn.addEventListener('click', (ev) => { ev.preventDefault(); window.location.href = options.primaryHref; }, { once: true });
            } else {
                newBtn.addEventListener('click', (ev) => { ev.preventDefault(); window.location.href = 'index.html?openLogin=1'; }, { once: true });
            }
        }

        modal.querySelectorAll('button').forEach(btn => {
            if (btn.id === (primaryBtn && primaryBtn.id)) return;
            btn.addEventListener('click', () => { hideCenteredConfirmation(); }, { once: false });
        });

        modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex';
        if (document.getElementById('postRegBackHomeBtn')) document.getElementById('postRegBackHomeBtn').focus();
    }
    function hideCenteredConfirmation() {
        const modal = document.getElementById('postRegisterModal');
        if (!modal) return;
        modal.classList.add('hidden'); modal.classList.remove('flex'); modal.style.display = 'none';
    }
    window.openPostRegisterModal = function (message) { showCenteredConfirmation(stripLeadingEmoji(message) || 'We sent a confirmation link to your email.', { primaryText: 'Back to Home', primaryHref: 'index.html?openLogin=1' }); };
    window.closePostRegisterModal = hideCenteredConfirmation;
    window.goHomeAndOpenLogin = function () { window.location.href = 'index.html?openLogin=1'; };

    // ==============================
    // Summary modal helpers (#summaryModal)
    // ==============================
    function openSummaryModal() {
        const modal = document.getElementById('summaryModal');
        if (!modal) return;
        modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex';
    }
    function closeSummaryModal() {
        const modal = document.getElementById('summaryModal');
        if (!modal) return;
        modal.classList.add('hidden'); modal.classList.remove('flex'); modal.style.display = 'none';
    }
    window.openSummaryModal = openSummaryModal;
    window.closeSummaryModal = closeSummaryModal;

    // attach defensive Continue button handler that mirrors previous inline onclick behavior
    document.addEventListener('DOMContentLoaded', () => {
        const continueBtn = document.getElementById('resultsContinueBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                try { if (typeof setPostAuthRedirect === 'function') setPostAuthRedirect('index.html?openLogin=1'); } catch (e) { console.warn(e); }
                try { if (typeof openUnlockModal === 'function') openUnlockModal(); } catch (e) { console.warn(e); }
                try { if (typeof closeSummaryModal === 'function') closeSummaryModal(); else closeSummaryModal = function () { }; } catch (e) { console.warn(e); }
            });
        }
    });

    // ==============================
    // FORGOT PASSWORD (generic)
    // ==============================
    window.showForgotForm = function () {
        document.getElementById('forgotFormWrapper')?.classList.remove('hidden');
        document.getElementById('loginFormWrapper')?.classList.add('hidden');
        document.getElementById('registerFormWrapper')?.classList.add('hidden');
    };

    async function sendReset(e) {
        e.preventDefault();
        const form = e.target;
        const emailInput = form.querySelector('input[name="email"]') || form.querySelector('#forgotEmail');
        const inlineMsg = form.querySelector('#msg') || document.getElementById('msg');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!emailInput) return;

        const email = (emailInput.value || '').trim();
        if (!email) {
            if (inlineMsg) { inlineMsg.textContent = 'Please enter your email.'; inlineMsg.classList.add('text-red-500'); }
            else {
                // use unlockError if available, otherwise console.warn (no popups)
                const ue = document.getElementById('unlockError');
                if (ue) { ue.textContent = 'Please enter your email.'; ue.classList.remove('hidden'); }
                else console.warn('Please enter your email.');
            }
            return;
        }

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
        if (inlineMsg) inlineMsg.textContent = '';

        try {
            const res = await fetch('/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email }) });
            let data = null;
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('application/json')) {
                try { data = await res.json(); } catch (err) { data = { success: res.ok, message: res.ok ? 'If that email exists we sent a reset link.' : 'Request failed' }; }
            } else {
                const text = await res.text();
                data = { success: res.ok, message: text || (res.ok ? 'Reset link sent.' : 'Request failed') };
            }

            const message = stripLeadingEmoji(data.message || data.error || 'If that email exists we sent a password reset link.');
            if (data.success) {
                showCenteredConfirmation(message, { primaryText: 'Back to Home', logoutOnPrimary: true });
                form.reset();
            } else {
                // show inline error, do NOT open centered confirmation
                const ue = document.getElementById('unlockError');
                if (inlineMsg) { inlineMsg.textContent = message; inlineMsg.classList.remove('text-green-600'); inlineMsg.classList.add('text-red-500'); }
                else if (ue) { ue.textContent = message; ue.classList.remove('hidden'); }
                else console.warn(message);
            }
        } catch (err) {
            console.error('Forgot password error:', err);
            if (inlineMsg) { inlineMsg.textContent = 'Network error. Try again.'; inlineMsg.classList.add('text-red-500'); }
            else {
                const ue = document.getElementById('unlockError');
                if (ue) { ue.textContent = 'Network error. Try again.'; ue.classList.remove('hidden'); }
                else console.warn('Network error. Try again.');
            }
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Reset Link'; }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const forgotForm = document.querySelector('#forgotFormWrapper form');
        if (forgotForm && !forgotForm.__hasHandler) { forgotForm.addEventListener('submit', sendReset); forgotForm.__hasHandler = true; }
    });

    // ==============================
    // LOGIN / REGISTER UI toggling (global)
    // ==============================
    function showLoginForm() {
        document.getElementById('loginFormWrapper')?.classList.remove('hidden');
        document.getElementById('registerFormWrapper')?.classList.add('hidden');
        document.getElementById('forgotFormWrapper')?.classList.add('hidden');
    }
    function showRegisterForm() {
        document.getElementById('registerFormWrapper')?.classList.remove('hidden');
        document.getElementById('loginFormWrapper')?.classList.add('hidden');
        document.getElementById('forgotFormWrapper')?.classList.add('hidden');
    }
    window.showLoginForm = showLoginForm;
    window.showRegisterForm = showRegisterForm;

    window.openLoginModal = function () {
        const modal = document.getElementById('loginModal'); if (!modal) return;
        modal.classList.remove('pointer-events-none', 'opacity-0'); modal.classList.add('opacity-100'); modal.style.display = 'flex';
        showLoginForm();
    };
    window.openRegisterModal = function () {
        const modal = document.getElementById('loginModal'); if (!modal) return;
        modal.classList.remove('pointer-events-none', 'opacity-0'); modal.classList.add('opacity-100'); modal.style.display = 'flex';
        showRegisterForm();
    };
    window.closeLoginModal = function () { const modal = document.getElementById('loginModal'); if (!modal) return; modal.classList.remove('opacity-100'); modal.classList.add('opacity-0', 'pointer-events-none'); modal.style.display = 'none'; showLoginForm(); };

    // ==============================
    // Unlock / Gate modal (guesttest.html)
    // ==============================
    window.openUnlockModal = function () { const m = document.getElementById('unlockModal'); if (!m) return; m.classList.remove('hidden'); m.classList.add('flex'); m.style.display = 'flex'; swapGateTab('login'); };
    window.closeUnlockModal = function () { const m = document.getElementById('unlockModal'); if (!m) return; m.classList.add('hidden'); m.classList.remove('flex'); m.style.display = 'none'; };

    function swapGateTab(tab) {
        const loginForm = document.getElementById('gateLoginForm');
        const registerForm = document.getElementById('gateRegisterForm');
        const tabLoginBtn = document.getElementById('gateTabLogin');
        const tabRegBtn = document.getElementById('gateTabRegister');
        if (tab === 'register') {
            if (loginForm) loginForm.classList.add('hidden');
            if (registerForm) registerForm.classList.remove('hidden');
            if (tabLoginBtn) tabLoginBtn.classList.remove('bg-green-50');
            if (tabRegBtn) tabRegBtn.classList.add('bg-green-50');
        } else {
            if (loginForm) loginForm.classList.remove('hidden');
            if (registerForm) registerForm.classList.add('hidden');
            if (tabLoginBtn) tabLoginBtn.classList.add('bg-green-50');
            if (tabRegBtn) tabRegBtn.classList.remove('bg-green-50');
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const tLogin = document.getElementById('gateTabLogin');
        const tReg = document.getElementById('gateTabRegister');
        if (tLogin) tLogin.addEventListener('click', () => swapGateTab('login'));
        if (tReg) tReg.addEventListener('click', () => swapGateTab('register'));
    });

    // ==============================
    // Toggle password helpers (global + gate)
    // ==============================
    window.togglePasswordField = function (inputId, iconId) {
        const iconEl = document.getElementById(iconId); if (!iconEl) return;
        const form = iconEl.closest('form') || document;
        const input = form.querySelector('#' + inputId) || document.getElementById(inputId);
        if (!input) return;
        if (input.type === 'password') { input.type = 'text'; iconEl.classList.replace('fa-eye', 'fa-eye-slash'); }
        else { input.type = 'password'; iconEl.classList.replace('fa-eye-slash', 'fa-eye'); }
    };
    window.toggleGatePassword = function (inputId, iconId) { window.togglePasswordField(inputId, iconId); };
    window.togglePassword = function () { window.togglePasswordField('password', 'toggleIcon'); };

    // ==============================
    // Input highlighting
    // ==============================
    document.addEventListener('input', (ev) => {
        const input = ev.target;
        if (!input.classList?.contains('inputField') && !input.classList?.contains('check-fill')) return;
        const filled = (input.value || '').trim() !== '';
        input.classList.toggle('filled-input', filled);
        if (input.classList.contains('check-fill')) {
            input.classList.toggle('bg-green-50', filled);
            if (!filled) input.classList.add('bg-white');
        }
    });

    // ==============================
    // Remember email + defensive cleanup
    // ==============================
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const savedEmail = localStorage.getItem('rememberedEmail');
            if (savedEmail) {
                const loginWrapper = document.getElementById('loginFormWrapper');
                const loginEmail = loginWrapper?.querySelector('input[name="email"]');
                if (loginEmail) { loginEmail.value = savedEmail; loginEmail.classList.add('filled-input'); }
                const rememberBox = document.getElementById('remember'); if (rememberBox) rememberBox.checked = true;
            }
        } catch (e) { }
        document.querySelectorAll('.check-fill').forEach(el => el.classList.remove('check-fill'));
        document.querySelectorAll('.fa-check, .fa-check-circle, .check-icon').forEach(el => { try { el.remove(); } catch (_) { } });
        const postMsg = document.getElementById('postRegMsg'); if (postMsg) postMsg.textContent = stripLeadingEmoji(postMsg.textContent);
    });

    // ==============================
    // LOGIN handler (works for global + gate)
    // ==============================
    async function handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const msgBox = form.querySelector('#msgBox') || form.querySelector('#unlockError') || document.getElementById('msgBox');

        const email = safeGetValue(['input[name="email"]', '#gateLoginEmail', '#loginEmail'], form);
        const password = safeGetValue(['input[name="password"]', '#gateLoginPassword', '#loginPassword'], form);
        const remember = document.getElementById('remember')?.checked;
        const submitBtn = form.querySelector('button[type="submit"]');

        try { if (remember) localStorage.setItem('rememberedEmail', email); else localStorage.removeItem('rememberedEmail'); } catch { }

        try {
            if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.orig = submitBtn.textContent; submitBtn.textContent = 'Signing in…'; }
            showLoadingOverlaySimple('Signing in…');

            const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password }) });

            // Safely parse response body
            let data = null;
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('application/json')) {
                try { data = await res.json(); } catch (err) { data = {}; }
            } else {
                const text = await res.text().catch(() => '');
                data = { success: res.ok, message: text };
            }

            if (!res.ok) {
                const m = stripLeadingEmoji((data && (data.error || data.message)) ? (data.error || data.message) : `Server error (${res.status})`);
                // Show inline error only (no centered confirmation)
                openUnlockModal();
                const ue = document.getElementById('unlockError');
                if (msgBox) { msgBox.textContent = m; msgBox.classList.remove('hidden'); msgBox.classList.add('text-red-500'); }
                else if (ue) { ue.textContent = m; ue.classList.remove('hidden'); }
                else console.warn(m);
                return;
            }

            if (data && data.success) {
                let user = null;
                try { const r = await fetch('/auth/user', { credentials: 'include' }); if (r.ok) user = await r.json(); } catch (err) { console.warn('Could not fetch /auth/user after login', err); }

                try {
                    if (typeof refreshProfileUI === 'function' && user) {
                        refreshProfileUI(user);
                        if (user.email) localStorage.setItem('fb_email', user.email);
                        if (user.profile_picture) localStorage.setItem('fb_avatar', user.profile_picture);
                        if (user.first_name || user.last_name) localStorage.setItem('fb_name', `${user.first_name || ''} ${user.last_name || ''}`.trim());
                    } else if (typeof onAuthSuccess === 'function') {
                        onAuthSuccess(user || { email, name: data.name || '' });
                    }
                } catch (err) { console.error('Post-login UI update failed', err); }

                const redirect = getPostAuthRedirect() || 'index.html';
                clearPostAuthRedirect();
                setTimeout(() => {
                    hideLoadingOverlaySimple();
                    form.reset();
                    if (form.id === 'gateLoginForm') closeUnlockModal();
                    window.location.href = redirect;
                }, 250);
            } else {
                const m = data && (data.error || data.message) ? (data.error || data.message) : 'Login failed: Incorrect credentials';
                // show inline error, do NOT open centered confirmation modal for this error
                openUnlockModal();
                const ue = document.getElementById('unlockError');
                if (msgBox) { msgBox.textContent = m; msgBox.classList.remove('hidden'); }
                else if (ue) { ue.textContent = m; ue.classList.remove('hidden'); }
                else console.warn(m);
            }
        } catch (err) {
            console.error('Login error:', err);
            const friendly = err && err.message ? err.message : 'Network error. Try again.';
            openUnlockModal();
            const ue = document.getElementById('unlockError');
            if (msgBox) { msgBox.textContent = friendly; msgBox.classList.add('text-red-500'); }
            else if (ue) { ue.textContent = friendly; ue.classList.remove('hidden'); }
            else console.warn(friendly);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.orig || submitBtn.textContent; delete submitBtn.dataset.orig; }
            hideLoadingOverlaySimple();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        if (loginForm && !loginForm.__hasLoginHandler) { loginForm.addEventListener('submit', handleLogin); loginForm.__hasLoginHandler = true; }
        const gateLogin = document.getElementById('gateLoginForm');
        if (gateLogin && !gateLogin.__hasLoginHandler) { gateLogin.addEventListener('submit', handleLogin); gateLogin.__hasLoginHandler = true; }
    });
    window.handleLogin = handleLogin;

    // ==============================
// REGISTER handler (works for global + gate)
// ==============================
async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || '';
    const msgBox = form.querySelector('#msgBox') || form.querySelector('#unlockError') || document.getElementById('msgBox');

    function showMessage(message, type = 'error', keep = false) {
  const ue = document.getElementById('unlockError');
  
  if (ue) {
    ue.textContent = message;
    ue.className = `mb-4 p-2 text-sm rounded text-white text-center ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    ue.classList.remove('hidden');
    if (!keep) setTimeout(() => ue.classList.add('hidden'), 5000);
  } else {
    console.warn("No error container found:", message);
    alert(message); // fallback
  }
}

    const path = (window.location.pathname || '').toLowerCase();
    const isGuestPage =
        path.includes('guesstest.html') ||
        path.includes('guesttest.html') ||
        path.includes('/guesttest') ||
        path.includes('/guesstest');

    try {
        const first_name = safeGetValue(['#firstName', '#gateFirstName'], form);
        const middle_name = safeGetValue(['#middleName', '#gateMiddleName'], form);
        const last_name = safeGetValue(['#lastName', '#gateLastName'], form);
        const email = safeGetValue(['input[name="email"]', '#gateEmail', '#email'], form);
        const password = safeGetValue(['input[name="password"]', '#gatePassword', '#password'], form);
        const confirm_password = safeGetValue(['#confirmPassword', '#gateConfirmPassword'], form);

        // ✅ Client-side validation BEFORE disabling button
        if (!password || password.length < 8) {
            showMessage("Password must be at least 8 characters long.", "error", true);
            return;
        }
        if (password !== confirm_password) {
            showMessage("Passwords do not match.", "error", true);
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering...';
        }
        showLoadingOverlaySimple('Creating account…');

        const res = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ first_name, middle_name, last_name, email, password, confirm_password })
        });

        let data = null;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json')) {
            try { data = await res.json(); } catch (err) { data = {}; }
        } else {
            const text = await res.text().catch(() => '');
            data = { success: res.ok, message: text || (res.ok ? 'Registration successful. Check your email to confirm.' : 'Registration failed') };
        }

        if (!res.ok) {
            const serverMsg = stripLeadingEmoji((data && (data.error || data.message)) ? (data.error || data.message) : `Server error (${res.status})`);
            openUnlockModal();
            showMessage(serverMsg, 'error', true);
            return;
        }

        const serverMessageRaw = (data && (data.message || data.error)) ? (data.message || data.error) : '';
        const serverMessage = stripLeadingEmoji(serverMessageRaw);

        // Guest flow handling
        if (isGuestPage) {
            if (data && data.success) {
                const msg = serverMessage || 'We sent a confirmation link to your email. Please verify your account before logging in.';
                showCenteredConfirmation(msg, { primaryHref: 'index.html?openLogin=1' });
                form.reset();
                return;
            } else {
                const errMsg = (data && (data.error || data.message)) ? (data.error || data.message) : 'Registration failed.';
                openUnlockModal();
                showMessage(errMsg, 'error', true);
                return;
            }
        }

        // Normal flow
        if (data && data.success) {
            let user = null;
            try {
                const r = await fetch('/auth/user', { credentials: 'include' });
                if (r.ok) user = await r.json();
            } catch (err) { console.warn('Could not fetch /auth/user after signup', err); }

            if (user && Object.keys(user).length) {
                if (typeof showLoadingOverlaySimple === 'function') showLoadingOverlaySimple('Account created — signing in…');
                try {
                    if (typeof refreshProfileUI === 'function') refreshProfileUI(user);
                    if (user.email) localStorage.setItem('fb_email', user.email);
                    if (user.profile_picture) localStorage.setItem('fb_avatar', user.profile_picture);
                    if (user.first_name || user.last_name) localStorage.setItem('fb_name', `${user.first_name || ''} ${user.last_name || ''}`.trim());
                    if (typeof onAuthSuccess === 'function') onAuthSuccess(user);
                } catch (err) { console.error('Post-signup UI update failed', err); }

                const redirect = (typeof getPostAuthRedirect === 'function' && getPostAuthRedirect()) || 'index.html';
                if (typeof clearPostAuthRedirect === 'function') clearPostAuthRedirect();
                if (form.id === 'gateRegisterForm') closeUnlockModal();
                form.reset();
                window.location.href = redirect;
                return;
            } else {
                const msg = serverMessage || 'We sent a confirmation link to your email. Please verify your account before logging in.';
                showCenteredConfirmation(msg, { primaryText: 'Back to Home', primaryHref: 'index.html?openLogin=1' });
                form.reset();
                return;
            }
        } else {
            const errMsg = (data && (data.error || data.message)) ? (data.error || data.message) : 'Registration failed.';
            openUnlockModal();
            showMessage('❌ ' + stripLeadingEmoji(errMsg), 'error', true);
        }
    } catch (err) {
        console.error('Register error:', err);
        const ue = document.getElementById('unlockError');
        const friendly = err && err.message ? err.message : 'Network error. Try again.';
        if (msgBox) {
            msgBox.textContent = friendly;
            msgBox.className = 'mb-4 p-2 text-sm rounded text-white text-center bg-red-600';
            msgBox.classList.remove('hidden');
        } else if (ue) {
            ue.textContent = friendly;
            ue.className = 'mb-4 p-2 text-sm rounded text-white text-center bg-red-600';
            ue.classList.remove('hidden');
        } else {
            console.warn(friendly);
        }
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalBtnText; }
        hideLoadingOverlaySimple();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm && !registerForm.__hasRegisterHandler) {
        registerForm.addEventListener('submit', handleRegister);
        registerForm.__hasRegisterHandler = true;
    }
    const gateRegisterForm = document.getElementById('gateRegisterForm');
    if (gateRegisterForm && !gateRegisterForm.__hasRegisterHandler) {
        gateRegisterForm.addEventListener('submit', handleRegister);
        gateRegisterForm.__hasRegisterHandler = true;
    }
});
window.handleRegister = handleRegister;


    // ==============================
    // Auto-open login modal via ?openLogin
    // ==============================
    (function () {
        const params = new URLSearchParams(window.location.search);
        if (params.get('openLogin') === '1' || params.get('openLogin') === 'true') {
            window.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (typeof window.openLoginModal === 'function') window.openLoginModal();
                    else {
                        const lm = document.getElementById('loginModal');
                        if (lm) { lm.classList.remove('hidden', 'pointer-events-none', 'opacity-0'); lm.classList.add('flex', 'opacity-100'); lm.style.display = 'flex'; }
                    }
                }, 200);
            });
        }
    })();

})();
