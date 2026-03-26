// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const currentPassword = $('#currentPassword');
const newPassword = $('#newPassword');
const confirmPassword = $('#confirmPassword');

const strengthText = $('#strengthText');
const pwAlert = $('#pwAlert');
const curState = $('#curState');
const confState = $('#confState');

const form = $('#passwordForm');
const resultOverlay = $('#resultOverlay');
const closeResult = $('#closeResult');

// Close modal
const hideSuccessModal = () => { resultOverlay.classList.remove('flex'); resultOverlay.classList.add('hidden'); };
closeResult.addEventListener('click', hideSuccessModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideSuccessModal(); });

// Show success modal for 3 seconds
const showSuccessModal = () => {
    resultOverlay.classList.remove('hidden');
    resultOverlay.classList.add('flex');
    setTimeout(() => {
        resultOverlay.classList.remove('flex');
        resultOverlay.classList.add('hidden');
    }, 3000); // Modal hides after 3 seconds
};

// Live verify "current password" — optional, tries a few endpoints, falls back gracefully
let currentOk = null; // null = unknown, true/false from server
async function verifyCurrentPassword() {
    const pw = currentPassword.value.trim();
    if (!pw) { currentOk = null; setCurIndicator('idle'); return; }

    setCurIndicator('checking');

    const endpoints = ['/account/verify-current', '/account/check-password', '/auth/verify-password'];
    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ current_password: pw })
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (typeof data.valid === 'boolean') {
                currentOk = data.valid;
                setCurIndicator(currentOk ? 'ok' : 'bad');
                return;
            }
        } catch (_) { /* try next */ }
    }
    currentOk = null; // backend doesn’t support verification
    setCurIndicator('idle');
}

