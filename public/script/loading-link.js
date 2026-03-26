// loading-link.js — revised
// Only show the global loading card for real navigation (link -> other page, reload, back/forward).
// Avoid showing it for auth flows (login/register/forgot) or any form/link with data-no-loading / .no-loading.
//
// Usage notes:
// - To explicitly prevent showing the global overlay for a form or link, add `data-no-loading="true"`
//   or the class `no-loading` to the element (or any ancestor for forms).
// - Auth forms (ids used in your login-mods.js) are automatically excluded: #loginForm, #registerForm,
//   any form inside #forgotFormWrapper.
// - Other scripts can call window.showGlobalLoading(...) / window.hideGlobalLoading() to show/hide it.
// mark auth forms to opt-out of the global overlay (run early)
// mark auth forms to opt-out of the global overlay (run early + on DOM ready + observe dynamic inserts)
(function markAuthFormsNoLoading() {
    function markExisting() {
        try {
            const login = document.getElementById('loginForm');
            if (login) login.setAttribute('data-no-loading', 'true');

            const register = document.getElementById('registerForm');
            if (register) register.setAttribute('data-no-loading', 'true');

            const forgotWrapper = document.getElementById('forgotFormWrapper');
            if (forgotWrapper) {
                const form = forgotWrapper.querySelector('form');
                if (form) form.setAttribute('data-no-loading', 'true');
            }

            // also mark any form that looks like an auth form by name/id heuristics
            document.querySelectorAll('form').forEach(f => {
                const id = (f.id || '').toLowerCase();
                const name = (f.getAttribute('name') || '').toLowerCase();
                if (id.includes('login') || id.includes('register') || id.includes('auth') ||
                    name.includes('login') || name.includes('register') || name.includes('auth')) {
                    f.setAttribute('data-no-loading', 'true');
                }
            });
        } catch (e) { /* ignore */ }
    }

    // mark now (best-effort)
    markExisting();

    // mark again on DOMContentLoaded in case forms are later in the document
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', markExisting, { once: true });
    } else {
        // already ready — mark once more defensively
        setTimeout(markExisting, 0);
    }

    // observe for dynamically inserted auth forms (optional, lightweight)
    try {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (!m.addedNodes) continue;
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    // if a whole form block was added
                    if (node.id === 'loginForm' || node.id === 'registerForm' || node.id === 'forgotFormWrapper') {
                        markExisting();
                        return;
                    }
                    // or a form anywhere inside the added subtree
                    const form = node.querySelector && node.querySelector('form');
                    if (form) markExisting();
                }
            }
        });
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
        // stop observing after a short time (to keep it lightweight)
        setTimeout(() => observer.disconnect(), 30_000);
    } catch (e) { /* ignore */ }
})();


