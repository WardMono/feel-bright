
const sidebarAvatar = document.getElementById('sidebar-avatar');
const sidebarName = document.getElementById('sidebar-name');
const navBtns = document.querySelectorAll('#settings-nav .nav-btn');

const firstName = document.getElementById('first_name');
const middleName = document.getElementById('middle_name');
const lastName = document.getElementById('last_name');
const email = document.getElementById('email');
const birthday = document.getElementById('birthday');

const profileForm = document.getElementById('profile-form');

// Header buttons (kept for logic reuse; remain hidden)
const profileEditBtn = document.getElementById('profile-edit-btn');
const profileSaveBtn = document.getElementById('profile-save-btn');
const profileCancelBtn = document.getElementById('profile-cancel-btn');

const photoEditBtn = document.getElementById('photo-edit-btn');
const photoSaveBtn = document.getElementById('photo-save-btn');
const photoCancelBtn = document.getElementById('photo-cancel-btn');

const dropzone = document.getElementById('dropzone');
const photoInput = document.getElementById('photo-input');
const photoPreview = document.getElementById('photo-preview');
const photoFilename = document.getElementById('photo-filename');

const logoutBtn = document.getElementById('logout-btn');
const toast = document.getElementById('message');

// New unified footer controls
const mainActions = document.getElementById('main-actions');
const footerProfile = document.getElementById('footer-profile-actions');
const footerPhoto = document.getElementById('footer-photo-actions');

const fpEdit = document.getElementById('footer-profile-edit');
const fpSave = document.getElementById('footer-profile-save');
const fpCancel = document.getElementById('footer-profile-cancel');

const fphEdit = document.getElementById('footer-photo-edit');
const fphSave = document.getElementById('footer-photo-save');
const fphCancel = document.getElementById('footer-photo-cancel');

const securityBtn = document.getElementById('account-security-btn');
const securityActions = document.getElementById('security-actions');

const DEFAULT_AVATAR = './img/default-avatar.jpg';

// ----- State -----
let profileMode = 'view'; // 'view' | 'edit'
let photoMode = 'view';   // 'view' | 'edit'
let profileInitial = {};
let selectedPhotoFile = null;
let currentAvatarURL = DEFAULT_AVATAR;
let lastObjectURL = null;

// ----- Helpers -----
function showToast(text, type = 'success') {
    toast.textContent = text;
    toast.style.display = 'block';
    toast.style.borderColor = type === 'error' ? '#fecaca' : '#bbf7d0';
    toast.style.background = type === 'error' ? '#fef2f2' : '#f0fdf4';
    toast.style.color = type === 'error' ? '#991b1b' : '#374151';
    setTimeout(() => { toast.style.display = 'none'; }, 3400);
}

function setDisabledInputs(disabled) {
    [firstName, middleName, lastName, email, birthday].forEach(input => input.disabled = disabled);
}

function updateNamePreview() {
    const name = `${firstName.value || ''} ${lastName.value || ''}`.trim();
    if (name) sidebarName.textContent = name;
}

function toggle(el, show) {
    el.classList.toggle('hidden', !show);
}

function setProfileMode(mode) {
    profileMode = mode;
    const isEdit = mode === 'edit';
    setDisabledInputs(!isEdit);
    // Footer buttons
    toggle(fpEdit, !isEdit);
    toggle(fpSave, isEdit);
    toggle(fpCancel, isEdit);
    if (isEdit) firstName.focus();
}

function setPhotoMode(mode) {
    photoMode = mode;
    const isEdit = mode === 'edit';
    toggle(fphEdit, !isEdit);
    toggle(fphSave, isEdit);
    toggle(fphCancel, isEdit);
}

function revokeLastObjectURL() {
    if (lastObjectURL) {
        URL.revokeObjectURL(lastObjectURL);
        lastObjectURL = null;
    }
}

// ----- Section switching -----
function showSection(target) {
    const sections = {
        profile: document.getElementById('section-profile'),
        photo: document.getElementById('section-photo'),
        security: document.getElementById('section-security')
    };

    Object.values(sections).forEach(section => section.classList.add('hidden'));
    sections[target].classList.remove('hidden');

    if (target === 'profile') {
        toggle(mainActions, true);
        toggle(footerProfile, true);
        toggle(footerPhoto, false);
        toggle(securityActions, false);
        // sync footer buttons to current mode
        setProfileMode(profileMode);
    } else if (target === 'photo') {
        toggle(mainActions, true);
        toggle(footerProfile, false);
        toggle(footerPhoto, true);
        toggle(securityActions, false);
        setPhotoMode(photoMode);
    } else if (target === 'security') {
        toggle(mainActions, false);
        toggle(footerProfile, false);
        toggle(footerPhoto, false);
        toggle(securityActions, true);
    }
}

function setActiveNav(target) {
    navBtns.forEach(btn => {
        btn.classList.toggle('nav-active', btn.dataset.target === target);
        btn.setAttribute('aria-current', btn.dataset.target === target ? 'page' : 'false');
    });
}

// ----- Initial Fetch -----
async function fetchUser() {
    try {
        const res = await fetch('/auth/user', { credentials: 'include' });
        const data = await res.json();
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

        const avatar = data.profile_picture || DEFAULT_AVATAR;
        currentAvatarURL = avatar;
        photoPreview.src = avatar;
        sidebarAvatar.src = avatar;
        sidebarName.textContent = `${firstName.value || ''} ${lastName.value || ''}`.trim() || 'Your Account';

        // Start in VIEW mode; footer controls only
        setProfileMode('view');
        setPhotoMode('view');
        updateNamePreview();
    } catch (e) {
        console.error(e);
        showToast('Could not load your profile.', 'error');
    }
}

