// ----------------------
// AUTH CHECK
// ----------------------
async function fetchAuthState() {
  try {
    const res = await fetch('/auth/user', { credentials: 'include' });
    const data = await res.json();
    // Update Alpine store if present
    if (window.Alpine && Alpine.store) {
      try {
        Alpine.store('user').loggedIn = !!data.loggedIn;
        Alpine.store('user').name = data.name || '';
      } catch (_) { }
    }
    if (typeof updateHeaderUI === 'function') updateHeaderUI(data);
    return !!data.loggedIn;
  } catch (e) {
    console.error('Auth check failed:', e);
    return false;
  }
}

// ----------------------
// RENDER DYNAMIC MEDITATIONS
// ----------------------
async function renderDynamicMeditations() {
  const dynamicContainer = document.getElementById('reading-material-cards');
  if (!dynamicContainer) return;

  try {
    const res = await fetch('/resources/reading-materials', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch reading materials');
    const materials = await res.json();

    if (!Array.isArray(materials) || materials.length === 0) {
      dynamicContainer.innerHTML = `<p class="text-center text-gray-500 col-span-full"></p>`;
      dynamicContainer.style.display = 'contents';
      return;
    }

    dynamicContainer.innerHTML = ''; // Clear container
    materials.forEach(material => {
      const card = document.createElement('div');
      card.className = `
        bg-white rounded-2xl shadow-sm overflow-hidden
        border border-gray-100 hover:shadow-[0_4px_30px_rgba(77,161,103,0.3)]
        transition duration-300 h-full flex flex-col
      `;

      const safeTitle = (material.previewTitle || material.title || 'Untitled').toString();
      const safeCategory = (material.category || 'Uncategorized').toString();

      const textSource = (
        material.summary ??
        material.description ??
        material.preview ??
        material.body ??
        ''
      ).toString();
      const preview = textSource.length > 160 ? textSource.slice(0, 160) + '…' : textSource;

      card.innerHTML = `
        <div class="relative">
          <img src="${material.thumbnail || './img/24.png'}" alt="${safeTitle}" class="w-full h-64 object-cover" />
          <span class="absolute top-4 left-4 bg-[#E6F9ED] text-[#22693F] text-xs font-medium px-3 py-1 rounded-full shadow-sm">
            ${safeCategory}
          </span>
        </div>
        <div class="p-6 flex flex-col h-full">
          <div class="space-y-2">
            <h3 class="text-xl font-semibold text-[#1C1C1C] leading-snug">${safeTitle}</h3>
            <p class="text-sm text-gray-600 leading-relaxed break-words">${preview}</p>
          </div>
          <div class="mt-auto flex justify-end pt-4">
            <a href="/view-reading.html?id=${encodeURIComponent(material.id)}" class="text-sm px-4 py-2 rounded-xl border border-[#7FC58B] text-[#7FC58B] bg-white transition-all duration-300 hover:bg-[#7FC58B] hover:text-white inline-block">
              View Material
            </a>
          </div>
        </div>
      `;

      dynamicContainer.appendChild(card);
    });

    dynamicContainer.style.display = 'contents'; // Show container
  } catch (err) {
    console.error('❌ Failed to load meditations:', err);
    dynamicContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Failed to load meditations.</p>`;
    dynamicContainer.style.display = 'contents';
  }
}

// ----------------------
// INITIALIZE
// ----------------------
document.addEventListener('DOMContentLoaded', async () => {
  const loggedIn = await fetchAuthState();
  if (loggedIn) {
    await renderDynamicMeditations();
  }
});
