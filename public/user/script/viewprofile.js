/* viewprofile.full.js
   Photo/profile page logic (full)
*/

const SIZE_MAP_PX = {
    'sidebar-avatar': 80,
    'desktop-avatar': 40,
    'menuAvatarLarge': 80,
    'mMenuAvatarLarge': 40,
    'mobile-avatar': 40,
    'prAvatar': 40
};

const sidebarAvatar = document.getElementById('sidebar-avatar');
const sidebarName = document.getElementById('sidebar-name');
const navBtns = document.querySelectorAll('#settings-nav .nav-btn');

const firstName = document.getElementById('first_name');
const middleName = document.getElementById('middle_name');
const lastName = document.getElementById('last_name');
const email = document.getElementById('email');
const birthday = document.getElementById('birthday');

const profileForm = document.getElementById('profile-form');

const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
const photoIcon = document.getElementById('photo-icon');

const dropzone = document.getElementById('dropzone');
const toast = document.getElementById('message');
const mainActions = document.getElementById('main-actions');
const footerProfile = document.getElementById('footer-profile-actions');
const footerPhoto = document.getElementById('footer-photo-actions');

const fpEdit = document.getElementById('footer-profile-edit');
const fpSave = document.getElementById('footer-profile-save');
const fpCancel = document.getElementById('footer-profile-cancel');

const fphEdit = document.getElementById('footer-photo-edit');
const fphSave = document.getElementById('footer-photo-save');
const fphCancel = document.getElementById('footer-photo-cancel');

const logoutBtn = document.getElementById('logout-btn');
const securityBtn = document.getElementById('account-security-btn');
const securityActions = document.getElementById('security-actions');

const stage = document.getElementById('photo-stage');
const circleOverlay = document.getElementById('circle-overlay');
const circleHole = document.getElementById('circle-hole');
const toggleCircle = document.getElementById('toggle-circle');
const circleSize = document.getElementById('circle-size');
const circleOpacity = document.getElementById('circle-opacity');

let profileMode = 'view';
let photoMode = 'view';
let profileInitial = {};
let selectedPhotoFile = null;
let currentAvatarURL = null;
let lastObjectURL = null;

function showToast(text, type = 'success') {
    if (!toast) return;
    toast.textContent = text;
    toast.style.display = 'block';
    toast.style.borderColor = type === 'error' ? '#fecaca' : '#bbf7d0';
    toast.style.background = type === 'error' ? '#fef2f2' : '#f0fdf4';
    toast.style.color = type === 'error' ? '#991b1b' : '#374151';
    setTimeout(() => { toast.style.display = 'none'; }, 3400);
}
function setDisabledInputs(disabled) {
    [firstName, middleName, lastName, email, birthday].forEach(i => { if (i) i.disabled = disabled; });
}
function updateNamePreview() {
    const name = `${firstName?.value || ''} ${lastName?.value || ''}`.trim();
    if (sidebarName && name) sidebarName.textContent = name;
}
function toggle(el, show) { if (el) el.classList.toggle('hidden', !show); }

function setDropzoneDisabled(disabled) {
    if (!dropzone) return;
    dropzone.classList.toggle('dz-disabled', !!disabled);
    dropzone.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    if (disabled) dropzone.setAttribute('tabindex', '-1');
    else dropzone.setAttribute('tabindex', '0');
}

function updateCirclePreview() {
    if (!circleHole) return;
    const d = parseInt(circleSize?.value || '160', 10);
    circleHole.style.width = d + 'px';
    circleHole.style.height = d + 'px';
    const alpha = Math.max(0, Math.min(0.9, (parseInt(circleOpacity?.value || '45', 10) / 100)));
    circleHole.style.boxShadow = `0 0 0 9999px rgba(0,0,0,${alpha})`;
}
function applyCircleToggle() {
    if (!circleOverlay || !toggleCircle) return;
    circleOverlay.classList.toggle('hidden', !toggleCircle.checked);
}

function setProfileMode(mode) {
    profileMode = mode;
    const isEdit = mode === 'edit';
    setDisabledInputs(!isEdit);
    toggle(fpEdit, !isEdit);
    toggle(fpSave, isEdit);
    toggle(fpCancel, isEdit);
    if (isEdit && firstName) firstName.focus();
}
function setPhotoMode(mode) {
    photoMode = mode;
    const isEdit = mode === 'edit';
    toggle(fphEdit, !isEdit);
    toggle(fphSave, isEdit);
    toggle(fphCancel, isEdit);
    setDropzoneDisabled(!isEdit);
}

