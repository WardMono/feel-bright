async function fetchAuthState() {
  try {
    const res = await fetch('/auth/user', { credentials: 'include' });
    const data = await res.json();
    // Be defensive: Alpine store might not be available
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

async function renderForLoggedIn() {
  const staticSection = document.getElementById('static-articles');   // keep visible
  const dynamicSection = document.getElementById('articles-container');

  // Show both static free articles and dynamic area
  if (staticSection) staticSection.style.display = '';
  if (dynamicSection) dynamicSection.style.display = '';

  try {
    const res = await fetch('/resources/articles', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch articles');
    const articles = await res.json();

    // ensure container exists
    if (!dynamicSection) return;

    // If no server articles, show message (but still show static cards)
    if (!Array.isArray(articles) || articles.length === 0) {
      dynamicSection.innerHTML = `
        <div class="col-span-2 text-center text-gray-600">
        </div>`;
      return;
    }

    dynamicSection.innerHTML = '';
    articles.forEach(article => {
      const card = document.createElement('div');
      card.className = `
        bg-white rounded-2xl shadow-sm overflow-hidden
        border border-gray-100 hover:shadow-[0_4px_30px_rgba(77,161,103,0.3)]
        transition duration-300
        h-full flex flex-col
      `;
      const safeTitle = (article.previewTitle || article.title || 'Untitled').toString();
      const safeCategory = (article.category || 'Uncategorized').toString();

      const textSource = (
        article.summary ??
        article.description ??
        article.preview ??
        article.body ??
        ''
      ).toString();
      const preview = textSource.length > 160 ? textSource.slice(0, 160) + '…' : textSource;

      card.innerHTML = `
        <div class="relative">
          <img src="${article.thumbnail || './img/24.png'}" alt="${safeTitle}" class="w-full h-64 object-cover" />
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
            <a href="/view-article.html?id=${encodeURIComponent(article.id)}" class="text-sm px-4 py-2 rounded-xl border border-[#7FC58B] text-[#7FC58B] bg-white transition-all duration-300 hover:bg-[#7FC58B] hover:text-white inline-block">
              View Article
            </a>
          </div>
        </div>
      `;
      dynamicSection.appendChild(card);
    });

  } catch (err) {
    console.error('Error loading articles:', err);
    const dynamicSection = document.getElementById('articles-container');
    if (dynamicSection) dynamicSection.innerHTML = `
      <div class="col-span-2 text-center text-red-500">
        Failed to load articles.
      </div>`;
  }
}

function renderForLoggedOut() {
  // show only static free articles; hide dynamic container
  const staticSection = document.getElementById('static-articles');
  const dynamicSection = document.getElementById('articles-container');
  if (staticSection) staticSection.style.display = '';
  if (dynamicSection) dynamicSection.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Allow other auth checks (if any) to run first
  setTimeout(async () => {
    const loggedIn = await fetchAuthState();
    if (loggedIn) {
      await renderForLoggedIn();
    } else {
      renderForLoggedOut();
    }
  }, 0);

  // Footer year
  const y = document.getElementById('copyright-year');
  if (y) y.textContent = new Date().getFullYear();
});