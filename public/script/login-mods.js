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

  // --- displayMessage helper (form-scoped, fallback to global) ---
  function displayMessage(form, message, type = 'error', keep = false) {
    const box = (form && form.querySelector && form.querySelector('.msgBox')) ||
      document.querySelector('.msgBox') ||
      document.getElementById('msgBox'); // legacy fallback

    if (!box) {
      console.warn('displayMessage: no message box found, falling back to alert.', message);
      alert(message);
      return;
    }

    // set text & ARIA
    box.textContent = message;
    try { box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); } catch (_) { }

    // ensure visible and basic utilities
    box.classList.remove('hidden');
    box.classList.add('mb-4', 'p-2', 'text-sm', 'rounded', 'text-white', 'text-center');

    // add classes + inline fallback color (prevents tailwind purge issues)
    if (type === 'success') {
      box.classList.remove('bg-red-600');
      box.classList.add('bg-green-600');
      box.style.backgroundColor = '#16a34a'; // bg-green-600
    } else {
      box.classList.remove('bg-green-600');
      box.classList.add('bg-red-600');
      box.style.backgroundColor = '#dc2626'; // bg-red-600
    }
    box.style.color = '#ffffff';

    // auto-hide unless keep===true
    if (!keep) {
      clearTimeout(box.__msgTimeout);
      box.__msgTimeout = setTimeout(() => {
        try { box.classList.add('hidden'); } catch (_) { }
      }, 3000);
    }
  }

  // Show styled error inside modal (matches your HTML #error-message / #error-text)
  function showModalError(message, options = {}) {
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    if (!errorMessage || !errorText) return;

    errorText.textContent = message || 'Something went wrong.';
    // show
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('flex');

    // shake animation (CSS keyframes assumed in your global CSS; fallback below)
    try {
      errorMessage.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => { errorMessage.style.animation = ''; }, 600);
    } catch (e) { /* ignore */ }

    // optionally keep visible indefinitely if keep=true
    if (!options.keep) {
      clearTimeout(errorMessage.__autoHide);
      errorMessage.__autoHide = setTimeout(() => {
        try { errorMessage.classList.remove('flex'); errorMessage.classList.add('hidden'); } catch (_) { }
      }, options.timeout || 5000);
    }
  }

  // Make displayMessage try modal-style error if present (keeps legacy behavior)
  (function attachDisplayMessageFallback() {
    const orig = displayMessage;
    displayMessage = function (form, message, type = 'error', keep = false) {
      // if modal error exists and we're showing an error, use it
      if (type === 'error' && document.getElementById('error-message')) {
        showModalError(message, { keep, timeout: 5000 });
        return;
      }
      // otherwise use original
      try { orig(form, message, type, keep); } catch (e) { console.warn(e); }
    };
  })();


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
          try { fetch('/logout', { method: 'POST', credentials: 'include' }).finally(() => { window.location.href = 'index.html'; }); }
          catch (_) { window.location.href = 'index.html'; }
        }, { once: true });
      } else if (options.primaryHref) {
        newBtn.addEventListener('click', (ev) => { ev.preventDefault(); window.location.href = options.primaryHref; }, { once: true });
      } else {
        newBtn.addEventListener('click', (ev) => { ev.preventDefault(); window.location.href = 'index.html'; }, { once: true });
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
  window.openPostRegisterModal = function (message) { showCenteredConfirmation(stripLeadingEmoji(message) || 'We sent a confirmation link to your email.', { primaryText: 'Back to Home', logoutOnPrimary: true }); };
  window.closePostRegisterModal = hideCenteredConfirmation;
  window.goHomeAndOpenLogin = function () { window.location.href = 'index.html'; };

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
        try { if (typeof setPostAuthRedirect === 'function') setPostAuthRedirect('usertest.html'); } catch (e) { console.warn(e); }
        // removed guest/lock/unlock related calls (separate file handles guest flows)
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

  // Fixed frontend forgot password handler
  async function sendReset(e) {
    e.preventDefault();
    const form = e.target;

    // More robust element finding
    const emailInput = form.querySelector('input[name="email"]') ||
      form.querySelector('#forgotEmail') ||
      form.querySelector('input[type="email"]');

    const inlineMsg = form.querySelector('#msg') ||
      form.querySelector('.msg') ||
      document.getElementById('msg');

    const submitBtn = form.querySelector('button[type="submit"]');

    if (!emailInput) {
      console.error('Email input not found in forgot form');
      alert('Form error. Please refresh and try again.');
      return;
    }

    const email = (emailInput.value || '').trim();

    // Clear previous messages
    if (inlineMsg) {
      inlineMsg.textContent = '';
      inlineMsg.classList.remove('text-red-500', 'text-green-600');
    }

    // Validate email
    if (!email) {
      const message = 'Please enter your email address.';
      if (inlineMsg) {
        inlineMsg.textContent = message;
        inlineMsg.classList.add('text-red-500');
      } else {
        showModalError(message);
      }
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const message = 'Please enter a valid email address.';
      if (inlineMsg) {
        inlineMsg.textContent = message;
        inlineMsg.classList.add('text-red-500');
      } else {
        showModalError(message);
      }
      return;
    }

    // Update button state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      submitBtn.classList.add('opacity-50');
    }

    try {
      console.log('Sending forgot password request for:', email);

      const response = await fetch('/forgot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email: email })
      });

      console.log('Forgot password response status:', response.status);

      let data = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          data = {
            success: response.ok,
            message: response.ok ? 'Request processed.' : 'Request failed'
          };
        }
      } else {
        const text = await response.text();
        data = {
          success: response.ok,
          message: text || (response.ok ? 'Reset link sent.' : 'Request failed')
        };
      }

      console.log('Forgot password response data:', data);

      const message = stripLeadingEmoji(data.message || data.error || 'If that email exists, we sent a reset link.');

      if (response.ok && data.success !== false) {
        // Success - show confirmation modal
        showCenteredConfirmation(message, {
          primaryText: 'Back to Login',
          primaryAction: () => {
            hideCenteredConfirmation();
            showLoginForm();
          }
        });
        form.reset();

        // Also show inline success message
        if (inlineMsg) {
          inlineMsg.textContent = 'Check your email for reset instructions.';
          inlineMsg.classList.remove('text-red-500');
          inlineMsg.classList.add('text-green-600');
        }
      } else {
        // Error - show error message
        if (inlineMsg) {
          inlineMsg.textContent = message;
          inlineMsg.classList.remove('text-green-600');
          inlineMsg.classList.add('text-red-500');
        } else {
          showModalError(message);
        }
      }

    } catch (networkError) {
      console.error('Network error in forgot password:', networkError);
      const errorMessage = 'Network error. Please check your connection and try again.';

      if (inlineMsg) {
        inlineMsg.textContent = errorMessage;
        inlineMsg.classList.remove('text-green-600');
        inlineMsg.classList.add('text-red-500');
      } else {
        showModalError(errorMessage);
      }
    } finally {
      // Always restore button state
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
        submitBtn.classList.remove('opacity-50');
      }
    }
  }

  // Improved form attachment with better debugging
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Setting up forgot password form...');

    // Try multiple selectors to find the forgot form
    const forgotForm = document.querySelector('#forgotFormWrapper form') ||
      document.querySelector('#forgotForm') ||
      document.querySelector('form[action*="forgot"]') ||
      document.querySelector('.forgot-form form');

    if (forgotForm) {
      console.log('Found forgot password form:', forgotForm);

      if (!forgotForm.__hasHandler) {
        forgotForm.addEventListener('submit', sendReset);
        forgotForm.__hasHandler = true;
        console.log('Forgot password handler attached successfully');

        // Also log form elements for debugging
        const emailInput = forgotForm.querySelector('input[type="email"]');
        const submitBtn = forgotForm.querySelector('button[type="submit"]');
        console.log('Form elements found - Email:', !!emailInput, 'Submit:', !!submitBtn);
      }
    } else {
      console.warn('Forgot password form not found. Available forms:', document.querySelectorAll('form'));
    }
  });

  // Helper function to manually trigger forgot password (for debugging)
  window.testForgotPassword = function (email) {
    const testEvent = {
      preventDefault: () => { },
      target: {
        querySelector: (selector) => {
          if (selector.includes('email')) {
            return { value: email };
          }
          if (selector.includes('submit')) {
            return { disabled: false, textContent: 'Send Reset Link' };
          }
          return null;
        }
      }
    };
    sendReset(testEvent);
  };

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
  // Toggle password helpers (global)
  // ==============================
  window.togglePasswordField = function (inputId, iconId) {
    const iconEl = document.getElementById(iconId); if (!iconEl) return;
    const form = iconEl.closest('form') || document;
    const input = form.querySelector('#' + inputId) || document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') { input.type = 'text'; iconEl.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { input.type = 'password'; iconEl.classList.replace('fa-eye-slash', 'fa-eye'); }
  };
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
  // LOGIN handler
  // ==============================
  async function handleLogin(e) {
    e.preventDefault();
    const form = e.target || document.getElementById('loginForm');

    // defensively find submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    // const originalBtnHTML = submitBtn ? submitBtn.innerHTML : null; // no longer used

    // read inputs
    const email = safeGetValue(['input[name="email"]', '#loginEmail', '#email'], form);
    const password = safeGetValue(['input[name="password"]', '#loginPassword', '#password'], form);
    const remember = document.getElementById('remember')?.checked;

    // Put the button into loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-loading');
      submitBtn.innerHTML = 'Signing in';
    }

    // hide previous messages
    try { document.getElementById('error-message')?.classList.add('hidden'); } catch (_) { }
    try { document.getElementById('msgBox')?.classList.add('hidden'); } catch (_) { }

    try {
      if (remember) { try { localStorage.setItem('rememberedEmail', email); } catch (_) { } }
      else { try { localStorage.removeItem('rememberedEmail'); } catch (_) { } }

      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      // parse JSON safely
      let data = {};
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('application/json')) {
        try { data = await res.json(); } catch (_) { data = {}; }
      } else {
        const text = await res.text().catch(() => '');
        data = { success: res.ok, message: text };
      }

      if (data && data.success) {
        // optional: update UI/profile and start session check
        try { startSessionCheck(); } catch (_) { }
        try { showLoadingOverlaySimple('Signing in…'); } catch (_) { }

        // small delay so user sees feedback, then redirect
        setTimeout(() => {
          try { hideLoadingOverlaySimple(); } catch (_) { }
          try { form.reset(); } catch (_) { }
          const redirect = getPostAuthRedirect() || '/';
          clearPostAuthRedirect();
          window.location.href = redirect;
        }, 300);
      } else {
        const m = (data && (data.error || data.message)) ? (data.error || data.message) : 'Login failed: Incorrect credentials';
        showModalError(stripLeadingEmoji(m));
        hideLoadingOverlaySimple();
      }
    } catch (err) {
      console.error('Login error:', err);
      showModalError('Network error. Try again.');
      hideLoadingOverlaySimple();
    } finally {
      // ALWAYS restore button appearance/text to "Sign in"
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-loading');
        submitBtn.innerHTML = 'Sign in'; // <- forced reset to "Sign in"
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm.__hasLoginHandler) { loginForm.addEventListener('submit', handleLogin); loginForm.__hasLoginHandler = true; }
  });
  window.handleLogin = handleLogin;

