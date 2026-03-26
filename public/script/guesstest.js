/* ======================= DATA ======================= */
const questions = [
    { text: "I am aware of my emotions as I experience them.", reverse: false },
    { text: "I find it easy to recognize how others are feeling even without them saying anything.", reverse: false },
    { text: "I remain calm and composed during stressful situations.", reverse: false },
    { text: "I find it challenging to manage my impulses when upset.", reverse: true },
    { text: "I am open to feedback, even when it is critical.", reverse: false },
    { text: "I take responsibility for my actions and their impact on others.", reverse: false },
    { text: "I can shift my mood to match the emotional needs of a situation.", reverse: false },
    { text: "I try to resolve conflicts calmly and respectfully.", reverse: false },

    { text: "I often reflect on my interactions to understand what went well and what I could improve.", reverse: false },
    { text: "I motivate myself to pursue goals even when I feel discouraged.", reverse: false },
    { text: "I enjoy helping others work through their emotions.", reverse: false },
    { text: "I can recognize my emotional triggers.", reverse: false },
    { text: "I strive to understand others' perspectives.", reverse: false },
    { text: "I maintain control when provoked.", reverse: false },
    { text: "I value emotional honesty in relationships.", reverse: false },
    { text: "I am confident in expressing my feelings.", reverse: false },

    { text: "I can identify my emotional needs.", reverse: false },
    { text: "I adjust well to emotional changes in situations.", reverse: false },
    { text: "I am patient when resolving misunderstandings.", reverse: false },
    { text: "I express gratitude regularly.", reverse: false },
    { text: "I remain focused despite emotional distractions.", reverse: false },
    { text: "I check in with others to see how they are feeling.", reverse: false },
    { text: "I accept responsibility when my emotions affect others negatively.", reverse: false },
    { text: "I seek to improve my emotional responses.", reverse: false },

    { text: "I consider how my words may impact others emotionally.", reverse: false },
    { text: "I am calm under pressure.", reverse: false },
    { text: "I regularly self-reflect on emotional decisions.", reverse: false },
    { text: "I strive to maintain emotional balance.", reverse: false },
    { text: "I show empathy in conversations.", reverse: false },
    { text: "I avoid reacting defensively.", reverse: true },
    { text: "I am proactive in improving emotional health.", reverse: false },
    { text: "I encourage emotional expression in my environment.", reverse: false },

    { text: "I understand how past experiences shape my emotions.", reverse: false },
    { text: "I value feedback to grow emotionally.", reverse: false },
    { text: "I use emotions to make better decisions.", reverse: false },
    { text: "I handle emotionally intense situations maturely.", reverse: false },
    { text: "I regulate my mood throughout the day.", reverse: false },
    { text: "I forgive others to move on emotionally.", reverse: false },
    { text: "I communicate clearly even when emotional.", reverse: false },
    { text: "I regularly self-reflect on emotional decisions.", reverse: false }
];
const categories = [
    { key: "Self-Awareness", start: 0, end: 7 },
    { key: "Self-Regulation", start: 8, end: 15 },
    { key: "Motivation", start: 16, end: 23 },
    { key: "Empathy", start: 24, end: 31 },
    { key: "Social Skills", start: 32, end: 39 }
];
const totalSteps = categories.length;

/* ======================= STORAGE KEYS (simplified) ======================= */
const STORAGE_PREFIX = 'fb_assessment'; // single neutral prefix
function qKey(i) { return `${STORAGE_PREFIX}:q:${i}`; }
function pageKey() { return `${STORAGE_PREFIX}:page`; }
function recordKey() { return `${STORAGE_PREFIX}:records`; }

function getAnswer(i) { return localStorage.getItem(qKey(i)); }
function setAnswer(i, v) { localStorage.setItem(qKey(i), String(v)); }
function clearCurrentParticipant() {
    for (let i = 0; i < questions.length; i++) localStorage.removeItem(qKey(i));
    localStorage.removeItem(pageKey());
}
function hasProgress() {
    for (let i = 0; i < questions.length; i++) { if (getAnswer(i)) return true; }
    return false;
}