function revokeLastObjectURL() {
    if (lastObjectURL) {
        try { URL.revokeObjectURL(lastObjectURL); } catch (e) { /* ignore */ }
        lastObjectURL = null;
    }
}
function bumpUrl(url) {
    if (!url) return url;
    try {
        const u = new URL(url, window.location.origin);
        u.searchParams.set('t', Date.now().toString());
        return u.toString();
    } catch (e) {
        return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    }
}
function applySizingToImg(img) {
    if (!img) return;
    const px = SIZE_MAP_PX[img.id] || 40;
    try {
        img.style.width = px + 'px';
        img.style.height = px + 'px';
        img.style.minWidth = px + 'px';
        img.style.minHeight = px + 'px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '9999px';
        // IMPORTANT: do NOT set img.style.display here.
        // Keep display controlled by classes (.hidden) or removed explicitly elsewhere.
    } catch (e) { /* noop */ }
}


function adjustPreviewToFit() {
    if (!stage || !photoPreview) return;
    if (!photoPreview.naturalWidth || !photoPreview.naturalHeight) return;
    const stageRect = stage.getBoundingClientRect();
    const stageW = Math.max(16, Math.floor(stageRect.width));
    const stageH = Math.max(16, Math.floor(stageRect.height));
    const imgNaturalW = photoPreview.naturalWidth;
    const imgNaturalH = photoPreview.naturalHeight;
    const scale = Math.min(stageW / imgNaturalW, stageH / imgNaturalH, 1);
    const displayW = Math.round(imgNaturalW * scale);
    const displayH = Math.round(imgNaturalH * scale);
    photoPreview.style.width = displayW + 'px';
    photoPreview.style.height = displayH + 'px';
    photoPreview.style.maxWidth = '100%';
    photoPreview.style.maxHeight = '100%';
    photoPreview.style.objectFit = 'contain';
    photoPreview.style.display = 'block';
    photoPreview.style.margin = 'auto';
}
function updatePreviewIconVisibility() {
    if (!photoIcon || !photoPreview) return;
    const src = (photoPreview.getAttribute('src') || '').trim();
    const previewHidden = photoPreview.classList.contains('hidden');
    const isMissing = !src || previewHidden;
    const shouldShow = isMissing && !selectedPhotoFile;
    photoIcon.classList.toggle('hidden', !shouldShow);
}
function installPreviewObservers() {
    if (!photoPreview || !stage) return;
    photoPreview.addEventListener('load', () => {
        setTimeout(() => {
            adjustPreviewToFit();
            updatePreviewIconVisibility();
        }, 30);
    });
    try {
        const ro = new ResizeObserver(() => { adjustPreviewToFit(); });
        ro.observe(stage);
        stage.__previewResizeObserver = ro;
    } catch (e) {
        window.addEventListener('resize', () => { adjustPreviewToFit(); updatePreviewIconVisibility(); });
    }
}

const PLACEHOLDER_PATTERNS = ['default-avatar', '/img/default', 'placeholder'];
function isPlaceholderSrc(url) {
    if (!url || typeof url !== 'string') return true;
    const u = url.trim().toLowerCase();
    if (!u) return true;
    if (u === '/img/default-avatar.png' || u.endsWith('/default-avatar.png')) return true;
    for (const p of PLACEHOLDER_PATTERNS) if (u.indexOf(p) !== -1) return true;
    return false;
}
function isValidAvatarUrl(url) {
    if (!url) return false;
    const s = String(url).trim();
    if (!s) return false;
    if (s.startsWith('blob:')) return true;
    return !isPlaceholderSrc(s);
}

function ensureSlotId(img) {
    if (!img) return null;
    if (img.id && img.id.trim()) return img.id;
    if (!img.dataset.avatarSlot) img.dataset.avatarSlot = 'anon-' + Math.random().toString(36).slice(2, 9);
    return img.dataset.avatarSlot;
}