// ==============================
// REGISTER handler (robust, uses unique register IDs)
// ==============================
async function handleRegister(e) {
  e.preventDefault();
  const form = e.currentTarget || e.target || document.getElementById('registerForm');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn?.textContent || 'Create account';

  // helper to show message inside this form
  function showMessage(message, type = 'error', keep = false) {
    displayMessage(form, message, type, keep);
  }

  // read values from the *register* inputs (unique IDs)
  const first_name = (form.querySelector('#firstName')?.value || '').trim();
  const middle_name = (form.querySelector('#middleName')?.value || '').trim();
  const last_name = (form.querySelector('#lastName')?.value || '').trim();
  const email = (form.querySelector('#registerEmail')?.value || '').trim();
  const password = form.querySelector('#registerPassword')?.value || '';
  const confirm_password = form.querySelector('#registerConfirmPassword')?.value || '';

  // set button loading state early (we'll always clear it in finally)
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';
    submitBtn.classList.add('btn-loading');
  }

  // --- Basic validation ---
  if (!first_name || !last_name || !email || !password || !confirm_password) {
    showMessage('Please fill in all required fields.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      submitBtn.classList.remove('btn-loading');
    }
    return;
  }

  if (password !== confirm_password) {
  // Show the error visually
  showMessage('Passwords do not match.', 'error', true);

  // Ensure the form-level message box is visible even if Tailwind hid it
  const box = form.querySelector('.msgBox') || document.getElementById('registerMsgBox');
  if (box) {
    box.classList.remove('hidden');
    box.textContent = 'Passwords do not match.';
    box.style.backgroundColor = '#FFF1F1'; // red background
    box.style.color = '#D32F2F';
    box.style.display = 'block';
    // Optional: shake animation for feedback
    box.style.animation = 'shake 0.4s ease';
    setTimeout(() => (box.style.animation = ''), 500);
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    submitBtn.classList.remove('btn-loading');
  }

  return;
}


  // Password strength check (≥8 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    showMessage(
      'Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, one number, and one special character.',
      'error'
    );
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      submitBtn.classList.remove('btn-loading');
    }
    return;
  }

  // --- Submit to server ---
  try {
    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ first_name, middle_name, last_name, email, password, confirm_password })
    });

    let data = null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      try { data = await res.json(); } catch (_) { data = { success: res.ok, message: 'Response parse error' }; }
    } else {
      const text = await res.text().catch(() => '');
      data = { success: res.ok, message: text || (res.ok ? 'Registration successful' : 'Registration failed') };
    }

    const serverMessageRaw = data?.message || data?.error || '';
    const serverMessage = stripLeadingEmoji(serverMessageRaw);
    const needsConfirmation = typeof serverMessage === 'string' && /confirm|verification|verify|confirmation/i.test(serverMessage);

    if (res.ok && data && data.success) {
      // show confirmation modal (doesn't auto-redirect)
      showCenteredConfirmation(serverMessage || 'Account created. Check your email to verify (if required).', {
        primaryText: 'Back to Home',
        logoutOnPrimary: true
      });
      form.reset();
      return;
    } else {
      const msg = (data && (data.error || data.message)) || 'Registration failed. Please try again.';
      showMessage(stripLeadingEmoji(msg), 'error');
    }
  } catch (err) {
    console.error('Registration error:', err);
    showMessage('Network error. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
      submitBtn.classList.remove('btn-loading');
    }
  }
}