// ----- Profile: Edit / Save / Cancel (footer triggers header handlers) -----
firstName.addEventListener('input', updateNamePreview);
lastName.addEventListener('input', updateNamePreview);

// Reuse existing header handlers by triggering their click events
fpEdit.addEventListener('click', () => { setProfileMode('edit'); showToast('Editing profile…'); });

fpCancel.addEventListener('click', () => {
    // Mirror original cancel behavior
    firstName.value = profileInitial.first_name || '';
    middleName.value = profileInitial.middle_name || '';
    lastName.value = profileInitial.last_name || '';
    email.value = profileInitial.email || '';
    birthday.value = profileInitial.birthday || '';
    updateNamePreview();
    setProfileMode('view');
    showToast('Changes discarded.');
});

fpSave.addEventListener('click', async () => {
    if (!firstName.value.trim() || !lastName.value.trim()) {
        showToast('First and Last name are required.', 'error');
        return;
    }
    if (!email.validity.valid) {
        showToast('Please enter a valid email.', 'error');
        return;
    }

    const payload = {
        first_name: firstName.value.trim(),
        middle_name: middleName.value.trim(),
        last_name: lastName.value.trim(),
        email: email.value.trim(),
        birthday: birthday.value.trim() === '' ? null : birthday.value
    };

    try {
        const res = await fetch('/account/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            profileInitial = { ...payload };
            sidebarName.textContent = `${payload.first_name} ${payload.last_name}`.trim();
            updateNamePreview();
            setProfileMode('view');
            showToast('Profile updated successfully!');
        } else {
            showToast('Failed to update profile', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error saving profile', 'error');
    }
});

// Prevent native submit
profileForm.addEventListener('submit', (e) => e.preventDefault());
setDisabledInputs(true);

// ----- Photo: Edit / Save / Cancel (footer triggers) -----
function handleFiles(file) {
    if (!file) return;
    selectedPhotoFile = file;
    photoFilename.textContent = file.name;
    revokeLastObjectURL();
    lastObjectURL = URL.createObjectURL(file);
    photoPreview.src = lastObjectURL;
}

// Dropzone interactions
dropzone.addEventListener('click', () => { if (photoMode === 'edit') photoInput.click(); });
dropzone.addEventListener('keydown', (e) => {
    if (photoMode === 'edit' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        photoInput.click();
    }
});
photoInput.addEventListener('change', (e) => handleFiles(e.target.files[0]));

['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => {
    if (photoMode !== 'edit') return;
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('dz-active');
}));

['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => {
    if (photoMode !== 'edit') return;
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('dz-active');
}));

dropzone.addEventListener('drop', e => {
    if (photoMode !== 'edit') return;
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFiles(file);
});

// Footer controls for Photo
fphEdit.addEventListener('click', () => { setPhotoMode('edit'); showToast('Editing photo…'); });

fphCancel.addEventListener('click', () => {
    revokeLastObjectURL();
    photoPreview.src = currentAvatarURL || DEFAULT_AVATAR;
    selectedPhotoFile = null;
    photoFilename.textContent = '';
    setPhotoMode('view');
    showToast('Photo changes discarded.');
});

fphSave.addEventListener('click', async () => {
    if (!selectedPhotoFile) { showToast('Choose an image first.', 'error'); return; }
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
            sidebarAvatar.src = finalURL;
            photoPreview.src = finalURL;
            revokeLastObjectURL();
            selectedPhotoFile = null;
            photoFilename.textContent = '';
            setPhotoMode('view');
            showToast('Photo updated successfully!');
        } else {
            showToast('Failed to upload photo', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error uploading photo', 'error');
    }
});

// ----- Boot -----
fetchUser();

// ----- Nav -----
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setActiveNav(btn.dataset.target);
        showSection(btn.dataset.target);
    });
});

// ----- Logout -----
logoutBtn.addEventListener('click', () => { window.location.href = '/logout'; });



// Button focus styles
const buttons = document.querySelectorAll('.nav-btn');
buttons.forEach(button => {
    button.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('focus'));
        button.classList.add('focus');
    });
});


const initial = ['profile', 'photo', 'security'].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : 'profile';
setActiveNav(initial);
showSection(initial);

// Navigate to a specific settings section from the profile menu
function goToSettingsSection(section) {
    const valid = ['profile', 'photo', 'security'];
    const target = valid.includes(section) ? section : 'profile';

    // if we're already on the settings page:
    const shell = document.getElementById('settings-shell');
    if (shell && typeof showSection === 'function' && typeof setActiveNav === 'function') {
        setActiveNav(target);
        showSection(target);
        // close desktop dropdown if open
        const menu = document.getElementById('profile-menu');
        if (menu) {
            menu.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
            menu.setAttribute('aria-hidden', 'true');
        }
        // smooth scroll to the card
        document.getElementById('settings-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // jump to the settings page with a hash (works from other pages)
        window.location.href = '/user/accountsettings.html#' + target;
    }
}

// Respect URL hashes on load (e.g., /user/accountsettings.html#photo)
(function initHashSection() {
    const hash = (location.hash || '').replace('#', '');
    if (['profile', 'photo', 'security'].includes(hash) &&
        typeof showSection === 'function' &&
        typeof setActiveNav === 'function') {
        setActiveNav(hash);
        showSection(hash);
    }
})();