function findExistingFallbackForSlot(img, slotId) {
    const parent = img.parentElement || document.body;
    const siblings = Array.from(parent.querySelectorAll(':scope > .initials-fallback'));
    if (siblings.length > 1) {
        const keep = siblings[0];
        siblings.slice(1).forEach(e => e.remove());
        if (!keep.hasAttribute('data-initials-for')) keep.setAttribute('data-initials-for', slotId);
        return keep;
    }
    let el = parent.querySelector(':scope > .initials-fallback[data-initials-for="' + slotId + '"]');
    if (el) return el;
    el = parent.querySelector(':scope > .initials-fallback');
    if (el) {
        el.setAttribute('data-initials-for', slotId);
        return el;
    }
    return null;
}

function dedupeInitials() {
    try {
        const parents = new Map();
        document.querySelectorAll('.initials-fallback').forEach(el => {
            const p = el.parentElement || document.body;
            if (!parents.has(p)) parents.set(p, []);
            parents.get(p).push(el);
        });
        parents.forEach((list, p) => {
            if (list.length > 1) {
                const keep = list[0];
                list.slice(1).forEach(e => e.remove());
                if (!keep.hasAttribute('data-initials-for')) {
                    const img = p.querySelector('img');
                    const slotId = (img && (img.id || img.dataset?.avatarSlot)) || ('anon-' + Math.random().toString(36).slice(2, 9));
                    keep.setAttribute('data-initials-for', slotId);
                }
            }
        });
    } catch (e) { console.error('dedupeInitials error', e); }
}

/* updateAllAvatars: show image when there is a true uploaded avatar,
   else show a single initials fallback (no duplicates). */

function updateAllAvatars(imageUrl) {
    const isPreview = imageUrl && String(imageUrl).startsWith('blob:');
    const urlToUse = isPreview ? imageUrl : (imageUrl && !isPlaceholderSrc(imageUrl) ? bumpUrl(imageUrl) : null);

    const selector = 'img.avatar-img, img.avatar, #desktop-avatar, #sidebar-avatar, #menuAvatarLarge, #mMenuAvatarLarge, #mobile-avatar, #prAvatar';
    document.querySelectorAll(selector).forEach(img => {
        try {
            applySizingToImg(img);
            const slotId = ensureSlotId(img);
            const existingFallback = findExistingFallbackForSlot(img, slotId);
            const imgOwnSrc = (img.getAttribute('src') || '').trim();
            const hasImgOwnValid = imgOwnSrc && isValidAvatarUrl(imgOwnSrc);

            if (urlToUse) {
                img.src = urlToUse;
                try { img.style.removeProperty('display'); } catch (e) { /* noop */ }
                img.classList.remove('hidden');
                if (existingFallback) existingFallback.remove();
            } else if (currentAvatarURL && isValidAvatarUrl(currentAvatarURL)) {
                img.src = bumpUrl(currentAvatarURL);
                try { img.style.removeProperty('display'); } catch (e) { /* noop */ }
                img.classList.remove('hidden');
                if (existingFallback) existingFallback.remove();
            } else if (hasImgOwnValid) {
                try {
                    if (!imgOwnSrc.startsWith('blob:') && imgOwnSrc.indexOf('?') === -1) {
                        img.src = bumpUrl(imgOwnSrc);
                    } else {
                        img.src = imgOwnSrc;
                    }
                } catch (e) { /* noop */ }
                try { img.style.removeProperty('display'); } catch (e) { /* noop */ }
                img.classList.remove('hidden');
                if (existingFallback) existingFallback.remove();
            } else {
                img.removeAttribute('src');
                try { img.style.removeProperty('display'); } catch (e) { /* noop */ }
                img.classList.add('hidden');

                if (existingFallback) {
                    const nameStr = `${firstName?.value || ''} ${lastName?.value || ''}`.trim() || (sidebarName?.textContent || 'U');
                    const parts = nameStr.split(/\s+/).filter(Boolean);
                    const initials = ((parts[0] || '')[0] || '') + ((parts.length > 1 ? parts[parts.length - 1] : parts[0])?.[0] || '');
                    existingFallback.textContent = (initials || '?').toUpperCase();
                    existingFallback.classList.remove('hidden');
                    existingFallback.setAttribute('data-initials-for', slotId);
                } else {
                    const px = SIZE_MAP_PX[img.id] || 40;
                    const nameStr = `${firstName?.value || ''} ${lastName?.value || ''}`.trim() || (sidebarName?.textContent || 'U');
                    const parts = nameStr.split(/\s+/).filter(Boolean);
                    const initials = ((parts[0] || '')[0] || '') + ((parts.length > 1 ? parts[parts.length - 1] : parts[0])?.[0] || '');
                    const el = document.createElement('div');
                    el.className = 'initials-fallback';
                    el.setAttribute('data-initials-for', slotId);
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
                    el.style.backgroundColor = '#DCFCE7';
                    el.style.color = '#14532D';
                    el.style.fontWeight = '700';
                    el.style.fontSize = Math.max(12, Math.round(px / 2.8)) + 'px';
                    el.style.userSelect = 'none';
                    el.style.lineHeight = '1';
                    el.textContent = (initials || '?').toUpperCase();
                    img.insertAdjacentElement('afterend', el);
                }
            }
        } catch (e) { /* noop */ }
    });

    const anyShown = !!((imageUrl && isValidAvatarUrl(imageUrl)) || (currentAvatarURL && isValidAvatarUrl(currentAvatarURL)) ||
        document.querySelectorAll('img.avatar-img[src], img.avatar[src], #desktop-avatar[src], #sidebar-avatar[src], #menuAvatarLarge[src], #mMenuAvatarLarge[src], #mobile-avatar[src], #prAvatar[src]').length);
    document.querySelectorAll('.initials-fallback, [data-avatar-initials]').forEach(el => {
        if (anyShown) el.classList.add('hidden'); else el.classList.remove('hidden');
    });

    try { dedupeInitials(); } catch (e) { /* noop */ }
}