function setCurIndicator(state) {
    curState.classList.remove('hidden');
    curState.innerHTML = '';
    curState.className = 'pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 hidden text-xs font-semibold';
    if (state === 'checking') {
        curState.classList.remove('hidden');
        curState.classList.add('text-gray-400');
        curState.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    } else if (state === 'ok') {
        curState.classList.remove('hidden');
        curState.classList.add('text-[#4DA167]');
        curState.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (state === 'bad') {
        curState.classList.remove('hidden');
        curState.classList.add('text-red-600');
        curState.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } // else idle => keep hidden
}

// Strength assessment → text inside input (right)
function assess(pw) {
    const hasLen = pw.length >= 8;
    const hasNum = /\d/.test(pw);
    const hasSpec = /[~`!@#$%^&*()\-_+=\[\]{ }|\\;:"',.<>\/?]/.test(pw);
    let score = 0;
    if (hasLen) score++;
    if (hasNum) score++;
    if (hasSpec) score++;
    if (pw.length >= 12 && score >= 2) score = 3; // long + 2 rules => strong
    return { hasLen, hasNum, hasSpec, score };
}

function setStrengthText(score) {
    const labels = ['', 'WEAK', 'GOOD', 'STRONG'];
    const colors = ['text-[#5E6E66]', 'text-red-600', 'text-amber-500', 'text-[#4DA167]'];
    strengthText.className = 'pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 hidden text-xs font-semibold';
    if (score === 0 || newPassword.value.length === 0) { strengthText.classList.add('hidden'); return; }
    strengthText.classList.remove('hidden');
    strengthText.classList.add(colors[score]);
    strengthText.textContent = labels[score];
}

function setInputValidity(el, valid) {
    el.classList.toggle('border-red-400', !valid);
    el.classList.toggle('focus:ring-red-200', !valid);
    el.classList.toggle('hover:border-red-400', !valid);
    el.classList.toggle('hover:border-[#7FC58B]', valid);
}

function setPwAlert(type, html) {
    const styles = {
        error: ['bg-red-50', 'border-red-400', 'text-red-700'],
        info: ['bg-amber-50', 'border-amber-400', 'text-amber-800'],
        success: ['bg-green-50', 'border-green-500', 'text-green-700']
    };
    pwAlert.className = 'rounded-md border-l-4 p-3 text-sm';
    pwAlert.classList.add(...styles[type]);
    pwAlert.innerHTML = html;
    pwAlert.classList.remove('hidden');
}

function hidePwAlert() { pwAlert.classList.add('hidden'); pwAlert.innerHTML = ''; }

function setConfIndicator(matchState) {
    confState.className = 'pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 hidden text-xs font-semibold';
    if (matchState === 'ok') {
        confState.classList.remove('hidden');
        confState.classList.add('text-[#4DA167]');
        confState.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (matchState === 'bad') {
        confState.classList.remove('hidden');
        confState.classList.add('text-red-600');
        confState.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    }
}

function updateUI() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');

    // Ensure the elements exist before trying to access their values
    if (!currentPassword || !newPassword || !confirmPassword) {
        console.error("Required elements are missing in the DOM.");
        return;  // Early exit if the elements don't exist
    }

    const pw = newPassword.value;
    const conf = confirmPassword.value;
    const cur = currentPassword.value;

    const { hasLen, hasNum, hasSpec, score } = assess(pw);
    setStrengthText(score);

    const missing = [];
    if (!hasLen) missing.push('At least 8 characters');
    if (!hasNum) missing.push('At least 1 number');
    if (!hasSpec) missing.push('At least 1 special character');

    const mismatch = conf.length > 0 && pw !== conf;
    const sameAsCurrent = pw.length > 0 && cur.length > 0 && pw === cur;

    setInputValidity(newPassword, (missing.length === 0 && !sameAsCurrent) || pw.length === 0);
    setInputValidity(confirmPassword, !mismatch || conf.length === 0);
    setConfIndicator(conf.length ? (mismatch ? 'bad' : (pw.length ? 'ok' : 'idle')) : 'idle');

    if (missing.length || mismatch || sameAsCurrent) {
        const parts = [];
        if (missing.length) {
            parts.push(`<p class="font-medium mb-1">Your password should contain:</p>
                      <ul class="list-disc pl-5 space-y-1">${missing.map(li => `<li>${li}</li>`).join('')}</ul>`);
        }
        if (mismatch) parts.push(`<p class="mt-2">Passwords do not match.</p>`);
        if (sameAsCurrent) parts.push(`<p class="mt-2">New password cannot be the same as current password.</p>`);
        setPwAlert('error', parts.join(''));
    } else {
        hidePwAlert();
    }

    // Enable submit button:
    const currentGood = (currentOk === null) ? cur.trim().length > 0 : currentOk === true;
    const accountSecurityBtn = $('#account-security-btn');
    accountSecurityBtn.disabled = !(missing.length === 0 && !mismatch && !sameAsCurrent && currentGood);
}


// toggle eyes
$$('button[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.querySelector(btn.getAttribute('data-toggle'));
        if (!target) return;
        target.type = target.type === 'password' ? 'text' : 'password';
        btn.querySelector('i')?.classList.toggle('fa-eye');
        btn.querySelector('i')?.classList.toggle('fa-eye-slash');
        target.focus();
    });
});

// live events
currentPassword.addEventListener('input', () => { currentOk = null; setCurIndicator('idle'); updateUI(); }, { passive: true });
currentPassword.addEventListener('blur', () => { verifyCurrentPassword(); updateUI(); }, { passive: true });
newPassword.addEventListener('input', updateUI, { passive: true });
confirmPassword.addEventListener('input', updateUI, { passive: true });
[newPassword, confirmPassword].forEach(el => el.addEventListener('blur', updateUI, { passive: true }));
updateUI();

// Handle password change when the 'Save' button is clicked
$('#account-security-btn').addEventListener('click', async () => {
    updateUI();  // Ensure validation before submitting

    const currentPasswordValue = currentPassword.value.trim();
    const newPasswordValue = newPassword.value.trim();
    const confirmPasswordValue = confirmPassword.value.trim();

    // Prevent submission if the current password is invalid or the new password fields are incorrect
    if (currentOk === false || !newPasswordValue || newPasswordValue !== confirmPasswordValue) {
        setPwAlert('error', '<p class="font-medium">Please ensure all fields are filled correctly and passwords match.</p>');
        return;
    }

    try {
        const res = await fetch('/account/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                current_password: currentPasswordValue,
                new_password: newPasswordValue
            })
        });

        const json = await res.json(); // Parse the response as JSON

        if (res.status === 401) {
            // Session expired, need to log in again
            setPwAlert('error', '<p class="font-medium">Session expired. Please log in again.</p>');
            return;
        }

        if (!res.ok) {
            // Handle non-OK responses (e.g., invalid current password)
            setPwAlert('error', `<p class="font-medium">${json.error || 'Failed to change password.'}</p>`);
            return;
        }

        // If the response indicates success
        if (json.success) {
            showSuccessModal(); // Show success modal
            form.reset(); // Reset the form after successful password change
            currentOk = null; // Reset current password verification state
            setCurIndicator('idle');
            setStrengthText(0); // Reset strength text
            setConfIndicator('idle'); // Reset confirmation indicator
            hidePwAlert(); // Hide any error messages
        } else {
            // Handle any specific error returned by the backend
            setPwAlert('error', `<p class="font-medium">${json.error || 'Failed to change password.'}</p>`);
        }
    } catch (err) {
        console.error(err); // Log errors to the console for debugging
        setPwAlert('error', `<p class="font-medium">Network error. Please try again.</p>`);
    }
});

