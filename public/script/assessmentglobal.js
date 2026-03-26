(() => {
    const overlayEl = document.getElementById('resultsLoadingOverlay');
    const overlayTextEl = document.getElementById('resultsLoadingText');

    function showGlobalLoading(text = 'Loading…') {
        if (!overlayEl) return;
        overlayTextEl && (overlayTextEl.textContent = text);
        overlayEl.classList.remove('hidden');
        overlayEl.classList.add('flex');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }

    function hideGlobalLoading() {
        if (!overlayEl) return;
        overlayEl.classList.remove('flex');
        overlayEl.classList.add('hidden');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    /* ---------------- start-assessment button ---------------- */
    const startBtn = document.getElementById('startAssessmentBtn');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            showGlobalLoading('Checking your session…');
            try {
                const res = await fetch('/auth/user', { credentials: 'include' });
                const data = await res.json();

                if (data?.loggedIn) {
                    showGlobalLoading('Loading please be patient.');
                    setTimeout(() => { window.location.href = 'usertest.html'; }, 250);
                } else {
                    showGlobalLoading('You are not logged in — continuing as guest…');
                    setTimeout(() => { window.location.href = 'assessmentgate.html'; }, 250);
                }
            } catch (err) {
                console.error('Failed to check login status:', err);
                showGlobalLoading('Network issues detected');
                setTimeout(() => { window.location.href = 'assessmentgate.html'; }, 250);
            }
        });
    }

    /* ---------------- intercept anchor clicks ---------------- */
    document.addEventListener('click', (ev) => {
        // left-click only
        if (ev.button && ev.button !== 0) return;
        if (ev.defaultPrevented) return;

        const a = ev.target.closest('a');
        if (!a) return;

        const href = a.getAttribute('href');
        if (!href) return;

        // skip protocols / anchors / special links
        const skipProtocols = ['#', 'javascript:', 'mailto:', 'tel:'];
        for (const prot of skipProtocols) {
            if (href.startsWith(prot)) return;
        }
        if (a.target === '_blank' || a.hasAttribute('download')) return;
        if (a.classList.contains('no-loading') || a.dataset.noLoading === 'true') return;

        // allow ctrl/cmd/shift click to open in new tab/window
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return;

        // intercept navigation
        ev.preventDefault();
        showGlobalLoading('Loading please be patient.');
        const destHref = a.href;
        setTimeout(() => { window.location.href = destHref; }, 250);
    }, { capture: true });

    /* ---------------- forms ---------------- */
    document.addEventListener('submit', (ev) => {
        const form = ev.target;
        if (!form || !(form instanceof HTMLFormElement)) return;
        if (form.classList.contains('no-loading') || form.dataset.noLoading === 'true') return;
        showGlobalLoading('Submitting…');
        // allow normal submission to proceed
    });

    /* ---------------- beforeunload / pagehide = "Reloading page." ---------------- */
    window.addEventListener('beforeunload', () => {
        try { showGlobalLoading('Reloading page.'); } catch (e) { }
    });
    window.addEventListener('pagehide', () => {
        try { showGlobalLoading('Reloading page.'); } catch (e) { }
    });

    /* ---------------- pageshow (back/forward restore) ---------------- */
    window.addEventListener('pageshow', (ev) => {
        if (!overlayEl) return;

        let navType = '';
        try {
            const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
            if (navEntries && navEntries.length) navType = navEntries[0].type || '';
            if (!navType && performance.navigation && performance.navigation.type === 2) navType = 'back_forward';
        } catch (e) { }

        if (ev.persisted || navType === 'back_forward') {
            overlayTextEl && (overlayTextEl.textContent = 'Reloading page.');
            overlayEl.classList.remove('hidden');
            overlayEl.classList.add('flex');
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

            if (document.readyState === 'complete') {
                setTimeout(() => { hideGlobalLoading(); }, 300);
            } else {
                window.addEventListener('load', () => { setTimeout(() => { hideGlobalLoading(); }, 250); }, { once: true });
            }
        }
    });

    /* ---------------- popstate (history API) ---------------- */
    window.addEventListener('popstate', () => {
        try {
            showGlobalLoading('Loading…');
            setTimeout(() => { hideGlobalLoading(); }, 400);
        } catch (e) { }
    });

})();