firstName?.addEventListener('input', updateNamePreview);
lastName?.addEventListener('input', updateNamePreview);

fpEdit?.addEventListener('click', () => { setProfileMode('edit'); showToast('Editing profile…'); });
fpCancel?.addEventListener('click', () => {
    firstName.value = profileInitial.first_name || '';
    middleName.value = profileInitial.middle_name || '';
    lastName.value = profileInitial.last_name || '';
    email.value = profileInitial.email || '';
    birthday.value = profileInitial.birthday || '';
    updateNamePreview();
    setProfileMode('view');
    showToast('Changes discarded.');
});
fpSave?.addEventListener('click', async () => {
    if (!firstName.value.trim() || !lastName.value.trim()) { showToast('First and Last name are required.', 'error'); return; }
    if (!email.validity.valid) { showToast('Please enter a valid email.', 'error'); return; }
    const payload = {
        first_name: firstName.value.trim(),
        middle_name: middleName.value.trim(),
        last_name: lastName.value.trim(),
        email: email.value.trim(),
        birthday: birthday.value.trim() === '' ? null : birthday.value
    };
    try {
        const res = await fetch('/account/update-profile', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            profileInitial = { ...payload };
            if (sidebarName) sidebarName.textContent = `${payload.first_name} ${payload.last_name}`.trim();
            updateNamePreview();
            setProfileMode('view');
            showToast('Profile updated successfully!');
        } else {
            showToast(result.message || 'Failed to update profile', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error saving profile', 'error');
    }
});
profileForm?.addEventListener('submit', (e) => e.preventDefault());
setDisabledInputs(true);

function handleFiles(file) {
    if (!file) return;
    selectedPhotoFile = file;
    revokeLastObjectURL();
    lastObjectURL = URL.createObjectURL(file);
    try { window.dispatchEvent(new CustomEvent('avatar:preview', { detail: { url: lastObjectURL } })); } catch (e) { /* noop */ }
    updateAllAvatars(lastObjectURL);
    document.querySelectorAll('.initials-fallback, [data-avatar-initials]').forEach(el => el.classList.add('hidden'));
    if (photoPreview) {
        photoPreview.src = lastObjectURL;
        photoPreview.classList.remove('hidden');
    }
    updatePreviewIconVisibility();
    applyCircleToggle();
    updateCirclePreview();
}

dropzone?.addEventListener('click', () => {
    if (photoMode === 'edit' && !dropzone.classList.contains('dz-disabled')) photoInput.click();
});
dropzone?.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && photoMode === 'edit' && !dropzone.classList.contains('dz-disabled')) {
        e.preventDefault();
        photoInput.click();
    }
});
photoInput?.addEventListener('change', (e) => handleFiles(e.target.files[0]));

