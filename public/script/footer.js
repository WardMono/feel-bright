/* Smooth-scroll nav -> footer (id="site-footer")
   - Auto-closes mobile hamburger & profile dropdown if they appear open.
   - Paste this before </body>.
*/
(function () {
    const navEl = document.querySelector('nav');
    if (!navEl) return;

    function getNavHeight() {
        return navEl.getBoundingClientRect().height || 0;
    }

    function closeMenusAfterScroll() {
        // Close mobile hamburger (if present). Assumes button[aria-label="Toggle Menu"] is the toggle.
        try {
            const mobileMenu = document.querySelector('div[x-show][class*="xl:hidden"]');
            const hamburger = document.querySelector('button[aria-label="Toggle Menu"]');
            if (mobileMenu && hamburger) {
                const isVisible = window.getComputedStyle(mobileMenu).display !== 'none' && mobileMenu.offsetParent !== null;
                if (isVisible) hamburger.click();
            }
        } catch (e) { /* ignore */ }

        // Close profile menu if visible (assumes #profile-menu and #profile-trigger exist)
        try {
            const profileMenu = document.getElementById('profile-menu');
            const profileTrigger = document.getElementById('profile-trigger');
            if (profileMenu && profileTrigger) {
                const pmVis = window.getComputedStyle(profileMenu).opacity !== '0' && profileMenu.offsetParent !== null;
                if (pmVis) profileTrigger.click();
            }
        } catch (e) { /* ignore */ }
    }

    function scrollToFooter() {
        const footer = document.getElementById('site-footer');
        if (!footer) return;
        const top = Math.round(window.scrollY + footer.getBoundingClientRect().top - getNavHeight() - 12);
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        // run close actions after a short delay so the scroll starts first
        setTimeout(closeMenusAfterScroll, 300);
    }

    navEl.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!a || !navEl.contains(a)) return;

        const href = (a.getAttribute('href') || '').trim();
        const text = (a.textContent || '').trim();

        // If link explicitly points to the footer id
        if (href.includes('#site-footer')) {
            e.preventDefault();
            scrollToFooter();
            return;
        }

        // Helpful fallback: if href="#" but link text contains "contact", treat as footer-target
        if ((href === '#' || href === '') && /contact/i.test(text)) {
            e.preventDefault();
            scrollToFooter();
            return;
        }

        // If link is a same-page link like "index.html#site-footer"
        try {
            if (href && href.indexOf('#') > -1) {
                const hash = href.split('#').pop();
                if (hash === 'site-footer') {
                    e.preventDefault();
                    scrollToFooter();
                }
            }
        } catch (err) {
            /* ignore malformed hrefs */
        }
    }, false);

    // Also handle initial load if URL already has #site-footer
    window.addEventListener('load', function () {
        if (location.hash === '#site-footer') {
            // wait a tiny bit for layout & nav to settle
            setTimeout(scrollToFooter, 120);
        }
    });
})();