/* ======================= UI HELPERS ======================= */
function smoothScrollToEl(el, duration = 800) {
    if (!el) return;
    const start = window.scrollY || window.pageYOffset;
    const rect = el.getBoundingClientRect();
    const target = start + rect.top - (window.innerHeight / 2) + (rect.height / 2);
    const startTime = performance.now();
    const ease = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    function step(now) {
        const p = Math.min((now - startTime) / duration, 1);
        const y = start + (target - start) * ease(p);
        window.scrollTo(0, y);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}
const choiceSize = n => (n === 1 || n === 5) ? "w-16 h-16" : (n === 2 || n === 4) ? "w-14 h-14" : "w-12 h-12";
const choiceBase = "ei-dot flex items-center justify-center rounded-full border font-semibold transition-all duration-300 select-none cursor-pointer";
const choicePalette = n => n === 1 ? "bg-red-50 text-gray-700 border-red-200 hover:bg-red-100"
    : n === 2 ? "bg-rose-50 text-gray-700 border-rose-200 hover:bg-rose-100"
        : n === 3 ? "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            : n === 4 ? "bg-emerald-50 text-gray-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-emerald-50 text-gray-700 border-emerald-300 hover:bg-emerald-100";
const ringClr = n => (n === 1 ? "ring-rose-500" : n === 2 ? "ring-rose-400" : n === 3 ? "ring-gray-400" : n === 4 ? "ring-emerald-400" : "ring-emerald-600");

const answerLabel = n => (["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"][n - 1] || "—");
function answerPillHTML(val) {
    const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold";
    if (!val) return `<span class="${base} bg-gray-100 text-gray-500">No answer</span>`;
    if (val === 1) return `<span class="${base} bg-red-100 text-red-700 border border-red-200">${answerLabel(val)}</span>`;
    if (val === 2) return `<span class="${base} bg-rose-100 text-rose-700 border border-rose-200">${answerLabel(val)}</span>`;
    if (val === 3) return `<span class="${base} bg-gray-100 text-gray-700 border border-gray-200">${answerLabel(val)}</span>`;
    if (val === 4) return `<span class="${base} bg-emerald-100 text-emerald-700 border border-emerald-200">${answerLabel(val)}</span>`;
    return `<span class="${base} bg-emerald-200 text-emerald-800 border border-emerald-300">${answerLabel(val)}</span>`;
}

/* ======================= ASSESSMENT RENDER ======================= */
const questionnaire = document.getElementById("questionnaire");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const progressText = document.getElementById("progressText");
const chipEls = Array.from(document.querySelectorAll("[data-chip]"));
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const resultsContinueBtn = document.getElementById("resultsContinueBtn");


let currentPage = 0;

function renderQuestions(step) {
    questionnaire.innerHTML = "";
    const { start, end, key } = categories[step];

    chipEls.forEach(el => {
        el.className = parseInt(el.dataset.chip) === step
            ? "px-3 py-1 rounded-full text-xs font-semibold bg-[color:var(--fb-green)] text-white"
            : "px-3 py-1 rounded-full border border-[color:var(--fb-green)]/30 bg-white text-xs font-semibold text-gray-700";
    });

    for (let i = start; i <= end; i++) {
        const saved = getAnswer(i);
        const card = document.createElement("div");
        card.className = "question rounded-2xl border border-[color:var(--fb-green)]/20 bg-white p-4 md:p-5 shadow-sm transition-all duration-300";
        card.setAttribute("data-question-index", i);

        const scale = [1, 2, 3, 4, 5].map(n => {
            const selected = saved == n;
            const ring = selected ? ` ring-2 ${ringClr(n)} scale-110` : "";
            return `
      <label class="${choiceBase} ${choicePalette(n)} ${choiceSize(n)} ${ring}">
        <input type="radio" id="q${i}_${n}" name="q${i}" value="${n}" ${selected ? "checked" : ""}/>
        <span class="pointer-events-none">${n}</span>
      </label>`;
        }).join("");

        card.innerHTML = `
    <h3 class="text-base md:text-lg font-semibold text-gray-900">Q${i + 1}. ${questions[i].text}</h3>
    <div class="mt-3 flex items-center justify-between gap-4 md:gap-6">
      <span class="text-xs md:text-sm font-bold text-rose-600 shrink-0">Disagree</span>
      <div class="flex items-center justify-center gap-3 md:gap-4">${scale}</div>
      <span class="text-xs md:text-sm font-bold text-emerald-600 shrink-0">Agree</span>
    </div>`;
        questionnaire.appendChild(card);
    }

    addInteractions();
    updateProgressUI();
    toggleNavButtons();
    progressText.textContent = `Step ${step + 1} of ${totalSteps} • Category: ${key}`;

    const firstUnanswered = Array.from(questionnaire.querySelectorAll(".question")).find(q => {
        const idx = parseInt(q.dataset.questionIndex, 10);
        return !getAnswer(idx);
    }) || questionnaire.querySelector(".question");
    if (firstUnanswered) smoothScrollToEl(firstUnanswered, 500);
}

function addInteractions() {
    questionnaire.querySelectorAll('input[type="radio"]').forEach(r => {
        r.addEventListener('change', function () {
            const idx = parseInt(this.name.replace("q", ""), 10);
            const val = parseInt(this.value, 10);
            setAnswer(idx, val);

            const card = this.closest(".question");
            card.querySelectorAll(".ei-dot").forEach(l => l.classList.remove("ring-2", "ring-rose-500", "ring-rose-400", "ring-gray-400", "ring-emerald-400", "ring-emerald-600", "scale-110"));
            const selectedLabel = this.closest(".ei-dot");
            if (selectedLabel) selectedLabel.classList.add("ring-2", ringClr(val), "scale-110");

            updateProgressUI();
            const next = card.nextElementSibling;
            if (next) smoothScrollToEl(next, 700);
        });
    });
}

function updateProgressUI() {
    let answered = 0;
    for (let i = 0; i < questions.length; i++) if (getAnswer(i)) answered++;
    const percent = Math.round((answered / questions.length) * 100);
    if (progressBar) progressBar.style.width = percent + "%";
    if (progressPercent) progressPercent.textContent = `${percent}% (${answered}/${questions.length})`;

    if (answered === questions.length && currentPage === totalSteps - 1) submitBtn.classList.remove("hidden");
    else submitBtn.classList.add("hidden");

    if (currentPage === totalSteps - 1) nextBtn.classList.add("hidden"); else nextBtn.classList.remove("hidden");
}

function toggleNavButtons() {
    if (currentPage === 0) { prevBtn.disabled = true; prevBtn.classList.add("opacity-50", "cursor-not-allowed"); }
    else { prevBtn.disabled = false; prevBtn.classList.remove("opacity-50", "cursor-not-allowed"); }
}

function goToPreviousPage() {
    if (currentPage > 0) {
        currentPage--;
        localStorage.setItem(pageKey(), currentPage);
        renderQuestions(currentPage);
    }
}
function goToNextPage() {
    const { start, end } = categories[currentPage];
    for (let i = start; i <= end; i++) {
        const answered = getAnswer(i);
        const qBlock = document.querySelector(`.question[data-question-index="${i}"]`);
        if (!answered) {
            if (qBlock) {
                qBlock.style.borderColor = "#ef4444";
                smoothScrollToEl(qBlock, 700);
                setTimeout(() => qBlock.style.borderColor = "", 1200);
            }
            return;
        }
    }
    if (currentPage < totalSteps - 1) {
        currentPage++;
        localStorage.setItem(pageKey(), currentPage);
        renderQuestions(currentPage);
    }
}
window.goToPreviousPage = goToPreviousPage;
window.goToNextPage = goToNextPage;

/* ======================= RESULTS ======================= */
const summaryModal = document.getElementById("summaryModal");
const resPage1 = document.getElementById("resPage1");

let mixInstance = null;
let lastOverallPct = 0;
let lastBreakdown = [];

const colors = ['#CFF7DE', '#AEEFC6', '#86E0B0', '#6AD1A0', '#3DBE8A'];

function computeBreakdown() {
    const reverseSet = new Set([3, 29]); // reverse-scored items (Q4, Q30)
    return categories.map(cat => {
        let subtotal = 0, count = 0;
        for (let i = cat.start; i <= cat.end; i++) {
            let v = parseInt(getAnswer(i) || "0", 10);
            if (v > 0) {
                if (reverseSet.has(i)) v = 6 - v;
                subtotal += v; count++;
            }
        }
        const pct = Math.round((subtotal / Math.max(count * 5, 1)) * 100);
        return { key: cat.key, pct, start: cat.start, end: cat.end };
    });
}

function showResPage(n) {
    if (resPage1) resPage1.classList.toggle("hidden", n !== 1);
    if (n === 21) { renderMixDonut(lastBreakdown); }
}

function showSummary() {
    const reverseSet = new Set([3, 29]);
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
        const stored = getAnswer(i);
        if (!stored) { alert("Please answer all the questions before submitting."); return; }
        let val = parseInt(stored, 10);
        if (reverseSet.has(i)) val = 6 - val;
        score += val;
    }

    const overlay = document.getElementById("resultsLoadingOverlay");
    if (overlay) { overlay.classList.remove("hidden"); overlay.classList.add("flex"); }
    setTimeout(() => {
        if (overlay) { overlay.classList.add("hidden"); overlay.classList.remove("flex"); }
        displayResults(score);
    }, 800);
    document.querySelectorAll('#questionnaire input[type="radio"]').forEach(r => {
        r.disabled = true;
        r.removeAttribute('name');
    });
}
window.showSummary = showSummary;