(() => {
    const NAV_DELAY = 3000; // ms before navigating (keeps original tempo)
    const OVERLAY_ID = 'resultsLoadingOverlay';
    const TEXT_ID = 'resultsLoadingText';
    const STYLE_ID = 'loading-link-styles';

    // ---- create overlay (if missing) ----
    function ensureOverlay() {
        if (document.getElementById(OVERLAY_ID)) return;

        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
:root { --fb-green: #7FC58B; }
@keyframes spinSlow { from{ transform: rotate(0deg); } to{ transform: rotate(360deg); } }
@keyframes pulseSoft { 0%,100%{ opacity:1; transform:translateY(0) } 50%{ opacity:0.6; transform:translateY(-2px) } }

#${OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: none;
  align-items: center;
  justify-content: center;
  background: transparent;
  pointer-events: none;
}
#${OVERLAY_ID}.flex { display:flex; pointer-events:auto; }
#${OVERLAY_ID} .loader-wrap {
  display:flex; flex-direction:column; align-items:center; gap:0.75rem;
  padding: 12px 16px; border-radius: 10px;
  background: rgba(255,255,255,0.95); box-shadow: 0 8px 28px rgba(0,0,0,0.06);
}
#${OVERLAY_ID} .loader-circle { position: relative; height: 4.5rem; width: 4.5rem; }
#${OVERLAY_ID} .loader-ring {
  position: absolute; inset: 0.35rem; border-radius: 9999px;
  border: 6px solid rgba(127,197,139,0.18); border-top-color: var(--fb-green); box-sizing:border-box;
  animation: spinSlow 1.2s linear infinite;
}
#${OVERLAY_ID} .loader-circle::after {
  content: ""; width: 0.56rem; height: 0.56rem; border-radius: 50%; background: var(--fb-green);
  position: relative; z-index: 2;
}
#${OVERLAY_ID} #${TEXT_ID} {
  font-family: "League-Spartan", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  color: var(--fb-green); font-weight: 600; font-size: 0.95rem; letter-spacing: 0.2px;
  animation: pulseSoft 1.6s ease-in-out infinite; text-align:center; max-width: min(80vw, 520px); padding: 0 1rem;
}
#${OVERLAY_ID}[aria-hidden="true"] { pointer-events: none; }
      `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
      <div class="loader-wrap" role="status" aria-live="polite" aria-atomic="true">
        <div class="loader-circle" aria-hidden="true">
          <div class="loader-ring"></div>
        </div>
        <div id="${TEXT_ID}">Loading…</div>
      </div>
    `;
        document.body.appendChild(overlay);
    }

    ensureOverlay();
    const overlayEl = document.getElementById(OVERLAY_ID);
    const overlayTextEl = document.getElementById(TEXT_ID);

    function showOverlay(text = 'Loading…') {
        if (!overlayEl) return;
        if (overlayTextEl) overlayTextEl.textContent = text;
        overlayEl.classList.add('flex');
        overlayEl.classList.remove('hidden');
        overlayEl.setAttribute('aria-hidden', 'false');
        try { document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'; } catch (e) { }
    }

    function hideOverlay() {
        if (!overlayEl) return;
        overlayEl.classList.remove('flex');
        overlayEl.classList.add('hidden');
        overlayEl.setAttribute('aria-hidden', 'true');
        try { document.documentElement.style.overflow = ''; document.body.style.overflow = ''; } catch (e) { }
    }

    // expose safe helpers (used elsewhere)
    window.showGlobalLoading = showOverlay;
    window.hideGlobalLoading = hideOverlay;

    // ---- utility helpers ----
    function isElementOrAncestorMarkedNoLoading(el) {
        if (!el || !el.closest) return false;
        // explicit opt-out via attribute or class
        return !!el.closest('[data-no-loading="true"], .no-loading');
    }

    function isAuthForm(form) {
        if (!form) return false;
        // Common auth form identifiers from login-mods.js
        if (form.id === 'loginForm' || form.id === 'registerForm') return true;
        if (form.closest && form.closest('#forgotFormWrapper')) return true;
        // also respect explicit role
        if (form.dataset && form.dataset.auth === 'true') return true;
        return false;
    }

    // ---- intercept a specific "startAssessmentBtn" if exists (keeps original behavior) ----
    (function interceptStartAssessment() {
        const btn = document.getElementById('startAssessmentBtn');
        if (!btn) return;
        btn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const attrText = btn.dataset.loadingText;
            showOverlay(attrText || 'Checking your session…');
            try {
                const res = await fetch('/auth/user', { credentials: 'include' });
                const data = await res.json().catch(() => ({}));
                if (data?.loggedIn) {
                    showOverlay('Loading please be patient.');
                    setTimeout(() => { window.location.href = 'usertest.html'; }, NAV_DELAY);
                } else {
                    showOverlay('You are not logged in — continuing as guest…');
                    setTimeout(() => { window.location.href = 'assessmentgate.html'; }, NAV_DELAY);
                }
            } catch (err) {
                console.error('startAssessment check failed', err);
                showOverlay('Network issues detected');
                setTimeout(() => { window.location.href = 'assessmentgate.html'; }, NAV_DELAY);
            }
        });
    })();

    // ---- anchor clicks: only intercept *real* same-origin navigations to other pages ----
    document.addEventListener('click', (ev) => {
        try {
            if (ev.button && ev.button !== 0) return; // not left-click
            if (ev.defaultPrevented) return;

            const a = ev.target.closest('a');
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href) return;

            // explicit opt-outs
            if (isElementOrAncestorMarkedNoLoading(a)) return;

            // common skip cases
            const skipStarts = ['#', 'javascript:', 'mailto:', 'tel:'];
            for (const s of skipStarts) if (href.startsWith(s)) return;

            if (a.target === '_blank' || a.hasAttribute('download')) return;
            if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return;

            // if this link is known to open a modal/login (heuristic: data-open-login/data-toggle, classes)
            if (a.dataset && (a.dataset.openLogin === 'true' || a.dataset.toggle === 'modal' || a.classList.contains('open-login') || a.classList.contains('open-modal'))) {
                return;
            }

            let url;
            try {
                url = new URL(a.href, location.href);
                if (url.origin !== location.origin) return; // external
            } catch (e) { return; }

            ev.preventDefault();

            // normalize to compare ignoring hashes
            const normalize = (u) => {
                try {
                    const p = new URL(u, location.href);
                    p.hash = '';
                    return p.href;
                } catch (e) { return u; }
            };

            const targetNormalized = normalize(url.href);
            const currentNormalized = normalize(location.href);

            const customText = a.dataset.loadingText || 'Loading please be patient.';

            // clicking same page (ignoring hash) -> treat as reload
            if (targetNormalized === currentNormalized) {
                showOverlay(customText);
                setTimeout(() => { location.reload(); }, NAV_DELAY);
            } else {
                // Real navigation to another path in the app -> show overlay
                showOverlay(customText);
                setTimeout(() => { window.location.href = a.href; }, NAV_DELAY);
            }
        } catch (e) { /* ignore errors */ }
    }, { capture: true });

    // ---- form submits: only show overlay when the form will cause a full navigation (not auth/ajax forms) ----
    document.addEventListener('submit', (ev) => {
        try {
            const form = ev.target;
            if (!form || !(form instanceof HTMLFormElement)) return;

            // explicit opt-out or known auth forms -> do NOT show the global overlay
            if (isElementOrAncestorMarkedNoLoading(form) || isAuthForm(form)) {
                return;
            }

            // if form has target _blank -> don't show
            const target = (form.getAttribute('target') || '').toLowerCase();
            if (target === '_blank') return;

            // If it's a plain HTML form with action and a non-ajax method, it's safe to show the global overlay
            // However many forms may be handled by fetch/ajax — rely on dev to mark them with data-no-loading
            const method = (form.getAttribute('method') || 'get').toLowerCase();

            // show overlay only for forms with an action that likely triggers navigation, or method=post (server-side)
            const hasAction = !!(form.getAttribute('action') || '').trim();
            if (method === 'post' || hasAction) {
                const customText = form.dataset.loadingText || 'Submitting…';
                showOverlay(customText);
                // let default submit continue (navigation will happen)
            }
        } catch (e) { /* ignore */ }
    }, { capture: true });

    // ---- beforeunload/pagehide: show overlay for user-triggered reload/close/back ----
    window.addEventListener('beforeunload', () => {
        try { showOverlay('Loading page.'); } catch (e) { /* ignore */ }
    }, { capture: true });
    window.addEventListener('pagehide', () => {
        try { showOverlay('Loading page.'); } catch (e) { /* ignore */ }
    }, { capture: true });

    // ---- pageshow: when coming from bfcache/back-forward we briefly show then hide ----
    window.addEventListener('pageshow', (ev) => {
        let navType = '';
        try {
            const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
            if (navEntries && navEntries.length) navType = navEntries[0].type || '';
            if (!navType && performance.navigation && performance.navigation.type === 2) navType = 'back_forward';
        } catch (e) { }

        if (ev.persisted || navType === 'back_forward') {
            if (overlayTextEl) overlayTextEl.textContent = 'Loading.';
            showOverlay('Loading.');
            if (document.readyState === 'complete') {
                setTimeout(hideOverlay, 300);
            } else {
                window.addEventListener('load', () => setTimeout(hideOverlay, 250), { once: true });
            }
        }
    });

    // ---- popstate: programmatic history navigation (show briefly) ----
    window.addEventListener('popstate', () => {
        try {
            showOverlay('Loading.');
            setTimeout(hideOverlay, 3000);
        } catch (e) { }
    });

    // ---- keyboard reload helper (still kept but won't interfere with auth forms) ----
    document.addEventListener('keydown', (ev) => {
        try {
            if (!ev || !ev.key) return;
            if (ev.key.toLowerCase() !== 'a') return;

            const active = document.activeElement;
            if (!active) return;
            const tag = active.tagName || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
            if (isElementOrAncestorMarkedNoLoading(active)) return;

            if (overlayTextEl) overlayTextEl.textContent = 'Reloading...';
            showOverlay('Reloading...');
            setTimeout(() => { location.reload(); }, NAV_DELAY);
        } catch (e) { /* ignore */ }
    });

})();
