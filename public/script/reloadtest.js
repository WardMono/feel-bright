// Enhanced reload protection + restart/reset + context menu for assessment pages
(() => {
    // Only run on test pages
    const isAssessmentPage = window.location.pathname.includes('test.html') || window.location.pathname.includes('guesstest.html') || window.location.pathname.includes('usertest.html');
    if (!isAssessmentPage) return;

    // Avoid double-init
    if (window.__eiEnhReloadAdded) return;
    window.__eiEnhReloadAdded = true;

    let isResetting = false;

    // Keep reference to the original beforeUnload if any (so we can remove it safely)
    const originalBeforeUnload = window.beforeUnloadHandler || null;

    // Safe hasProgress wrapper
    function safeHasProgress() {
        try {
            if (typeof window.hasProgress === 'function') return !!window.hasProgress();
            // fallback: check localStorage keys used by this app
            const qlen = Array.isArray(window.questions) ? window.questions.length : 50;
            const prefix = typeof window.STORAGE_PREFIX !== 'undefined' ? window.STORAGE_PREFIX : 'ei_assessment_guest';
            for (let i = 0; i < qlen; i++) {
                if (localStorage.getItem(`${prefix}:q:${i}`)) return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    // Safe confirm wrapper that prefers showLeaveConfirm
    function safeConfirm({ title = 'Confirm', text = '', confirmLabel = 'OK' } = {}) {
        return new Promise(resolve => {
            if (typeof window.showLeaveConfirm === 'function') {
                try {
                    // Attempt to call showLeaveConfirm and capture confirm via onConfirm/onCancel
                    window.showLeaveConfirm({
                        title,
                        text,
                        confirmLabel,
                        onConfirm: () => resolve(true),
                        onCancel: () => resolve(false)
                    });
                    return;
                } catch (e) {
                    // fall through to native confirm
                }
            }
            resolve(Boolean(window.confirm((title ? title + '\n\n' : '') + text)));
        });
    }

    // Notification helper (non-blocking)
    function showNotification(message, type = 'success', duration = 3000) {
        try {
            if (typeof window.showNotification === 'function') { window.showNotification(message, type, duration); return; }
        } catch (e) { }
        // create a simple toast
        const id = 'ei-notify';
        let container = document.getElementById(id);
        if (!container) {
            container = document.createElement('div');
            container.id = id;
            container.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:999999;pointer-events:none';
            document.body.appendChild(container);
        }
        const el = document.createElement('div');
        el.style.cssText = 'pointer-events:auto;margin:6px 0;padding:10px 14px;border-radius:10px;box-shadow:0 8px 20px rgba(2,6,23,0.08);font-weight:600;color:#fff';
        el.style.background = (type === 'success') ? '#10B981' : '#EF4444';
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => el.style.opacity = '0', duration - 300);
        setTimeout(() => el.remove(), duration);
    }

    /* ===== Restart modal with Try Again / Go Home / Cancel ===== */
    function presentRestartOptions({ title = 'Restart or Go Home?', text = 'Choose an action' } = {}) {
        return new Promise(resolve => {
            // if another modal exists, don't stack
            const existing = document.getElementById('ei-restart-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'ei-restart-modal';
            modal.style.cssText = `
      position:fixed;inset:0;z-index:1000000;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.35);backdrop-filter:blur(2px);
    `;
            modal.innerHTML = `
      <div style="width:clamp(280px,44vw,520px);background:#fff;border-radius:12px;padding:18px;box-shadow:0 12px 40px rgba(2,6,23,0.12);font-family:system-ui,Segoe UI,Roboto,'Helvetica Neue',Arial;">
        <div style="font-weight:700;font-size:1.05rem;color:#0f172a;margin-bottom:8px">${title}</div>
        <div style="color:#374151;font-size:0.95rem;margin-bottom:16px;line-height:1.3">${text}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="ei-restart-tryagain" style="flex:1;background:#10b981;color:white;border:none;padding:10px 12px;border-radius:10px;font-weight:700;cursor:pointer">Try Again</button>
          <button id="ei-restart-gohome" style="flex:1;background:white;color:#0f172a;border:1px solid #e6e6e6;padding:10px 12px;border-radius:10px;font-weight:700;cursor:pointer">Go Home</button>
          <button id="ei-restart-cancel" style="flex-basis:100%;background:transparent;color:#6b7280;border:none;padding:8px 12px;border-radius:10px;cursor:pointer">Cancel</button>
        </div>
      </div>
    `;

            document.body.appendChild(modal);

            const clean = () => {
                try { modal.remove(); } catch (e) { }
                document.removeEventListener('keydown', onKey);
            };

            // Bind buttons
            modal.querySelector('#ei-restart-tryagain').addEventListener('click', () => {
                clean(); resolve('restart');
            });
            modal.querySelector('#ei-restart-gohome').addEventListener('click', () => {
                clean(); resolve('home');
            });
            modal.querySelector('#ei-restart-cancel').addEventListener('click', () => {
                clean(); resolve('cancel');
            });

            // Escape closes as Cancel
            function onKey(e) {
                if (e.key === 'Escape') { clean(); resolve('cancel'); }
            }
            document.addEventListener('keydown', onKey, { capture: true });
        });
    }


    // Loading overlay helpers
    function showLoading(message = 'Resetting assessment...') {
        try {
            if (typeof window.showGlobalLoading === 'function') { window.showGlobalLoading(message); return; }
        } catch (e) { }
        if (document.getElementById('ei-reset-overlay')) return;
        const ov = document.createElement('div');
        ov.id = 'ei-reset-overlay';
        ov.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.95);z-index:999999';
        ov.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:18px;border-radius:12px;background:#fff;box-shadow:0 10px 40px rgba(2,6,23,0.08);">
        <div style="width:54px;height:54px;border:6px solid #eee;border-top-color:#7FC58B;border-radius:9999px;animation:ei-spin 1s linear infinite"></div>
        <div style="font-weight:700;color:#1f2937">${message}</div>
      </div>
      <style>@keyframes ei-spin{to{transform:rotate(360deg)}}</style>`;
        document.body.appendChild(ov);
    }
    function hideLoading() {
        try { if (typeof window.hideGlobalLoading === 'function') { window.hideGlobalLoading(); return; } } catch (e) { }
        const ov = document.getElementById('ei-reset-overlay'); if (ov) ov.remove();
    }

    /* ===== beforeunload replacement ===== */
    const enhancedBeforeUnloadHandler = (e) => {
        if (isResetting) return;
        if (safeHasProgress && safeHasProgress()) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    };

    // Replace existing handlers safely
    try {
        // remove original if exists
        if (originalBeforeUnload) {
            try { window.removeEventListener('beforeunload', originalBeforeUnload); } catch (err) { }
        }
    } catch (e) { }
    // Make sure any old named handler isn't still attached by assignment on window
    try { window.onbeforeunload = null; } catch (e) { }
    window.beforeUnloadHandler = enhancedBeforeUnloadHandler;
    window.addEventListener('beforeunload', enhancedBeforeUnloadHandler);

    /* ===== Restart / Reset actions ===== */
    function clearAssessmentData() {
        // prefer app's helper
        try {
            if (typeof window.clearCurrentParticipant === 'function') { window.clearCurrentParticipant(); return; }
        } catch (e) { /* fall through */ }

        // fallback: attempt to clear keys under the common prefix
        try {
            const prefix = (typeof window.STORAGE_PREFIX !== 'undefined') ? window.STORAGE_PREFIX : 'ei_assessment_guest';
            const qlen = Array.isArray(window.questions) ? window.questions.length : 50;
            for (let i = 0; i < qlen; i++) {
                try { localStorage.removeItem(`${prefix}:q:${i}`); } catch (e) { }
            }
            try { localStorage.removeItem(`${prefix}:page`); } catch (e) { }
            try { localStorage.removeItem(`${prefix}:records`); } catch (e) { }
        } catch (err) { console.warn('clearAssessmentData fallback failed', err); }
        try { sessionStorage.clear(); } catch (e) { }
    }

    async function performResetAndReload() {
        if (isResetting) return;
        isResetting = true;
        showLoading('Resetting assessment...');
        await new Promise(r => setTimeout(r, 500));
        try {
            clearAssessmentData();
            // remove the unload handler so reload won't trigger dialog
            try { window.removeEventListener('beforeunload', enhancedBeforeUnloadHandler); } catch (e) { }
            window.onbeforeunload = null;
        } catch (err) {
            console.warn('performResetAndReload error', err);
        }
        hideLoading();
        // reload
        try { location.reload(); } catch (e) { window.location.href = window.location.pathname; }
    }

    function performResetKeepPage() {
        try {
            clearAssessmentData();
            // remove beforeunload to allow navigation
            try { window.removeEventListener('beforeunload', enhancedBeforeUnloadHandler); } catch (e) { }
            window.onbeforeunload = null;
            // re-render UI (if available)
            try { if (typeof window.renderQuestions === 'function') window.renderQuestions(0); } catch (e) { }
            try { if (typeof window.updateProgressUI === 'function') window.updateProgressUI(); } catch (e) { }
            showNotification('Assessment reset (stayed on page)', 'success', 2500);
        } catch (err) { console.warn('performResetKeepPage error', err); }
    }

    /* ===== UI bindings: buttons & shortcuts ===== */
    const RESTART_SELECTORS = ['#restartBtn', '[data-action="restart-assessment"]'];
    const RESET_SELECTORS = ['#resetBtn', '[data-action="reset-assessment"]'];

    function bindActionButtons() {
        function bind(selectors, handler, opts = {}) {
            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    if (el.__eiRestartBound) return;
                    el.__eiRestartBound = true;
                    el.addEventListener('click', async (ev) => {
                        ev.preventDefault();
                        const has = safeHasProgress();
                        if (!has) {
                            // no progress: perform direct
                            if (handler === performResetAndReload) performResetAndReload();
                            else performResetKeepPage();
                            return;
                        }
                        const ok = await safeConfirm({
                            title: opts.title || (handler === performResetAndReload ? 'Restart Assessment?' : 'Reset Assessment?'),
                            text: opts.text || (handler === performResetAndReload ? 'This will clear your answers and restart.' : 'This will clear your answers and keep you here.'),
                            confirmLabel: opts.confirmLabel || (handler === performResetAndReload ? 'Restart' : 'Reset')
                        });
                        if (!ok) return;
                        if (handler === performResetAndReload) performResetAndReload();
                        else performResetKeepPage();
                    }, false);
                });
            });
        }

        bind(RESTART_SELECTORS, performResetAndReload, { title: 'Restart Assessment?', confirmLabel: 'Restart' });
        bind(RESET_SELECTORS, performResetKeepPage, { title: 'Reset Assessment?', confirmLabel: 'Reset' });
    }

    // Keyboard (F5 / Ctrl/Cmd+R / Ctrl/Cmd+Shift+R)
    function bindKeyboardShortcuts() {
        if (window.__eiReloadKeysBound) return;
        window.__eiReloadKeysBound = true;
        window.addEventListener('keydown', async (e) => {
            const isF5 = e.key === 'F5';
            const isReload = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r';
            const isHardReload = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r';
            if (!(isF5 || isReload || isHardReload)) return;
            if (!safeHasProgress()) return;
            try { e.preventDefault(); e.stopImmediatePropagation && e.stopImmediatePropagation(); } catch (ex) { }
            const choice = await presentRestartOptions({
                title: 'Reload will reset progress',
                text: 'Reloading will reset your answers. Pick an action below.'
            });
            if (choice === 'restart') {
                performResetAndReload();
            } else if (choice === 'home') {
                clearAssessmentData();
                window.onbeforeunload = null;
                try { window.removeEventListener('beforeunload', enhancedBeforeUnloadHandler); } catch (e) { }
                window.location.href = 'index.html';
            } else {
                // cancel -> do nothing
            }
        }, true);
    }

    // Optional Navigation API hook (some newer browsers)
    function bindNavigationAPI() {
        try {
            if ('navigation' in window && window.navigation && typeof window.navigation.addEventListener === 'function') {
                window.navigation.addEventListener('navigate', (ev) => {
                    try {
                        if (ev.navigationType === 'reload' && safeHasProgress()) {
                            ev.preventDefault();
                            safeConfirm({ title: 'Reload will reset progress', text: 'Reloading will reset your answers. Restart now?', confirmLabel: 'Restart' })
                                .then(ok => { if (ok) performResetAndReload(); });
                        }
                    } catch (e) { }
                });
            }
        } catch (e) { }
    }

    /* ===== Custom context menu (right-click) ===== */
    function createContextMenuIfNeeded() {
        if (document.getElementById('ei-context-menu')) return;

        const menu = document.createElement('div');
        menu.id = 'ei-context-menu';
        menu.style.cssText =
            'position:fixed;z-index:999999;padding:8px;border-radius:8px;background:#fff;border:1px solid rgba(2,6,23,0.06);' +
            'box-shadow:0 8px 30px rgba(2,6,23,0.08);min-width:220px;font-family:system-ui,sans-serif;display:none;';

        menu.innerHTML = `
      <div id="ei-cm-tryagain" style="padding:10px 12px;cursor:pointer;border-radius:6px;font-weight:700">Try Again</div>
      <div id="ei-cm-gohome" style="padding:10px 12px;cursor:pointer;border-radius:6px">Go Home</div>
      <div id="ei-cm-cancel" style="padding:8px 12px;cursor:pointer;border-radius:6px;color:#6b7280;font-size:13px">Cancel</div>
      <div style="padding:8px 12px;color:#9ca3af;font-size:12px;border-top:1px solid rgba(15,23,42,0.03);margin-top:8px">
        Tip: hold <strong>Shift</strong> and right-click to show the browser menu
      </div>
    `;

        document.body.appendChild(menu);

        // Try Again handler
        menu.querySelector('#ei-cm-tryagain').addEventListener('click', async (e) => {
            e.stopPropagation();
            hideContextMenu();

            const has = safeHasProgress();

            if (!has) {
                // No progress — restart immediately
                performResetAndReload();
                return;
            }

            // If there is progress, ask once more (use showLeaveConfirm if available)
            const ok = await safeConfirm({
                title: 'Restart Assessment?',
                text: 'This will clear your answers and restart the assessment.',
                confirmLabel: 'Try Again'
            });
            if (ok) performResetAndReload();
        });

        // Go Home handler
        menu.querySelector('#ei-cm-gohome').addEventListener('click', async (e) => {
            e.stopPropagation();
            hideContextMenu();

            const has = safeHasProgress();

            if (!has) {
                // No progress — go home immediately after clearing any leftovers
                clearAssessmentData();
                window.onbeforeunload = null;
                try { window.removeEventListener('beforeunload', enhancedBeforeUnloadHandler); } catch (err) { }
                window.location.href = 'index.html';
                return;
            }

            const ok = await safeConfirm({
                title: 'Go Home?',
                text: 'Going home will clear your current answers. Continue?',
                confirmLabel: 'Go Home'
            });
            if (ok) {
                clearAssessmentData();
                window.onbeforeunload = null;
                try { window.removeEventListener('beforeunload', enhancedBeforeUnloadHandler); } catch (err) { }
                window.location.href = 'index.html';
            }
        });

        // Cancel handler
        menu.querySelector('#ei-cm-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            hideContextMenu();
        });
    }


    function showContextMenu(x, y) {
        createContextMenuIfNeeded();
        const menu = document.getElementById('ei-context-menu');
        if (!menu) return;
        menu.style.display = 'block';
        // measure after visible
        const rect = menu.getBoundingClientRect();
        let left = x;
        let top = y;
        const pad = 8;
        if (left + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad;
        if (top + rect.height + pad > window.innerHeight) top = window.innerHeight - rect.height - pad;
        if (left < pad) left = pad;
        if (top < pad) top = pad;
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
        // attach dismissal
        setTimeout(() => {
            document.addEventListener('click', hideContextOnClickOnce);
            document.addEventListener('keydown', hideContextOnEsc);
            window.addEventListener('scroll', hideContextOnClickOnce, true);
        }, 10);
    }
    function hideContextMenu() {
        const menu = document.getElementById('ei-context-menu'); if (!menu) return;
        menu.style.display = 'none';
    }
    function hideContextOnClickOnce() { hideContextMenu(); cleanupContextListeners(); }
    function hideContextOnEsc(e) { if (e.key === 'Escape') hideContextOnClickOnce(); }
    function cleanupContextListeners() {
        document.removeEventListener('click', hideContextOnClickOnce);
        document.removeEventListener('keydown', hideContextOnEsc);
        window.removeEventListener('scroll', hideContextOnClickOnce, true);
    }

    function bindContextMenu() {
        if (window.__eiContextMenuBound) return;
        window.__eiContextMenuBound = true;
        document.addEventListener('contextmenu', (e) => {
            // allow native menu if Shift pressed
            if (e.shiftKey) return;
            // don't override interactive elements
            const tag = e.target && e.target.tagName && e.target.tagName.toLowerCase();
            if (['input', 'textarea', 'select', 'option', 'button', 'a'].includes(tag)) return;
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY);
        }, true);
    }

    /* ===== Initialize all bindings on DOM ready ===== */
    function init() {
        bindActionButtons(); // binding is inside function below
        bindKeyboardShortcuts(); // wrapper
        bindNavigationAPI(); // wrapper
        bindContextMenu(); // wrapper
    }

    // small wrappers to call functions defined above (avoid hoisting confusion)
    function bindActionButtons() { try { if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { bindActionButtonsImpl(); }, 10); }); return; } bindActionButtonsImpl(); } catch (e) { } }
    function bindActionButtonsImpl() {
        const RESTART_SELECTORS = ['#restartBtn', '[data-action="restart-assessment"]'];
        const RESET_SELECTORS = ['#resetBtn', '[data-action="reset-assessment"]'];
        function bind(selectors, handler) {
            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    if (el.__eiRestartBound) return;
                    el.__eiRestartBound = true;
                    el.addEventListener('click', async (ev) => {
                        ev.preventDefault();
                        const has = safeHasProgress();
                        if (!has) { if (handler === performResetAndReload) performResetAndReload(); else performResetKeepPage(); return; }
                        const ok = await safeConfirm({
                            title: handler === performResetAndReload ? 'Restart Assessment?' : 'Reset Assessment?',
                            text: handler === performResetAndReload ? 'This will clear your answers and restart the assessment.' : 'This will clear your answers and keep you here.',
                            confirmLabel: handler === performResetAndReload ? 'Restart' : 'Reset'
                        });
                        if (!ok) return;
                        if (handler === performResetAndReload) performResetAndReload(); else performResetKeepPage();
                    }, false);
                });
            });
        }
        bind(RESTART_SELECTORS, performResetAndReload);
        bind(RESET_SELECTORS, performResetKeepPage);
    }

    function bindKeyboardShortcuts() {
        if (window.__eiReloadKeysBound) return;
        window.__eiReloadKeysBound = true;
        window.addEventListener('keydown', async (e) => {
            const isF5 = e.key === 'F5';
            const isReload = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r';
            const isHardReload = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r';
            if (!(isF5 || isReload || isHardReload)) return;
            if (!safeHasProgress()) return;
            try { e.preventDefault(); e.stopImmediatePropagation && e.stopImmediatePropagation(); } catch (ex) { }
            const ok = await safeConfirm({
                title: 'Reload will reset progress',
                text: 'Reloading will reset your answers. Restart the assessment?',
                confirmLabel: 'Restart'
            });
            if (!ok) return;
            performResetAndReload();
        }, true);
    }

    function bindNavigationAPI() {
        try {
            if ('navigation' in window && window.navigation && typeof window.navigation.addEventListener === 'function') {
                window.navigation.addEventListener('navigate', (ev) => {
                    try {
                        if (ev.navigationType === 'reload' && safeHasProgress()) {
                            ev.preventDefault();
                            safeConfirm({ title: 'Reload will reset progress', text: 'Reloading will reset your answers. Restart now?', confirmLabel: 'Restart' })
                                .then(ok => { if (ok) performResetAndReload(); });
                        }
                    } catch (e) { }
                });
            }
        } catch (e) { }
    }

    // DOM ready init (keeps the init name used earlier)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { init(); console.log('Enhanced reload protection loaded (with restart/reset)'); });
    } else {
        setTimeout(() => { init(); console.log('Enhanced reload protection loaded (with restart/reset)'); }, 50);
    }

})(); 
