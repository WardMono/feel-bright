// Alpine store (safe if Alpine isn't present)
document.addEventListener('alpine:init', () => {
    if (window.Alpine) Alpine.store('user', { loggedIn: false, name: 'Guest', avatar: '/img/default-avatar.png' });
});

document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);

    // DESKTOP containers (control via xl: classes)
    const authDesktop = $('auth-buttons-desktop');
    const userDesktop = $('user-profile-desktop');

    // MOBILE containers (toggle with "hidden")
    const authMobile = $('auth-buttons-mobile');
    const userMobile = $('user-profile-mobile');

    const nameDesktop = $('desktop-username');
    const nameMobile = $('mobile-username');

    const avatarDesktop = $('desktop-avatar');
    const avatarMobile = $('mobile-avatar');
    const menuAvatarLarge = $('menuAvatarLarge'); // desktop dropdown preview
    const menuName = $('menuName');
    const menuEmail = $('menuEmail');

    const defaultAvatar = '/img/default-avatar.png';

    // Always Guest
    const fullName = 'Guest';
    const picUrl = defaultAvatar;

    // Force UI to show "user" container as guest
    if (userDesktop) {
        userDesktop.classList.remove('xl:hidden');
        userDesktop.classList.add('xl:flex');
    }
    if (userMobile) userMobile.classList.remove('hidden');
    if (authDesktop) authDesktop.classList.add('xl:hidden');
    if (authMobile) authMobile.classList.add('hidden');

    // Text + avatars
    if (nameDesktop) nameDesktop.textContent = fullName;
    if (nameMobile) nameMobile.textContent = fullName;

    [avatarDesktop, avatarMobile, menuAvatarLarge].forEach(el => { if (el) el.src = picUrl; });
    if (menuName) menuName.textContent = fullName;
    if (menuEmail) menuEmail.textContent = 'Guest Account';

    // ----- MOBILE dropdown preview -----
    const mMenuAvatarLarge = $('mMenuAvatarLarge');
    const mMenuName = $('mMenuName');
    const mMenuEmail = $('mMenuEmail');

    if (mMenuAvatarLarge) mMenuAvatarLarge.src = picUrl;
    if (mMenuName) mMenuName.textContent = fullName;
    if (mMenuEmail) mMenuEmail.textContent = 'Guest Account';
    // -----------------------------------

    // Hover open/close with delay + wide hover bridge (desktop)
    (function setupProfileMenu() {
        const trigger = document.getElementById('profile-trigger');
        const menu = document.getElementById('profile-menu');
        const bridge = document.getElementById('profile-bridge'); // optional

        if (!trigger || !menu) return;

        let closeTimer = null;
        const DELAY = 350;

        const openMenu = () => {
            clearTimeout(closeTimer);
            menu.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
            menu.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
            menu.setAttribute('aria-hidden', 'false');
            trigger.setAttribute('aria-expanded', 'true');
        };

        const scheduleClose = () => {
            clearTimeout(closeTimer);
            closeTimer = setTimeout(() => {
                menu.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
                menu.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
                menu.setAttribute('aria-hidden', 'true');
                trigger.setAttribute('aria-expanded', 'false');
            }, DELAY);
        };

        ['pointerenter', 'focusin'].forEach(evt => {
            trigger.addEventListener(evt, openMenu);
            menu.addEventListener(evt, openMenu);
            bridge?.addEventListener(evt, openMenu);
        });
        ['pointerleave', 'focusout'].forEach(evt => {
            trigger.addEventListener(evt, scheduleClose);
            menu.addEventListener(evt, scheduleClose);
            bridge?.addEventListener(evt, scheduleClose);
        });

        trigger.addEventListener('click', e => {
            e.preventDefault();
            const hidden = menu.getAttribute('aria-hidden') !== 'false';
            hidden ? openMenu() : scheduleClose();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') scheduleClose(); });

        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-hidden', 'true');
    })();
});
