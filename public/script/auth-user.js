/* ---------- Full header script with per-ID initials sizes (menuAvatarLarge = h-20) ---------- */
(function () {
  const $ = id => document.getElementById(id);

  // ---------- Helpers ----------
  function makeInitialsElement(name, px) {
    const initials = (name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(s => s[0]?.toUpperCase() || '')
      .slice(0, 2)
      .join('') || '?';

    const fontSize = Math.max(12, Math.round(px / 2.8));

    const el = document.createElement('div');
    el.className = 'initials-fallback';
    el.setAttribute('aria-hidden', 'true');

    el.style.width = px + 'px';
    el.style.height = px + 'px';
    el.style.minWidth = px + 'px';
    el.style.minHeight = px + 'px';
    el.style.display = 'inline-flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.borderRadius = '9999px';
    el.style.boxSizing = 'border-box';
    el.style.backgroundColor = '#DCFCE7'; // bg-green-200
    el.style.color = '#14532D';           // text-green-800
    el.style.fontWeight = '700';
    el.style.fontSize = fontSize + 'px';
    el.style.userSelect = 'none';
    el.style.lineHeight = '1';
    el.textContent = initials;

    return el;
  }

  function applySizingToImg(imgEl, px) {
    if (!imgEl) return;
    try {
      imgEl.style.width = px + 'px';
      imgEl.style.height = px + 'px';
      imgEl.style.minWidth = px + 'px';
      imgEl.style.minHeight = px + 'px';
      imgEl.style.objectFit = 'cover';
      imgEl.style.borderRadius = '9999px';
      imgEl.style.display = 'inline-block';
    } catch (e) { /* noop */ }
  }

  // per-ID size map (px). Adjust any ID here.
  const SIZE_MAP_PX = {
    'sidebar-avatar': 80,
    'desktop-avatar': 40,
    'menuAvatarLarge': 80,
    'mMenuAvatarLarge': 40,
    'mobile-avatar': 40,
    'prAvatar': 40
  };

  // Insert initials after the img, hide the img
  function showInitialsForImg(imgEl, fullName, pxSize) {
    if (!imgEl) return;
    imgEl.classList.add('hidden');
    applySizingToImg(imgEl, pxSize);

    const parent = imgEl.parentElement || document.body;
    const existing = parent.querySelector(':scope > .initials-fallback');
    if (existing) {
      existing.textContent = makeInitialsElement(fullName, pxSize).textContent;
      return;
    }

    const initialsEl = makeInitialsElement(fullName || 'Participant', pxSize || 40);
    imgEl.insertAdjacentElement('afterend', initialsEl);
  }

  // Show image, remove initials fallback if exists
  function showImageForImg(imgEl, url, pxSize) {
    if (!imgEl) return;
    const parent = imgEl.parentElement || document.body;
    const existing = parent.querySelector(':scope > .initials-fallback');
    if (existing) existing.remove();

    applySizingToImg(imgEl, pxSize);

    imgEl.src = (url && typeof url === 'string' && url.trim().length > 0)
      ? (url.indexOf('?') === -1 ? `${url}?v=${Date.now()}` : url)
      : '';
    imgEl.classList.remove('hidden');
  }

  // Safe render function that uses SIZE_MAP_PX
  function renderAvatarById(imgId, fullName, avatarUrl) {
    const imgEl = $(imgId);
    if (!imgEl) return;
    const px = SIZE_MAP_PX[imgId] || 40;
    const hasAvatar = !!(avatarUrl && String(avatarUrl).trim().length > 0);
    if (hasAvatar) {
      showImageForImg(imgEl, avatarUrl, px);
    } else {
      showInitialsForImg(imgEl, fullName, px);
    }
  }

  const AVATAR_IDS = Object.keys(SIZE_MAP_PX);

  // ---------- Alpine store default ----------
  document.addEventListener('alpine:init', () => {
    if (window.Alpine) Alpine.store('user', { loggedIn: false, name: '', avatar: '' });
  });

  // ---------- Main DOMContentLoaded flow ----------
  document.addEventListener('DOMContentLoaded', () => {
    fetch('/auth/user', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const logged = !!data?.loggedIn;

        // containers
        const authDesktop = $('auth-buttons-desktop');
        const userDesktop = $('user-profile-desktop');
        const authMobile = $('auth-buttons-mobile');
        const userMobile = $('user-profile-mobile');
        const nameDesktop = $('desktop-username');
        const nameMobile = $('mobile-username');

        const menuName = $('menuName');
        const menuEmail = $('menuEmail');
        const mMenuName = $('mMenuName');
        const mMenuEmail = $('mMenuEmail');

        const showDesktopXL = (el, yes) => { if (!el) return; el.classList.toggle('xl:hidden', !yes); el.classList.toggle('xl:flex', yes); };
        const showMobile = (el, yes) => { if (!el) return; el.classList.toggle('hidden', !yes); };

        showDesktopXL(userDesktop, logged);
        showDesktopXL(authDesktop, !logged);
        showMobile(userMobile, logged);
        showMobile(authMobile, !logged);

        const firstName = logged ? (data.first_name || data.name || 'User') : '';
        const fullName = logged ? (`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || firstName) : 'Guest';
        const hasProfilePicture = !!(data && data.profile_picture && String(data.profile_picture).trim().length > 0);
        const picUrl = hasProfilePicture ? data.profile_picture : null;

        if (nameDesktop) nameDesktop.textContent = logged ? `Hi, ${firstName}` : '';
        if (nameMobile) nameMobile.textContent = logged ? `Hi, ${firstName}` : '';
        if (menuName) menuName.textContent = fullName || 'Participant';
        if (menuEmail) menuEmail.textContent = logged ? (data.email || '') : '';
        if (mMenuName) mMenuName.textContent = fullName || 'Participant';
        if (mMenuEmail) mMenuEmail.textContent = logged ? (data.email || '') : '';

        // Render avatars with per-ID sizes (no default images; initials used when no saved avatar)
        AVATAR_IDS.forEach(id => renderAvatarById(id, fullName, picUrl));

        try { window.__lastUserData = data || null; } catch (e) { }

        try {
          if (logged) {
            const storeName = fullName || (data.first_name ?? '') || (data.name ?? '') || '';
            if (storeName) localStorage.setItem('fb_name', storeName);
            if (data.email) localStorage.setItem('fb_email', data.email);
            if (data.profile_picture) localStorage.setItem('fb_avatar', data.profile_picture);
          } else {
            localStorage.removeItem('fb_name'); localStorage.removeItem('fb_email'); localStorage.removeItem('fb_avatar');
          }
        } catch (e) { /* ignore storage exceptions */ }
      })
      .catch(err => {
        console.error('❌ Failed to fetch user session:', err);
        try { window.__lastUserData = window.__lastUserData || null; } catch (e) { }
      });

    // Preserve your existing desktop hover/toggle menu behavior
    (function setupProfileMenu() {
      const trigger = document.getElementById('profile-trigger');
      const menu = document.getElementById('profile-menu');
      const bridge = document.getElementById('profile-bridge');

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
  }); // end DOMContentLoaded

  // ---------- Utilities & helpers (exposed) ----------
  function updateHeaderUI(data) {
    // no default avatar image: initial-only behavior
    const nameDesktop = $('desktop-username');
    const nameMobile = $('mobile-username');

    const showDesktopXL = (el, yes) => { if (!el) return; el.classList.toggle('xl:hidden', !yes); el.classList.toggle('xl:flex', yes); };
    const showMobile = (el, yes) => { if (!el) return; el.classList.toggle('hidden', !yes); };

    showDesktopXL($('user-profile-desktop'), !!data?.loggedIn);
    showDesktopXL($('auth-buttons-desktop'), !data?.loggedIn);
    showMobile($('user-profile-mobile'), !!data?.loggedIn);
    showMobile($('auth-buttons-mobile'), !data?.loggedIn);

    if (data?.loggedIn) {
      const hello = data?.first_name || data?.name || 'User';
      if (nameDesktop) nameDesktop.textContent = `Hi, ${hello}`;
      if (nameMobile) nameMobile.textContent = `Hi, ${hello}`;

      const fullName = data.name || `${(data.first_name || '').trim()} ${(data.last_name || '').trim()}`.trim() || '';
      const hasPic = !!(data.profile_picture && String(data.profile_picture).trim().length > 0);
      const pic = hasPic ? data.profile_picture : null;
      AVATAR_IDS.forEach(id => renderAvatarById(id, fullName, pic));
    } else {
      if (nameDesktop) nameDesktop.textContent = '';
      if (nameMobile) nameMobile.textContent = '';
      // show initials in every avatar slot when logged out (no default image)
      AVATAR_IDS.forEach(id => {
        renderAvatarById(id, 'Guest', null);
      });
    }
  }

  async function handleLogout() {
    try {
      await fetch('/logout', { credentials: 'include' });
      if (window.Alpine) {
        try { Alpine.store('user').loggedIn = false; Alpine.store('user').name = ''; Alpine.store('user').avatar = ''; } catch (e) { }
      }
      updateHeaderUI({ loggedIn: false });
      try { localStorage.removeItem('fb_name'); localStorage.removeItem('fb_email'); localStorage.removeItem('fb_avatar'); } catch (e) { }
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  function getUserProfileForReport() {
    try {
      const lsName = (localStorage.getItem('fb_name') || '').trim();
      const lsEmail = (localStorage.getItem('fb_email') || '').trim();
      const lsAvatar = (localStorage.getItem('fb_avatar') || '').trim();
      const fetched = window.__lastUserData || null;

      const name =
        lsName ||
        (fetched ? (`${(fetched.first_name || '').trim()} ${(fetched.last_name || '').trim()}`).trim() : '') ||
        (fetched && fetched.name) ||
        'Participant';

      const email =
        lsEmail ||
        (fetched && fetched.email) ||
        'Guest@Email.com';

      // NO default image: return null when absent
      const avatar =
        (lsAvatar ? (lsAvatar.indexOf('?') === -1 ? `${lsAvatar}?v=${Date.now()}` : lsAvatar) :
          (fetched && fetched.profile_picture ? `${fetched.profile_picture}?v=${Date.now()}` : null)) ||
        null;

      return { name, email, avatar };
    } catch (e) {
      return { name: 'Participant', email: 'Guest@Email.com', avatar: null };
    }
  }

  window.getUserProfileForReport = getUserProfileForReport;
  window.handleLogout = handleLogout;
  window.updateHeaderUI = updateHeaderUI;

  function refreshProfileUI(user = {}) {
    const firstName = (user.first_name || user.name || '').split(' ')[0] || '';
    const greeting = firstName ? `Hi, ${firstName}` : '';

    const fullName = user.name || `${(user.first_name || '').trim()} ${(user.last_name || '').trim()}`.trim() || '';
    const email = user.email || '';

    const hasPic = !!(user && user.profile_picture && String(user.profile_picture).trim().length > 0);
    const avatarSrc = hasPic ? user.profile_picture : null;

    // Update text slots
    const menuName = $('menuName'); const menuEmail = $('menuEmail');
    const mMenuName = $('mMenuName'); const mMenuEmail = $('mMenuEmail');
    const desktopUsername = $('desktop-username'); const mobileUsername = $('mobile-username');
    const prName = $('prName'); const prEmail = $('prEmail');

    if (menuName) menuName.textContent = fullName || 'Participant';
    if (menuEmail) menuEmail.textContent = email;
    if (mMenuName) mMenuName.textContent = fullName || 'Participant';
    if (mMenuEmail) mMenuEmail.textContent = email;
    if (desktopUsername) desktopUsername.textContent = greeting;
    if (mobileUsername) mobileUsername.textContent = greeting;
    if (prName) prName.textContent = fullName || (localStorage.getItem('fb_name') || 'Participant');
    if (prEmail) prEmail.textContent = email || (localStorage.getItem('fb_email') || 'Guest@Email.com');

    // Update avatars (no defaults — initials used when avatarSrc is null)
    AVATAR_IDS.forEach(id => renderAvatarById(id, fullName, avatarSrc));

    // Update Alpine store if present
    if (window.Alpine && Alpine.store && Alpine.store('user')) {
      try {
        Alpine.store('user').loggedIn = !!(user && (user.email || localStorage.getItem('fb_email')));
        Alpine.store('user').name = fullName || '';
        Alpine.store('user').avatar = avatarSrc || '';
      } catch (e) { /* ignore */ }
    }
  }

  window.refreshProfileUI = refreshProfileUI;

  function updateUserProfileForReport(profile = {}) {
    try {
      const name = (profile.name || `${(profile.first_name || '').trim()} ${(profile.last_name || '').trim()}`).trim();
      const email = profile.email || localStorage.getItem('fb_email') || '';
      const avatar = profile.profile_picture || localStorage.getItem('fb_avatar') || '';

      if (name) localStorage.setItem('fb_name', name); else localStorage.removeItem('fb_name');
      if (email) localStorage.setItem('fb_email', email); else localStorage.removeItem('fb_email');
      if (avatar) localStorage.setItem('fb_avatar', avatar); else localStorage.removeItem('fb_avatar');

      window.__lastUserData = Object.assign(window.__lastUserData || {}, {
        name: name || window.__lastUserData?.name,
        first_name: profile.first_name || window.__lastUserData?.first_name,
        last_name: profile.last_name || window.__lastUserData?.last_name,
        email: email || window.__lastUserData?.email,
        profile_picture: avatar || window.__lastUserData?.profile_picture
      });

      refreshProfileUI(window.__lastUserData);

      try {
        const ev = new CustomEvent('user:updated', { detail: window.__lastUserData });
        window.dispatchEvent(ev);
      } catch (e) { /* ignore */ }

      try {
        localStorage.setItem('__fb_user_update_marker', JSON.stringify({ at: Date.now() }));
        setTimeout(() => localStorage.removeItem('__fb_user_update_marker'), 500);
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('updateUserProfileForReport error:', err);
    }
  }

  window.updateUserProfileForReport = updateUserProfileForReport;

  // Keep UI in sync when other tabs update localStorage
  window.addEventListener('storage', (e) => {
    try {
      if (e.key === '__fb_user_update_marker' || e.key === 'fb_name' || e.key === 'fb_email' || e.key === 'fb_avatar') {
        const lsName = (localStorage.getItem('fb_name') || '').trim();
        const lsEmail = (localStorage.getItem('fb_email') || '').trim();
        const lsAvatar = (localStorage.getItem('fb_avatar') || '').trim();

        const fetched = window.__lastUserData || {};
        const user = {
          name: lsName || fetched.name || `${(fetched.first_name || '').trim()} ${(fetched.last_name || '').trim()}`.trim(),
          first_name: fetched.first_name || '',
          last_name: fetched.last_name || '',
          email: lsEmail || fetched.email || '',
          profile_picture: lsAvatar || fetched.profile_picture || ''
        };

        window.__lastUserData = Object.assign(window.__lastUserData || {}, user);
        refreshProfileUI(window.__lastUserData);
      }
    } catch (err) { /* noop */ }
  });

  function handleHeaderAvatarPreview(objectUrl) {
    // broadened selector: include common IDs and class names so preview updates everywhere
    const avatarSelector = 'img.avatar-img, img.avatar, #desktop-avatar, #sidebar-avatar, #menuAvatarLarge, #mMenuAvatarLarge, #mobile-avatar, #prAvatar';
    const avatarImgs = document.querySelectorAll(avatarSelector);
    const fallbacks = document.querySelectorAll('.initials-fallback, [data-avatar-initials]');

    if (objectUrl) {
      // preview blob URL -> show everywhere immediately
      avatarImgs.forEach(img => {
        try {
          img.src = objectUrl;
          img.classList.remove('hidden');
          const id = img.id;
          const px = SIZE_MAP_PX[id] || 40;
          applySizingToImg(img, px);
        } catch (e) { /* noop */ }
      });
      fallbacks.forEach(f => f.classList.add('hidden'));
    } else {
      // restore final avatar from last known data or show initials
      const last = window.__lastUserData || {};
      const lsAvatar = (localStorage.getItem('fb_avatar') || '').trim();
      const avatarFromStore = lsAvatar || (last.profile_picture || '') || null;

      if (avatarFromStore) {
        const bumped = avatarFromStore.indexOf('?') === -1 ? `${avatarFromStore}?v=${Date.now()}` : avatarFromStore;
        avatarImgs.forEach(img => {
          try {
            img.src = bumped;
            img.classList.remove('hidden');
            const id = img.id;
            const px = SIZE_MAP_PX[id] || 40;
            applySizingToImg(img, px);
          } catch (e) { /* noop */ }
        });
        fallbacks.forEach(f => f.classList.add('hidden'));
      } else {
        // no saved avatar anywhere -> show initials only (remove image srcs)
        avatarImgs.forEach(img => { try { img.removeAttribute('src'); img.classList.add('hidden'); } catch (e) { } });
        fallbacks.forEach(f => f.classList.remove('hidden'));
      }
    }
  }

  // listen for preview events from viewprofile.js
  window.addEventListener('avatar:preview', (ev) => {
    try {
      const url = ev?.detail?.url ?? null;
      handleHeaderAvatarPreview(url);
    } catch (err) { /* noop */ }
  });

  // ensure header updates after profile save (updateUserProfileForReport already dispatches user:updated)
  window.addEventListener('user:updated', (ev) => {
    try {
      const data = ev?.detail || window.__lastUserData || null;
      if (data) {
        const pic = data.profile_picture || (localStorage.getItem('fb_avatar') || '') || null;
        handleHeaderAvatarPreview(pic ? (pic.indexOf('?') === -1 ? `${pic}?v=${Date.now()}` : pic) : null);
      }
    } catch (e) { /* noop */ }
  });

  // storage fallback for multi-tab updates
  window.addEventListener('storage', (e) => {
    if (!e) return;
    if (e.key === 'fb_avatar' || e.key === '__fb_user_update_marker') {
      const lsAvatar = (localStorage.getItem('fb_avatar') || '').trim();
      handleHeaderAvatarPreview(lsAvatar || null);
    }
  });

})();


