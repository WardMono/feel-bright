/* ===== nav/ initials helper ===== */

(function initNavOnlyAvatars() {
    // nav avatar selectors (include common id variants)
    const navImgs = [
        { id: 'desktop-avatar' },
        { id: 'menuAvatarLarge' }, // dropdown
        { id: 'mobile-avatar' },
        { id: 'mMenuAvatarLarge' } // mobile dropdown large
    ];

    // helper: return DOM element if exists
    function byId(id) { return document.getElementById(id); }

    // ensure initials fallback exists and is tagged for nav usage
    function ensureNavInitialsFor(imgEl) {
        if (!imgEl) return null;
        const slot = imgEl.id || imgEl.dataset.avatarSlot || ('anon-' + Math.random().toString(36).slice(2, 8));
        // check for existing sibling fallback with data-initials-for
        const parent = imgEl.parentElement || document.body;
        let fallback = parent.querySelector(`:scope > .initials-fallback[data-initials-for="${slot}"]`);
        if (!fallback) {
            // try any fallback under parent and adopt it for this slot (common when server-rendered)
            const any = parent.querySelector(':scope > .initials-fallback');
            if (any) {
                any.setAttribute('data-initials-for', slot);
                fallback = any;
            }
        }
        if (!fallback) {
            // create one and insert after image
            fallback = document.createElement('div');
            fallback.className = 'initials-fallback nav';
            fallback.setAttribute('data-initials-for', slot);
            fallback.setAttribute('data-nav-initials', 'true');
            fallback.setAttribute('aria-hidden', 'true');
            // minimal inline sizing; CSS above will handle primary sizing
            fallback.style.display = 'inline-flex';
            imgEl.insertAdjacentElement('afterend', fallback);
        } else {
            // mark as nav fallback so CSS rules apply
            fallback.classList.add('nav');
            fallback.setAttribute('aria-hidden', 'true');
        }
        return fallback;
    }

    // compute initials from sidebar/name fields if available
    function getNavInitials() {
        const nameEl = document.getElementById('sidebar-name') || document.getElementById('menuName') || document.getElementById('desktop-username');
        const txt = (nameEl && (nameEl.textContent || nameEl.value) || '').trim();
        if (!txt) return '?';
        const parts = txt.split(/\s+/).filter(Boolean);
        const initials = ((parts[0] || '')[0] || '') + ((parts.length > 1 ? parts[parts.length - 1] : parts[0])?.[0] || '');
        return (initials || '?').toUpperCase();
    }

    // show image (url may be blob: or http) for a particular img element
    function showImageFor(imgEl, url) {
        if (!imgEl) return;
        try {
            imgEl.src = url || '';
        } catch (e) { /* noop */ }
        if (url && url.trim()) {
            // show image, hide initials
            imgEl.classList.remove('hidden');
            imgEl.style.display = 'inline-block';
            const fb = ensureNavInitialsFor(imgEl);
            if (fb) fb.classList.add('hidden');
        } else {
            // hide image, show initials
            imgEl.removeAttribute('src');
            imgEl.classList.add('hidden');
            imgEl.style.display = 'none';
            const fb = ensureNavInitialsFor(imgEl);
            if (fb) {
                fb.textContent = getNavInitials();
                fb.classList.remove('hidden');
            }
        }
    }

    // top-level function: url can be blob: preview or final avatar url or null
    function updateNavAvatars(url) {
        navImgs.forEach(({ id }) => {
            const el = byId(id);
            if (!el) return;
            // if url is a blob preview and the image element accepts blob, show it
            if (url && String(url).trim()) {
                // only show preview in nav if it's actually new preview (blob:) OR if it's a non-placeholder URL
                el.removeAttribute('aria-hidden');
                showImageFor(el, url);
            } else {
                // no preview -> if there's a global currentAvatarURL (server-supplied), use that
                if (typeof currentAvatarURL !== 'undefined' && currentAvatarURL) {
                    showImageFor(el, currentAvatarURL);
                } else {
                    showImageFor(el, null);
                }
            }
        });
    }

    // listen for preview events coming from your photo UI (blob previews)
    window.addEventListener('avatar:preview', (ev) => {
        const url = ev?.detail?.url || null;
        updateNavAvatars(url);
    });

    // expose sync function for when fetchUser loads currentAvatarURL
    window.syncNavAvatars = function () {
        try { updateNavAvatars(currentAvatarURL || null); } catch (e) { /* noop */ }
    };

    // initial run (best-effort)
    try { updateNavAvatars(typeof currentAvatarURL !== 'undefined' ? currentAvatarURL : null); } catch (e) { /* noop */ }

    // debugging handle
    window._navAvatar = { updateNavAvatars, syncNavAvatars };
})();
