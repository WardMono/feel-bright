// === User Profile Navigation (targets /user/viewprofile.html) ===
(function (global) {
    'use strict';

    const SETTINGS_URL = '/user/viewprofile.html';

    const $ = (id) => document.getElementById(id);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const toggle = (el, show) => { if (el) el.classList.toggle('hidden', !show); };

    function onSettingsPage() {
        return /\/user\/viewprofile\.html($|\?|\#)/.test(location.pathname);
    }

    function setActiveNav(target) {
        $$('#settings-nav .nav-btn').forEach(btn => {
            const active = btn.dataset.target === target;
            btn.classList.toggle('nav-active', active);
            btn.setAttribute('aria-current', active ? 'page' : 'false');
        });
    }

    function showSection(target) {
        const sections = {
            profile: $('section-profile'),
            photo: $('section-photo'),
            security: $('section-security'),
        };
        Object.values(sections).forEach(sec => sec && sec.classList.add('hidden'));
        sections[target]?.classList.remove('hidden');

        // Optional footers if your page has them
        const mainActions = $('main-actions');
        const footerProfile = $('footer-profile-actions');
        const footerPhoto = $('footer-photo-actions');
        const securityActs = $('security-actions');

        if (target === 'profile') {
            toggle(mainActions, true);
            toggle(footerProfile, true);
            toggle(footerPhoto, false);
            toggle(securityActs, false);
        } else if (target === 'photo') {
            toggle(mainActions, true);
            toggle(footerProfile, false);
            toggle(footerPhoto, true);
            toggle(securityActs, false);
        } else if (target === 'security') {
            toggle(mainActions, false);
            toggle(footerProfile, false);
            toggle(footerPhoto, false);
            toggle(securityActs, true);
        }
    }

    function wireLeftNav() {
        $$('#settings-nav .nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                setActiveNav(target);
                showSection(target);
                history.replaceState(null, '', '#' + target);
            });
        });
    }

    // Close any open profile dropdowns (desktop + mobile)
    function closeProfileMenus() {
        // Desktop dropdown
        const menu = $('profile-menu');
        if (menu) {
            menu.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
            menu.setAttribute('aria-hidden', 'true');
        }
        // Mobile profile accordion (click the open trigger to collapse)
        const mobileOpenToggle = document.querySelector('#user-profile-mobile [aria-expanded="true"]');
        if (mobileOpenToggle) mobileOpenToggle.click();
        // Mobile whole menu (Alpine: try to click hamburger if open)
        const mobileHamburgerOpen = document.querySelector('button[aria-label="Toggle Menu"]');
        // (we don't forcibly toggle 'open' Alpine state here since your @click handlers already set open=false)
    }

    // Call this from the menu items: goToSettingsSection('profile'|'photo'|'security')
    function goToSettingsSection(section) {
        const valid = ['profile', 'photo', 'security'];
        const target = valid.includes(section) ? section : 'profile';

        if (onSettingsPage()) {
            setActiveNav(target);
            showSection(target);
            closeProfileMenus();
            $('settings-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', '#' + target);
        } else {
            // Navigate to the correct page with hash
            window.location.href = `${SETTINGS_URL}#${target}`;
        }
    }

    function initUserProfileNavigation() {
        if (!$('settings-shell')) return; // only run on viewprofile page
        wireLeftNav();

        const hash = (location.hash || '').slice(1);
        const initial = ['profile', 'photo', 'security'].includes(hash) ? hash : 'profile';
        setActiveNav(initial);
        showSection(initial);
    }

    // Expose globals
    global.goToSettingsSection = goToSettingsSection;
    global.setActiveNav = setActiveNav;
    global.showSection = showSection;
    global.initUserProfileNavigation = initUserProfileNavigation;

    // Auto-init on the settings page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserProfileNavigation);
    } else {
        initUserProfileNavigation();
    }

    // Handle back/forward on the settings page
    window.addEventListener('hashchange', () => {
        if (!$('settings-shell')) return;
        const h = (location.hash || '').slice(1);
        if (['profile', 'photo', 'security'].includes(h)) {
            setActiveNav(h);
            showSection(h);
        }
    });

})(window);
