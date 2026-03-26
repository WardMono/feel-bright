(() => {
    /* -----------------------
       Loading overlay helpers
       ----------------------- */
    function showLoadingOverlay(message = "Processing your request…") {
        const overlay = document.getElementById('LoadingOverlay');
        const msgEl = document.getElementById('loadingMessage');
        if (msgEl && message) msgEl.textContent = message;
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    }
    function hideLoadingOverlay() {
        const overlay = document.getElementById('LoadingOverlay');
        if (!overlay) return;
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    }

    /* -----------------------
       Modal / form toggles
       ----------------------- */
    window.openLoginModal = function () {
        const modal = document.getElementById('loginModal');
        if (!modal) return;
        modal.classList.remove('pointer-events-none', 'opacity-0');
        modal.classList.add('opacity-100');
        modal.style.display = 'flex';
        showLoginForm();
    };

    window.openRegisterModal = function () {
        const modal = document.getElementById('loginModal');
        if (!modal) return;
        modal.classList.remove('pointer-events-none', 'opacity-0');
        modal.classList.add('opacity-100');
        modal.style.display = 'flex';
        showRegisterForm();
    };

    window.closeLoginModal = function () {
        const modal = document.getElementById('loginModal');
        if (!modal) return;
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.style.display = 'none';
        showLoginForm(); // reset view
    };

    window.showLoginForm = function () {
        document.getElementById('loginFormWrapper')?.classList.remove('hidden');
        document.getElementById('registerFormWrapper')?.classList.add('hidden');
        document.getElementById('forgotFormWrapper')?.classList.add('hidden');
    };

    window.showRegisterForm = function () {
        document.getElementById('registerFormWrapper')?.classList.remove('hidden');
        document.getElementById('loginFormWrapper')?.classList.add('hidden');
        document.getElementById('forgotFormWrapper')?.classList.add('hidden');
    };

    window.showForgotForm = function () {
        document.getElementById('forgotFormWrapper')?.classList.remove('hidden');
        document.getElementById('loginFormWrapper')?.classList.add('hidden');
        document.getElementById('registerFormWrapper')?.classList.add('hidden');
    };

    /* -----------------------
       Password toggle (reusable)
       ----------------------- */
    window.togglePasswordField = function (inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            icon?.classList.remove('fa-eye');
            icon?.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon?.classList.remove('fa-eye-slash');
            icon?.classList.add('fa-eye');
        }
    };

    /* -----------------------
       Input highlighting + remember email
       ----------------------- */
    document.addEventListener('input', (ev) => {
        const input = ev.target;
        if (!input.classList?.contains('inputField') && !input.classList?.contains('check-fill')) return;
        const filled = (input.value || '').trim() !== '';
        input.classList.toggle('filled-input', filled);
        input.classList.toggle('bg-green-50', filled && input.classList.contains('check-fill'));
        if (!filled && input.classList.contains('check-fill')) input.classList.add('bg-white');
    });

    window.addEventListener('DOMContentLoaded', () => {
        try {
            const savedEmail = localStorage.getItem('rememberedEmail');
            if (savedEmail) {
                const loginEmail = document.querySelector('#loginFormWrapper input[name="email"]') || document.getElementById('loginEmail');
                if (loginEmail) {
                    loginEmail.value = savedEmail;
                    loginEmail.classList.add('filled-input');
                }
                const rememberBox = document.getElementById('remember');
                if (rememberBox) rememberBox.checked = true;
            }
        } catch (e) { /* ignore */ }
    });

    /* -----------------------
       Session check + gate logic
       ----------------------- */
    function updateStatusText(newText) {
        const statusText = document.getElementById('statusText');
        if (!statusText) return;
        statusText.classList.add('hidden-opacity');
        setTimeout(() => {
            statusText.textContent = newText;
            statusText.classList.remove('hidden-opacity');
        }, 250);
    }

    async function safeFetchUser() {
        try {
            const r = await fetch('/auth/user', { credentials: 'include' });
            if (!r.ok) return null;
            return await r.json();
        } catch {
            return null;
        }
    }

    async function initGate() {
        const statusSpinner = document.getElementById('statusSpinner');
        const gateContent = document.getElementById('gateContent');
        updateStatusText('Checking session…');
        if (statusSpinner) statusSpinner.style.display = 'inline-block';

        const data = await safeFetchUser();
        if (data && (data.loggedIn || data.success)) {
            const name = (data.first_name && data.last_name) ? `${data.first_name} ${data.last_name}`.trim() : (data.name || data.first_name || 'User');
            updateStatusText('Signed in as ' + name + ' — redirecting…');
            if (statusSpinner) statusSpinner.style.display = 'none';

            try {
                if (data.profile_picture) localStorage.setItem('fb_avatar', data.profile_picture);
                if (data.email) localStorage.setItem('fb_email', data.email);
                if (name) localStorage.setItem('fb_name', name);
                localStorage.setItem('fb_loggedIn', 'true');
            } catch (e) { /* ignore */ }

            window.location.href = './index.html';
            return;
        }

        updateStatusText('You can continue as guest');
        if (statusSpinner) statusSpinner.style.display = 'none';
        gateContent?.classList.remove('hidden');
    }

    /* -----------------------
       Guest + login button bindings
       ----------------------- */
    function continueAsGuest() {
        try {
            localStorage.setItem('fb_name', 'Guest');
            localStorage.setItem('fb_email', 'guest@example.com');
            localStorage.setItem('fb_avatar', '/img/default-avatar.png');
            localStorage.setItem('fb_loggedIn', 'false');
        } catch (e) { /* ignore */ }

        // Show overlay before redirect
        showLoadingOverlay("Starting as Guest…");
        setTimeout(() => {
            window.location.href = './guesstest.html';
        }, 3000); // small delay so overlay is visible
    }
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('guestBtn')?.addEventListener('click', continueAsGuest);
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            // prefer modal if present
            if (typeof openLoginModal === 'function') openLoginModal();
            else window.location.href = './index.html';
        });
        // kickoff gate
        initGate();
    });

    /* -----------------------
       Login handler
       ----------------------- */
    window.handleLogin = async function (e) {
        e.preventDefault();
        const form = e.target;
        const msgBox = document.getElementById('msgBox') || form.querySelector('#msgBox');
        const email = (form.querySelector('[name="email"]')?.value) || document.getElementById('loginEmail')?.value || '';
        const password = (form.querySelector('[name="password"]')?.value) || document.getElementById('loginPassword')?.value || '';
        const remember = document.getElementById('remember')?.checked;

        try {
            if (remember) localStorage.setItem('rememberedEmail', email);
            else localStorage.removeItem('rememberedEmail');
        } catch { /* ignore */ }

        try {
            showLoadingOverlay("Logging in to your account…");
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.success) {
                // store user for index.html
                try {
                    const user = data.user || data.profile || data;
                    if (user) {
                        if (user.email) localStorage.setItem('fb_email', user.email);
                        if (user.profile_picture) localStorage.setItem('fb_avatar', user.profile_picture);
                        const name = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}`.trim() : (user.name || user.first_name || '');
                        if (name) localStorage.setItem('fb_name', name);
                    }
                    localStorage.setItem('fb_loggedIn', 'true');
                } catch (err) { console.warn('localStorage set failed', err); }

                showLoadingOverlay("Login successful! Redirecting...");
                setTimeout(() => {
                    hideLoadingOverlay();
                    form.reset();
                    window.location.href = '/';
                }, 600);
            } else {
                hideLoadingOverlay();
                showMessage(msgBox, data.error || 'Login failed: Incorrect credentials', 'red');
            }
        } catch (err) {
            console.error('Login error:', err);
            hideLoadingOverlay();
            showMessage(msgBox, 'Network error. Try again.', 'red');
        }
    };

    /* -----------------------
       Register handler
       ----------------------- */
    window.handleRegister = async function (e) {
        e.preventDefault();
        const form = e.target;
        const msgBox = document.getElementById('registerMsgBox') || form.querySelector('#registerMsgBox');

        const first_name = (form.querySelector('#firstName')?.value || '').trim();
        const middle_name = (form.querySelector('#middleName')?.value || '').trim();
        const last_name = (form.querySelector('#lastName')?.value || '').trim();
        const email = (form.querySelector('#registerEmail')?.value || '').trim();
        const password = (form.querySelector('#registerPassword')?.value || '');
        const confirm_password = (form.querySelector('#confirmPassword')?.value || '');

        try {
            showLoadingOverlay("Creating your account…");
            const res = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ first_name, middle_name, last_name, email, password, confirm_password })
            });
            const data = await res.json();
            hideLoadingOverlay();
            if (data.success) {
                showMessage(msgBox, 'Account created! Please log in…', 'green');
                setTimeout(() => {
                    form.reset();
                    document.querySelectorAll('#registerFormWrapper .check-fill').forEach(i => i.classList.remove('check-fill'));
                    showLoginForm();
                }, 700);
            } else {
                showMessage(msgBox, (data.error || 'Registration failed.'), 'red');
            }
        } catch (err) {
            hideLoadingOverlay();
            console.error('Register error:', err);
            showMessage(msgBox, 'Network error. Try again.', 'red');
        }
    };

    /* -----------------------
       Forgot / reset handler
       ----------------------- */
    window.sendReset = async function (e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[name="email"]')?.value || form.querySelector('#forgotEmail')?.value || '';
        const msgEl = document.getElementById('forgotMsg') || form.querySelector('#forgotMsg');

        try {
            showLoadingOverlay("Sending reset instructions…");
            const res = await fetch('/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            hideLoadingOverlay();
            if (msgEl) {
                msgEl.textContent = data.message || data.error || "If this email exists, you'll receive reset instructions.";
                msgEl.classList.toggle('text-green-600', !!data.success);
                msgEl.classList.toggle('text-red-500', !data.success);
            }
        } catch (err) {
            hideLoadingOverlay();
            if (msgEl) {
                msgEl.textContent = 'Network error. Try again.';
                msgEl.classList.add('text-red-500');
            }
            console.error('Reset error:', err);
        }
    };

    /* -----------------------
       Small util to show messages in small boxes
       ----------------------- */
    function showMessage(boxEl, message, color) {
        if (!boxEl) {
            alert(message);
            return;
        }
        boxEl.textContent = message;
        boxEl.className = `mb-4 p-2 text-sm rounded text-white text-center ${color === 'green' ? 'bg-green-500' : 'bg-red-500'}`;
        boxEl.classList.remove('hidden');
        setTimeout(() => boxEl.classList.add('hidden'), 3000);
    }

    /* expose nothing else to global except functions we intentionally put on window above */
})();