// Attach the handler to the register form defensively
document.addEventListener('DOMContentLoaded', () => {
  const regForm = document.getElementById('registerForm');
  if (regForm && !regForm.__hasRegisterHandler) {
    regForm.addEventListener('submit', handleRegister);
    regForm.__hasRegisterHandler = true;
  }
});


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

  // Session checking functionality
  let sessionCheckInterval = null;

  function startSessionCheck() {
    // Check every 30 seconds
    sessionCheckInterval = setInterval(checkSessionStatus, 30000);
  }

  function stopSessionCheck() {
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
  }

  function checkSessionStatus() {
    fetch('/api/session/check', {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(data => {
        if (data.forceLogout) {
          stopSessionCheck();
          showForceLogoutModal(data.message);
        }
      })
      .catch(error => {
        console.error('Session check error:', error);
      });
  }

  function showForceLogoutModal(message) {
    const modal = document.getElementById('forceLogoutModal');
    if (!modal) return;

    // Set the message
    const messageEl = document.getElementById('forceLogoutMessage');
    if (messageEl) messageEl.textContent = message;

    // Show the modal with proper styling
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    modal.style.display = 'flex';

    // Set up button handlers
    const confirmBtn = document.getElementById('forceLogoutConfirm');
    const closeBtn = document.getElementById('forceLogoutClose');

    if (confirmBtn) {
      confirmBtn.onclick = () => {
        window.location.href = '/login.html';
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('opacity-100');
        modal.style.display = 'none';
        window.location.href = '/login.html';
      };
    }

    // Prevent interaction with background elements
    document.body.style.overflow = 'hidden';
  }

  // Start session checking when user is logged in
  document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    fetch('/auth/user', {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(user => {
        if (user.loggedIn) {
          startSessionCheck();
        }
      })
      .catch(error => {
        console.error('Auth check error:', error);
      });
  });

  // Also add this to your handleLogin function after successful login
  // In the handleLogin function, after successful login, add:
  // startSessionCheck();
  // Live password requirement checker for the REGISTER form
window.validatePasswordStrength = function () {
  const pass = document.getElementById('registerPassword')?.value || '';
  const reqBox = document.getElementById('registerPasswordRequirements');
  if (!reqBox) return;
  reqBox.classList.remove('hidden');

  const setColor = (id, ok) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = ok ? '#16a34a' : '#dc2626'; // green when ok, red when not
  };

  setColor('regLengthReq', pass.length >= 8);
  setColor('regLowerReq', /[a-z]/.test(pass));
  setColor('regUpperReq', /[A-Z]/.test(pass));
  setColor('regNumberReq', /\d/.test(pass));
  setColor('regSpecialReq', /[@$!%*?&]/.test(pass));
};

// Live confirm-password match check for the REGISTER form
window.validatePasswordMatch = function () {
  const pass = document.getElementById('registerPassword')?.value || '';
  const conf = document.getElementById('registerConfirmPassword')?.value || '';
  const form = document.getElementById('registerForm');
  if (!form) return;

  if (conf.length === 0) {
    // hide any message if confirm empty
    const box = form.querySelector('.msgBox') || document.getElementById('registerMsgBox');
    if (box) box.classList.add('hidden');
    return;
  }

  if (pass !== conf) {
    displayMessage(form, 'Passwords do not match.', 'error');
  } else {
    // clear the form-level message (if it was the mismatch)
    const box = form.querySelector('.msgBox') || document.getElementById('registerMsgBox');
    if (box) box.classList.add('hidden');
  }
};



})();