function donutSVG(pct, size = 280, stroke = 18, fg = '#10B981', bg = '#E5F4EB') {
    const r = (size / 2) - stroke, c = 2 * Math.PI * r, o = c * (1 - pct / 100);
    return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${bg}" stroke-width="${stroke}" fill="none"></circle>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${fg}" stroke-width="${stroke}" fill="none"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${o.toFixed(2)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
    <text x="53%" y="60%" dy="-6" text-anchor="middle" font-size="${size * 0.22}" font-weight="800" fill="#065F46">${pct}%</text>
  </svg>`;
}
function displayResults(score) {
    const maxScore = questions.length * 5;
    lastOverallPct = Math.round((score / maxScore) * 100);
    lastBreakdown = computeBreakdown();

    // Page 1
    const catTabs = document.getElementById("catTabs");
    const catPanel = document.getElementById("catPanel");
    let activeCat = 0;

    function renderTabs() {
        if (!catTabs) return;
        catTabs.innerHTML = lastBreakdown.map((b, i) =>
            `<button data-tab="${i}" class="h-10 px-4 rounded-full text-sm font-semibold ${i === activeCat ? 'bg-emerald-100 text-emerald-700' : 'text-gray-700 hover:bg-emerald-50'}">${b.key}</button>`
        ).join("");
        catTabs.querySelectorAll("button").forEach(btn => { btn.onclick = () => { activeCat = +btn.dataset.tab; renderTabs(); renderCatPanel(); }; });
    }
    function renderCatPanel() {
        if (!catPanel) return;
        const b = lastBreakdown[activeCat]; const cards = [];
        for (let i = b.start; i <= b.end; i++) {
            const raw = getAnswer(i); const val = raw ? parseInt(raw, 10) : null;
            cards.push(`<div class="rounded-2xl bg-white p-3 shadow-sm border border-emerald-50">
                  <div class="text-xs font-semibold text-gray-500">Q${i + 1}</div>
                  <div class="text-sm text-gray-700">${questions[i].text}</div>
                  <div class="mt-1">${answerPillHTML(val)}</div>
                </div>`);
        }
        const donut = donutSVG(b.pct, 170, 14);
        catPanel.innerHTML = `<div class="flex flex-col items-center">
      ${donut}
      <div class="mt-2 text-sm font-semibold text-gray-800">${b.key} — ${b.pct}%</div>
    </div>
    <div class="mt-4 grid grid-cols-1 gap-3">${cards.join("")}</div>`;
    }
    renderTabs(); renderCatPanel();
    renderMixDonut(lastBreakdown);
    if (summaryModal) { summaryModal.classList.remove("hidden"); summaryModal.classList.add("flex"); }
    showResPage(1);
}

/* ======================= MIX DONUT (static, hover tooltips kept) ======================= */
function renderMixDonut(breakdown) {
    const labels = breakdown.map(b => b.key);
    const vals = breakdown.map(b => b.pct);
    // create canvas if not present
    let canvas = document.getElementById("mixDonut");
    const panel = document.getElementById('resPage1');
    if (!canvas && panel) {
        const container = document.createElement('div');
        canvas = document.getElementById('mixDonut');
    }
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (window.mixInstance) {
        try { window.mixInstance.destroy(); } catch (e) { /* ignore */ }
        window.mixInstance = null;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round((rect.width || 160) * dpr));
    canvas.height = Math.max(1, Math.round((rect.height || 160) * dpr));

    window.mixInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: vals,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            cutout: '58%',
            layout: { padding: 24 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: function (context) { return `${context.label}: ${context.parsed}%`; } }
                },
                datalabels: { display: false }
            }
        },
        plugins: [ChartDataLabels]
    });

    const legend = document.getElementById("mixLegendGrid");
    if (legend) {
        legend.innerHTML = labels.map((l, i) => `
      <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2">
        <div class="flex items-center gap-3">
          <span class="inline-block w-4 h-4 rounded" style="background:${window.mixInstance.data.datasets[0].backgroundColor[i]}"></span>
          <span class="text-sm font-medium text-gray-800">${l}</span>
        </div>
        <span class="text-sm font-semibold text-gray-700">${vals[i]}%</span>
      </div>
    `).join("");
    }
}

/* ======================= LEAVE / SAVE CONFIRM ======================= */
let leaveConfirmAction = null;
function showLeaveConfirm({ title, text, confirmLabel, onConfirm }) {
    const wrap = document.getElementById('leaveConfirm');
    if (!wrap) return;
    const leaveTitle = document.getElementById('leaveTitle');
    const leaveText = document.getElementById('leaveText');
    const btn = document.getElementById('leaveConfirmBtn');
    if (leaveTitle) leaveTitle.textContent = title || 'Leave and go home?';
    if (leaveText) leaveText.textContent = text || 'If you go back now, your current assessment progress will be cleared. Do you want to continue?';
    if (btn) btn.textContent = confirmLabel || 'Yes, continue';
    leaveConfirmAction = onConfirm || null;
    wrap.classList.remove('hidden'); wrap.classList.add('flex');
}

function hideLeaveConfirm() {
    const wrap = document.getElementById('leaveConfirm');
    if (!wrap) return;
    wrap.classList.add('hidden'); wrap.classList.remove('flex');
    leaveConfirmAction = null;
}

const leaveCancelBtn = document.getElementById('leaveCancel');
if (leaveCancelBtn) leaveCancelBtn.onclick = hideLeaveConfirm;
const leaveConfirmBtn = document.getElementById('leaveConfirmBtn');
if (leaveConfirmBtn) leaveConfirmBtn.onclick = () => {
    if (typeof leaveConfirmAction === 'function') leaveConfirmAction();
    hideLeaveConfirm();
};

function confirmSaveAndExit() {
    showLeaveConfirm({
        title: 'Restart assessment?',
        text: 'This will restart the assessment. Are you sure?',
        confirmLabel: 'Restart',
        onConfirm: () => {
            clearCurrentParticipant();
            window.location.href = 'guesstest.html';
        }
    });
}

/* ===== Enhanced Navigation Guards (links, back, reload) ===== */
function setupNavigationGuards() {
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        if (a.closest('nav')) return;
        const href = a.getAttribute('href') || '';
        if (a.dataset.noconfirm === 'true') return;
        if (!href || href === '#' || href.startsWith('javascript:')) return;
        if (href.startsWith('#')) return;

        if (hasProgress()) {
            e.preventDefault();
            showLeaveConfirm({
                title: 'Leave this assessment?',
                text: 'Leaving now will clear your current assessment progress. Continue?',
                confirmLabel: 'Yes, leave',
                onConfirm: () => {
                    window.onbeforeunload = null;
                    window.removeEventListener('beforeunload', beforeUnloadHandler);
                    window.location.href = href;
                }
            });
        }
    }, true);

    try { history.replaceState({ fb_guard: true }, ''); } catch { }
    try { history.pushState({ fb_guard: true }, ''); } catch { }
    window.addEventListener('popstate', () => {
        if (!hasProgress()) return;
        try { history.pushState({ fb_guard: true }, ''); } catch { }
        showLeaveConfirm({
            title: 'Go back and lose progress?',
            text: 'Going back will reset your assessment progress. Continue?',
            confirmLabel: 'Yes, go back',
            onConfirm: () => {
                window.onbeforeunload = null;
                window.removeEventListener('beforeunload', beforeUnloadHandler);
                history.go(-2);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        const reloadKeys = (e.key === 'F5') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r');
        if (reloadKeys && hasProgress()) {
            e.preventDefault();
            showLeaveConfirm({
                title: 'Reload and lose progress?',
                text: 'Reloading will restart your assessment progress. Continue?',
                confirmLabel: 'Yes, reload',
                onConfirm: () => {
                    window.onbeforeunload = null;
                    window.removeEventListener('beforeunload', beforeUnloadHandler);
                    location.reload();
                }
            });
        }
    });

    window.addEventListener('beforeunload', beforeUnloadHandler);
}

function beforeUnloadHandler(e) {
    if (!hasProgress()) return;
    e.preventDefault();
    e.returnValue = '';
}

/* ======================= AUTH (simple local demo) ======================= */
// Local "users" are stored in localStorage under 'fb_users' as an array of {id,email,first,last,password}
function getUsers() {
    try { return JSON.parse(localStorage.getItem('fb_users') || '[]'); } catch { return []; }
}
function saveUsers(u) { localStorage.setItem('fb_users', JSON.stringify(u)); }
function findUserByEmail(email) { return getUsers().find(x => x.email.toLowerCase() === (email || '').toLowerCase()); }

function openUnlockModal() {
    const m = document.getElementById('unlockModal');
    if (m) { m.classList.remove('hidden'); m.classList.add('flex'); }
    // show default login tab if available
    try { if (typeof showGateLoginForm === 'function') showGateLoginForm(); } catch (e) { /* ignore */ }
}
function closeUnlockModal() {
    const m = document.getElementById('unlockModal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

function closeSummaryModal() {
    const modal = document.getElementById('summaryModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function showGateLoginForm() {
    const loginForm = document.getElementById('gateLoginForm');
    const registerForm = document.getElementById('gateRegisterForm');
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    const tLogin = document.getElementById('gateTabLogin');
    const tReg = document.getElementById('gateTabRegister');
    if (tLogin) tLogin.classList.add('bg-emerald-100', 'text-emerald-700');
    if (tReg) tReg.classList.remove('bg-emerald-100', 'text-emerald-700');
    const unlockErr = document.getElementById('unlockError');
    if (unlockErr) unlockErr.classList.add('hidden');
}

function showGateRegisterForm() {
    const loginForm = document.getElementById('gateLoginForm');
    const registerForm = document.getElementById('gateRegisterForm');
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    const tLogin = document.getElementById('gateTabLogin');
    const tReg = document.getElementById('gateTabRegister');
    if (tReg) tReg.classList.add('bg-emerald-100', 'text-emerald-700');
    if (tLogin) tLogin.classList.remove('bg-emerald-100', 'text-emerald-700');
    const unlockErr = document.getElementById('unlockError');
    if (unlockErr) unlockErr.classList.add('hidden');
}

function toggleGatePassword(id, iconId) {
    const el = document.getElementById(id);
    const icon = document.getElementById(iconId);
    if (!el || !icon) return;
    if (el.type === 'password') {
        el.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        el.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// These will be handled by auth-unified.js, but let's ensure they're properly set up
document.getElementById('gateLoginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('gateLoginEmail').value;
    const password = document.getElementById('gateLoginPassword').value;

    // Use the unified login function
    unifiedLogin(email, password, { showOverlayMessage: 'Unlocking results…' })
        .catch(err => {
            const ue = document.getElementById('unlockError');
            if (ue) { ue.textContent = err.message; ue.classList.remove('hidden'); }
        });
});

document.getElementById('gateRegisterForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const firstName = document.getElementById('gateFirstName').value;
    const lastName = document.getElementById('gateLastName').value;
    const email = document.getElementById('gateEmail').value;
    const password = document.getElementById('gatePassword').value;
    const confirmPassword = document.getElementById('gateConfirmPassword').value;

    // Check if passwords match
    if (password !== confirmPassword) {
        const ue = document.getElementById('unlockError');
        if (ue) { ue.textContent = "Passwords don't match"; ue.classList.remove('hidden'); }
        return;
    }

    // Check if terms are accepted
    if (!document.getElementById('gateTerms').checked) {
        const ue = document.getElementById('unlockError');
        if (ue) { ue.textContent = "Please accept the terms and conditions"; ue.classList.remove('hidden'); }
        return;
    }

    // Use the unified register function
    unifiedRegister(firstName, lastName, email, password, { showOverlayMessage: 'Creating account & unlocking…' })
        .catch(err => {
            const ue = document.getElementById('unlockError');
            if (ue) { ue.textContent = err.message; ue.classList.remove('hidden'); }
        });
});

// small helper: robust parse response
async function parseResponseSafely(res) {
    let data = null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
        try { data = await res.json(); } catch (err) { data = { success: res.ok, message: await res.text().catch(() => '') }; }
    } else {
        const text = await res.text().catch(() => '');
        data = { success: res.ok, message: text || (res.ok ? '' : `Request failed (${res.status})`) };
    }
    return { res, data };
}

// small helper: show the post-register modal (uses existing function if present)
function showPostRegisterModal(message) {
    // prefer window.openPostRegisterModal if available (from other script)
    if (typeof window.openPostRegisterModal === 'function') {
        window.openPostRegisterModal(message || 'We sent a confirmation link to your email.');
        return;
    }

    const modal = document.getElementById('postRegisterModal');
    if (!modal) {
        alert(message || 'We sent a confirmation link to your email.');
        return;
    }
    const msgEl = document.getElementById('postRegMsg');
    if (msgEl) msgEl.textContent = message || 'We sent a confirmation link to your email.';

    // primary button wiring
    const primaryBtn = document.getElementById('postRegBackHomeBtn');
    if (primaryBtn) {
        primaryBtn.onclick = function (ev) {
            ev.preventDefault();
            window.location.href = 'index.html?openLogin=1';
        };
    }

    modal.classList.remove('hidden'); modal.classList.add('flex'); modal.style.display = 'flex';
}

// init
document.addEventListener('DOMContentLoaded', () => {
    setupNavigationGuards();
    const savedPage = parseInt(localStorage.getItem(pageKey()) || '0', 10);
    currentPage = isNaN(savedPage) ? 0 : Math.min(Math.max(savedPage, 0), totalSteps - 1);
    renderQuestions(currentPage);
    const first = document.querySelector(".question"); if (first) smoothScrollToEl(first, 400);
    // show logged in state if session exists
    showLoggedInState();

    // Gate modal tabs
    const gateTabLogin = document.getElementById('gateTabLogin');
    const gateTabRegister = document.getElementById('gateTabRegister');

    if (gateTabLogin && gateTabRegister) {
        gateTabLogin.addEventListener('click', showGateLoginForm);
        gateTabRegister.addEventListener('click', showGateRegisterForm);
    }

    // Profile dropdown functionality
    const profileTrigger = document.getElementById('profile-trigger');
    const profileMenu = document.getElementById('profile-menu');
    const profileBridge = document.getElementById('profile-bridge');

    if (profileTrigger && profileMenu) {
        let menuTimeout;

        profileTrigger.addEventListener('click', () => {
            profileMenu.classList.toggle('open');
        });

        profileTrigger.addEventListener('mouseenter', () => {
            clearTimeout(menuTimeout);
            profileMenu.classList.add('open');
        });

        if (profileBridge) {
            profileBridge.addEventListener('mouseenter', () => {
                clearTimeout(menuTimeout);
                profileMenu.classList.add('open');
            });

            profileBridge.addEventListener('mouseleave', () => {
                menuTimeout = setTimeout(() => {
                    profileMenu.classList.remove('open');
                }, 300);
            });
        }

        profileMenu.addEventListener('mouseleave', () => {
            menuTimeout = setTimeout(() => {
                profileMenu.classList.remove('open');
            }, 300);
        });
    }
});

// Loading
// short delay so users see the overlay briefly
const LOADING_DELAY = 4000;
function showResultsLoading(message = 'Generating your results…') {
    const el = document.getElementById('resultsLoadingOverlay');
    if (!el) return;
    const msgEl = el.querySelector('.mt-4') || el;
    if (msgEl) msgEl.textContent = message;
    el.classList.remove('hidden');
    el.classList.add('flex');
}
function hideResultsLoading() {
    const el = document.getElementById('resultsLoadingOverlay');
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
}

// expose simple open/close for other modals
function openLoginModal() {
    const lm = document.getElementById('loginModal');
    if (!lm) return;
    lm.classList.remove('hidden'); lm.classList.add('flex'); lm.style.display = 'flex';
    // show login part if available
    try { if (typeof showLoginForm === 'function') showLoginForm(); } catch (e) { /* ignore */ }
}
function closeLoginModal() {
    const lm = document.getElementById('loginModal');
    if (!lm) return;
    lm.classList.add('hidden'); lm.classList.remove('flex'); lm.style.display = 'none';
}
function openRegisterModal() {
    const lm = document.getElementById('loginModal');
    if (!lm) return;
    lm.classList.remove('hidden'); lm.classList.add('flex'); lm.style.display = 'flex';
    try { if (typeof showRegisterForm === 'function') showRegisterForm(); } catch (e) { /* ignore */ }
}
function showRegisterForm() {
    const rw = document.getElementById('registerFormWrapper');
    const lw = document.getElementById('loginFormWrapper');
    const fw = document.getElementById('forgotFormWrapper');
    if (rw) rw.classList.remove('hidden');
    if (lw) lw.classList.add('hidden');
    if (fw) fw.classList.add('hidden');
}
function showLoginForm() {
    const rw = document.getElementById('registerFormWrapper');
    const lw = document.getElementById('loginFormWrapper');
    const fw = document.getElementById('forgotFormWrapper');
    if (rw) rw.classList.add('hidden');
    if (lw) lw.classList.remove('hidden');
    if (fw) fw.classList.add('hidden');
}
function showForgotForm() {
    const rw = document.getElementById('registerFormWrapper');
    const lw = document.getElementById('loginFormWrapper');
    const fw = document.getElementById('forgotFormWrapper');
    if (rw) rw.classList.add('hidden');
    if (lw) lw.classList.add('hidden');
    if (fw) fw.classList.remove('hidden');
}

function toggleLoginPassword() {
    const el = document.getElementById('loginPassword');
    const icon = document.getElementById('loginToggleIcon');
    if (!el || !icon) return;
    if (el.type === 'password') {
        el.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        el.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
function togglePasswordField(id, iconId) {
    const el = document.getElementById(id);
    const icon = document.getElementById(iconId);
    if (!el || !icon) return;
    if (el.type === 'password') {
        el.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        el.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function showLoggedInState() {
    try {
        const session = JSON.parse(localStorage.getItem('fb_session') || 'null');
        if (session) {
            // Hide auth buttons, show profile
            const abd = document.getElementById('auth-buttons-desktop');
            const abm = document.getElementById('auth-buttons-mobile');
            const upd = document.getElementById('user-profile-desktop');
            const upm = document.getElementById('user-profile-mobile');
            if (abd) abd.classList.add('hidden');
            if (abm) abm.classList.add('hidden');
            if (upd) upd.classList.remove('hidden');
            if (upm) upm.classList.remove('hidden');

            // Update profile info
            const firstName = session.name ? session.name.split(' ')[0] : 'User';
            const du = document.getElementById('desktop-username');
            const mu = document.getElementById('mobile-username');
            const mn = document.getElementById('menuName');
            const me = document.getElementById('menuEmail');
            const mMn = document.getElementById('mMenuName');
            const mMe = document.getElementById('mMenuEmail');
            if (du) du.textContent = `Hi, ${firstName}`;
            if (mu) mu.textContent = `Hi, ${firstName}`;
            if (mn) mn.textContent = session.name || 'User';
            if (me) me.textContent = session.email || '';
            if (mMn) mMn.textContent = session.name || 'User';
            if (mMe) mMe.textContent = session.email || '';
        } else {
            const abd = document.getElementById('auth-buttons-desktop');
            const abm = document.getElementById('auth-buttons-mobile');
            const upd = document.getElementById('user-profile-desktop');
            const upm = document.getElementById('user-profile-mobile');
            if (abd) abd.classList.remove('hidden');
            if (abm) abm.classList.remove('hidden');
            if (upd) upd.classList.add('hidden');
            if (upm) upm.classList.add('hidden');
        }
    } catch (e) {
        console.error('Error checking login state:', e);
    }
}

// ==============================
// MODIFIED AUTH FUNCTIONS FOR GUEST TEST
// ==============================

// Unified login function for unlock modal (guest -> become logged-in at index.html)
async function unifiedLogin(email, password, options = {}) {
    showResultsLoading(options.showOverlayMessage || 'Signing in…');
    try {
        const resRaw = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const { res, data } = await parseResponseSafely(resRaw);

        if (!res.ok) {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `Server error (${res.status})`;
            hideResultsLoading();
            openUnlockModal();
            const ue = document.getElementById('unlockError');
            if (ue) { ue.textContent = msg; ue.classList.remove('hidden'); }
            throw new Error(msg);
        }

        if (data && data.success) {
            // Clear guest assessment data
            clearCurrentParticipant();

            // Fetch user data and update UI (best-effort)
            let user = null;
            try {
                const r = await fetch('/auth/user', { credentials: 'include' });
                if (r.ok) user = await r.json();
            } catch (err) {
                console.warn('Could not fetch /auth/user after login', err);
            }

            if (typeof refreshProfileUI === 'function' && user) {
                try { refreshProfileUI(user); } catch (err) { console.warn('refreshProfileUI failed', err); }
            }

            // Close the unlock modal
            closeUnlockModal();
            hideResultsLoading();

            // Redirect to index.html as logged-in user
            window.location.href = 'index.html';
            return;
        } else {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : 'Login failed';
            hideResultsLoading();
            openUnlockModal();
            const ue = document.getElementById('unlockError');
            if (ue) { ue.textContent = msg; ue.classList.remove('hidden'); }
            throw new Error(msg);
        }
    } catch (err) {
        hideResultsLoading();
        openUnlockModal();
        const ue = document.getElementById('unlockError');
        const friendly = err && err.message ? err.message : 'Network error. Try again.';
        if (ue) { ue.textContent = friendly; ue.classList.remove('hidden'); }
        throw err;
    }
}

// Unified register function for unlock modal (guest: show post-register modal and point to index.html?openLogin=1)
async function unifiedRegister(firstName, lastName, email, password, options = {}) {
    showResultsLoading(options.showOverlayMessage || 'Creating account…');
    try {
        const resRaw = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email,
                password,
                confirm_password: password
            })
        });
        const { res, data } = await parseResponseSafely(resRaw);

        if (!res.ok) {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `Server error (${res.status})`;
            hideResultsLoading();
            openUnlockModal();
            const ue = document.getElementById('unlockError');
            if (ue) { ue.textContent = msg; ue.classList.remove('hidden'); }
            throw new Error(msg);
        }

        if (data && data.success) {
            // Clear guest assessment data
            clearCurrentParticipant();

            // Try to fetch /auth/user to update UI (best-effort)
            let user = null;
            try {
                const r = await fetch('/auth/user', { credentials: 'include' });
                if (r.ok) user = await r.json();
            } catch (err) {
                console.warn('Could not fetch /auth/user after signup', err);
            }

            if (typeof refreshProfileUI === 'function' && user) {
                try { refreshProfileUI(user); } catch (err) { console.warn('refreshProfileUI failed', err); }
            }

            hideResultsLoading();

            // Show the post-register confirmation modal (will direct to index.html?openLogin=1)
            const serverMsg = (data && (data.message || data.error)) ? (data.message || data.error) : 'We sent a confirmation link to your email. Please verify your account before logging in.';
            showPostRegisterModal(serverMsg);
            return;
        } else {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : 'Registration failed';
            hideResultsLoading();
            openUnlockModal();
            const ue = document.getElementById('unlockError');
            if (ue) { ue.textContent = msg; ue.classList.remove('hidden'); }
            throw new Error(msg);
        }
    } catch (err) {
        hideResultsLoading();
        openUnlockModal();
        const ue = document.getElementById('unlockError');
        const friendly = err && err.message ? err.message : 'Network error. Try again.';
        if (ue) { ue.textContent = friendly; ue.classList.remove('hidden'); }
        throw err;
    }
}