['dragenter', 'dragover'].forEach(ev => dropzone?.addEventListener(ev, e => {
    if (photoMode !== 'edit' || dropzone.classList.contains('dz-disabled')) return;
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('dz-active');
}));
['dragleave', 'drop'].forEach(ev => dropzone?.addEventListener(ev, e => {
    if (photoMode !== 'edit' || dropzone.classList.contains('dz-disabled')) return;
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('dz-active');
}));
dropzone?.addEventListener('drop', e => {
    if (photoMode !== 'edit' || dropzone.classList.contains('dz-disabled')) return;
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFiles(file);
});

fphEdit?.addEventListener('click', () => { setPhotoMode('edit'); showToast('Editing photo…'); });

fphCancel?.addEventListener('click', () => {
    revokeLastObjectURL();
    if (photoPreview) {
        if (currentAvatarURL) {
            photoPreview.src = currentAvatarURL;
            photoPreview.classList.remove('hidden');
            photoIcon?.classList.add('hidden');
        } else {
            photoPreview.removeAttribute('src');
            photoPreview.classList.add('hidden');
            photoIcon?.classList.remove('hidden');
        }
    }
    try { window.dispatchEvent(new CustomEvent('avatar:preview', { detail: { url: null } })); } catch (e) { /* noop */ }
    updateAllAvatars(currentAvatarURL);
    selectedPhotoFile = null;
    setPhotoMode('view');
    applyCircleToggle?.();
    updateCirclePreview?.();
    updatePreviewIconVisibility?.();
    showToast('Photo changes discarded.');
});

fphSave?.addEventListener('click', async () => {
    if (!selectedPhotoFile) {
        setPhotoMode('view');
        applyCircleToggle();
        updateCirclePreview();
        updatePreviewIconVisibility();
        showToast('No new photo selected. Nothing to save.');
        return;
    }
    const form = new FormData();
    form.append('photo', selectedPhotoFile);
    try {
        const res = await fetch('/account/upload-photo', {
            method: 'POST',
            credentials: 'include',
            body: form
        });
        const result = await res.json();
        if (result.success) {
            const finalURL = result.url || photoPreview.src;
            currentAvatarURL = finalURL;
            updateAllAvatars(currentAvatarURL);
            if (sidebarAvatar) {
                sidebarAvatar.src = bumpUrl(currentAvatarURL);
                sidebarAvatar.classList.remove('hidden');
                applySizingToImg(sidebarAvatar);
            }
            if (photoPreview) {
                photoPreview.src = bumpUrl(currentAvatarURL);
                photoPreview.classList.remove('hidden');
            }
            try {
                if (typeof window.updateUserProfileForReport === 'function') {
                    window.updateUserProfileForReport({
                        first_name: firstName?.value || '',
                        last_name: lastName?.value || '',
                        profile_picture: currentAvatarURL
                    });
                } else {
                    try { localStorage.setItem('fb_avatar', currentAvatarURL || ''); } catch (e) { }
                    try {
                        const ev = new CustomEvent('user:updated', {
                            detail: {
                                profile_picture: currentAvatarURL,
                                first_name: firstName?.value || '',
                                last_name: lastName?.value || ''
                            }
                        });
                        window.dispatchEvent(ev);
                    } catch (e) { /* noop */ }
                }
            } catch (e) { /* noop */ }
            try { window.dispatchEvent(new CustomEvent('avatar:preview', { detail: { url: null } })); } catch (e) { /* noop */ }
            revokeLastObjectURL();
            selectedPhotoFile = null;
            setPhotoMode('view');
            applyCircleToggle();
            updateCirclePreview();
            updatePreviewIconVisibility();
            showToast('Photo updated successfully!');
        } else {
            showToast(result.message || 'Failed to upload photo', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error uploading photo', 'error');
    }
});

navBtns.forEach(btn => btn.addEventListener('click', () => { setActiveNav(btn.dataset.target); showSection(btn.dataset.target); }));
logoutBtn?.addEventListener('click', () => { window.location.href = '/logout'; });

const buttons = document.querySelectorAll('.nav-btn');
buttons.forEach(button => button.addEventListener('click', () => { buttons.forEach(b => b.classList.remove('focus')); button.classList.add('focus'); }));

function showSection(target) {
    const sections = {
        profile: document.getElementById('section-profile'),
        photo: document.getElementById('section-photo'),
        security: document.getElementById('section-security')
    };
    Object.values(sections).forEach(s => s?.classList.add('hidden'));
    sections[target]?.classList.remove('hidden');

    if (target === 'profile') {
        toggle(mainActions, true); toggle(footerProfile, true); toggle(footerPhoto, false); toggle(securityActions, false);
        setProfileMode(profileMode);
    } else if (target === 'photo') {
        toggle(mainActions, true); toggle(footerProfile, false); toggle(footerPhoto, true); toggle(securityActions, false);
        setPhotoMode(photoMode);
        applyCircleToggle(); updateCirclePreview();
        setTimeout(() => { adjustPreviewToFit(); updatePreviewIconVisibility(); }, 30);
    } else if (target === 'security') {
        toggle(mainActions, false); toggle(footerProfile, false); toggle(footerPhoto, false); toggle(securityActions, true);
    }
}
function setActiveNav(target) {
    navBtns.forEach(btn => {
        const active = btn.dataset.target === target;
        btn.classList.toggle('nav-active', active);
        btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
}

const initial = ['profile', 'photo', 'security'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'profile';
setActiveNav(initial);
showSection(initial);

function goToSettingsSection(section) {
    const valid = ['profile', 'photo', 'security'];
    const target = valid.includes(section) ? section : 'profile';
    const shell = document.getElementById('settings-shell');
    if (shell) {
        setActiveNav(target); showSection(target);
        const menu = document.getElementById('profile-menu');
        if (menu) {
            menu.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
            menu.setAttribute('aria-hidden', 'true');
        }
        document.getElementById('settings-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        window.location.href = '/user/accountsettings.html#' + target;
    }
}
window.goToSettingsSection = goToSettingsSection;

(function initHashSection() {
    const hash = (location.hash || '').replace('#', '');
    if (['profile', 'photo', 'security'].includes(hash)) {
        setActiveNav(hash); showSection(hash);
    }
})();

if (toggleCircle) toggleCircle.addEventListener('change', applyCircleToggle);
if (circleSize) circleSize.addEventListener('input', updateCirclePreview);
if (circleOpacity) circleOpacity.addEventListener('input', updateCirclePreview);
applyCircleToggle();
updateCirclePreview();

async function fetchUser() {
    try {
        const res = await fetch('/auth/user', { credentials: 'include' });
        if (!res.ok) { console.error('Fetch /auth/user failed', res.status, res.statusText); showToast('Could not load your profile.', 'error'); return; }

        let data;
        try { data = await res.json(); } catch (jsonErr) { console.error('Invalid JSON from /auth/user:', jsonErr); showToast('Could not load your profile.', 'error'); return; }

        if (!data || !data.loggedIn) { window.location.href = '/login.html'; return; }

        firstName.value = data.first_name || '';
        middleName.value = data.middle_name || '';
        lastName.value = data.last_name || '';
        email.value = data.email || '';
        birthday.value = data.birthday || '';

        profileInitial = {
            first_name: firstName.value,
            middle_name: middleName.value,
            last_name: lastName.value,
            email: email.value,
            birthday: birthday.value
        };

        const initials = ((firstName.value?.[0] || '') + (lastName.value?.[0] || '')).toUpperCase() || '?';
        const avatarRaw = data.profile_picture ? String(data.profile_picture).trim() : '';
        currentAvatarURL = avatarRaw || null;

        try { revokeLastObjectURL(); } catch (e) { /* ignore */ }

        updateAllAvatars(currentAvatarURL);

        try {
            if (typeof window.updateUserProfileForReport === 'function') {
                window.updateUserProfileForReport({
                    first_name: firstName?.value || '',
                    last_name: lastName?.value || '',
                    profile_picture: currentAvatarURL
                });
            } else {
                try { localStorage.setItem('fb_avatar', currentAvatarURL || ''); } catch (e) { }
                try {
                    const ev = new CustomEvent('user:updated', { detail: { profile_picture: currentAvatarURL, first_name: firstName?.value || '', last_name: lastName?.value || '' } });
                    window.dispatchEvent(ev);
                } catch (e) { /* noop */ }
            }
        } catch (e) { /* noop */ }

        try { window.dispatchEvent(new CustomEvent('avatar:preview', { detail: { url: null } })); } catch (e) { /* noop */ }

        const avatarInitials = document.getElementById('sidebar-initials');
        if (avatarInitials) {
            avatarInitials.textContent = initials;
            if (currentAvatarURL) avatarInitials.classList.add('hidden'); else avatarInitials.classList.remove('hidden');
        }
        if (sidebarAvatar) {
            if (currentAvatarURL) {
                sidebarAvatar.src = currentAvatarURL;
                sidebarAvatar.classList.remove('hidden');
                applySizingToImg(sidebarAvatar);
            } else {
                sidebarAvatar.removeAttribute('src');
                sidebarAvatar.classList.add('hidden');
            }
        }
        if (photoPreview) {
            if (currentAvatarURL) {
                photoPreview.src = currentAvatarURL;
                photoPreview.classList.remove('hidden');
            } else {
                photoPreview.removeAttribute('src');
                photoPreview.classList.add('hidden');
            }
        }
        if (sidebarName) sidebarName.textContent = (`${firstName.value || ''} ${lastName.value || ''}`.trim()) || 'Your Account';

        setProfileMode('view');
        setPhotoMode('view');
        updateNamePreview();
        try { applyCircleToggle(); updateCirclePreview(); } catch (e) { /* noop */ }
        try { installPreviewObservers(); } catch (e) { /* noop */ }
        try { setTimeout(updatePreviewIconVisibility, 30); } catch (e) { /* noop */ }

        try { dedupeInitials(); } catch (e) { /* noop */ }

    } catch (err) {
        console.error('fetchUser error:', err);
        showToast('Could not load your profile.', 'error');
    }
}

fetchUser();

/* ---------------------------
   NAV avatar controls hookup (REPLACEMENT)
   Paste/replace the previous initNavAvatarControls IIFE with this
   --------------------------- */
(function initNavAvatarControls() {
    const navAvatarInput = document.getElementById('avatar-input');
    const navEditBtn = document.getElementById('nav-edit-photo');
    const navSaveBtn = document.getElementById('nav-save-photo');
    const navCancelBtn = document.getElementById('nav-cancel-photo');

    // nothing to do if nav controls are absent
    if (!navAvatarInput && !navEditBtn && !navSaveBtn && !navCancelBtn) return;

    // ensure any duplicate initials are removed up-front
    try { dedupeInitials(); } catch (e) { /* noop */ }

    // helper to enable/disable nav buttons based on whether a preview file exists
    function updateNavButtonState() {
        try {
            const hasPreviewFile = !!selectedPhotoFile || !!lastObjectURL;
            if (navSaveBtn) navSaveBtn.disabled = !hasPreviewFile;
            if (navCancelBtn) navCancelBtn.disabled = !hasPreviewFile;
        } catch (e) { /* noop */ }
    }

    // Open file picker
    if (navEditBtn && navAvatarInput) {
        navEditBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            try { setPhotoMode('edit'); } catch (e) { /* noop */ }
            navAvatarInput.click();
        });
    }

    // When a file chosen from nav input — reuse handleFiles so preview + updateAllAvatars is consistent
    if (navAvatarInput) {
        navAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                // reuse your page's handler (this sets selectedPhotoFile + lastObjectURL + updateAllAvatars)
                handleFiles(file);
            } catch (err) {
                console.error('nav -> handleFiles error:', err);
                // fallback minimal preview: create object URL and call updateAllAvatars
                try {
                    revokeLastObjectURL();
                    lastObjectURL = URL.createObjectURL(file);
                    selectedPhotoFile = file;
                    try { window.dispatchEvent(new CustomEvent('avatar:preview', { detail: { url: lastObjectURL } })); } catch (e) { /* noop */ }
                    updateAllAvatars(lastObjectURL);
                } catch (e) { /* noop */ }
            } finally {
                updateNavButtonState();
            }
        });
    }

    // Save from nav: prefer to call your existing footer save handler, else run same upload flow
    if (navSaveBtn) {
        navSaveBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            // If the page already has the fphSave element and its listener, use it
            if (typeof fphSave !== 'undefined' && fphSave) {
                try { fphSave.click(); } catch (e) { /* noop */ }
                return;
            }

            // Fallback: same flow as fphSave — uploads selectedPhotoFile to server
            (async function fallbackNavSave() {
                if (!selectedPhotoFile) { showToast('No new photo selected. Nothing to save.', 'error'); return; }
                const form = new FormData();
                form.append('photo', selectedPhotoFile);
                try {
                    const res = await fetch('/account/upload-photo', { method: 'POST', credentials: 'include', body: form });
                    const result = await res.json();
                    if (result && result.success) {
                        const finalURL = result.url || lastObjectURL || photoPreview?.src || currentAvatarURL;
                        currentAvatarURL = finalURL;
                        updateAllAvatars(currentAvatarURL);
                        // update profile preview pane if present
                        if (photoPreview) {
                            try { photoPreview.src = bumpUrl(currentAvatarURL); photoPreview.classList.remove('hidden'); } catch (e) { /* noop */ }
                        }
                        // cleanup preview state
                        revokeLastObjectURL();
                        selectedPhotoFile = null;
                        try { setPhotoMode('view'); } catch (e) { /* noop */ }
                        updateNavButtonState();
                        updatePreviewIconVisibility?.();
                        showToast('Photo updated successfully!');
                    } else {
                        showToast((result && result.message) || 'Failed to upload photo', 'error');
                    }
                } catch (err) {
                    console.error('nav save error', err);
                    showToast('Error uploading photo', 'error');
                }
            })();
        });
    }

    // Cancel from nav: prefer existing fphCancel, else fallback to discarding preview
    if (navCancelBtn) {
        navCancelBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            if (typeof fphCancel !== 'undefined' && fphCancel) {
                try { fphCancel.click(); } catch (e) { /* noop */ }
                return;
            }
            // fallback discard preview
            try {
                revokeLastObjectURL();
            } catch (e) { /* noop */ }

            if (photoPreview) {
                if (currentAvatarURL) {
                    photoPreview.src = currentAvatarURL;
                    photoPreview.classList.remove('hidden');
                    if (photoIcon) photoIcon.classList.add('hidden');
                } else {
                    photoPreview.removeAttribute('src');
                    photoPreview.classList.add('hidden');
                    if (photoIcon) photoIcon.classList.remove('hidden');
                }
            }
            try { window.dispatchEvent(new CustomEvent('avatar:preview', { detail: { url: null } })); } catch (e) { /* noop */ }
            updateAllAvatars(currentAvatarURL);
            selectedPhotoFile = null;
            try { setPhotoMode('view'); } catch (e) { /* noop */ }
            try { applyCircleToggle?.(); updateCirclePreview?.(); updatePreviewIconVisibility?.(); } catch (e) { /* noop */ }
            updateNavButtonState();
            showToast('Photo changes discarded.');
        });
    }

    // Listen for avatar:preview events from profile UI or other parts of the app
    window.addEventListener('avatar:preview', (ev) => {
        try {
            const url = ev?.detail?.url || null;
            if (url) {
                // show preview in nav avatars
                updateAllAvatars(url);
                // note: if detail came from outside you may not have selectedPhotoFile set
                // enable cancel but disable save if no selectedPhotoFile
                updateNavButtonState();
            } else {
                // clear preview -> show saved avatar or initials
                updateAllAvatars(currentAvatarURL);
                updateNavButtonState();
            }
            // dedupe after updates
            try { dedupeInitials(); } catch (e) { /* noop */ }
        } catch (e) { console.error('avatar:preview handler error', e); }
    });

    // Final initial sync
    try {
        updateAllAvatars(currentAvatarURL);
        updateNavButtonState();
        dedupeInitials();
    } catch (e) { /* noop */ }

    // expose for debugging
    window._navAvatarControls = { navAvatarInput, navEditBtn, navSaveBtn, navCancelBtn };

    document.addEventListener('DOMContentLoaded', () => {
        // remove any leftover inline display that might override .hidden
        document.querySelectorAll('img.avatar').forEach(i => {
            try { i.style.removeProperty('display'); } catch (e) { /* noop */ }
        });
        // do an initial sync so initials vs images render correctly
        try { if (typeof updateAllAvatars === 'function') updateAllAvatars(window.currentAvatarURL || null); } catch (e) { /* noop */ }
        try { if (typeof dedupeInitials === 'function') dedupeInitials(); } catch (e) { /* noop */ }
    });

})();
