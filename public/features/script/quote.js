document.addEventListener("DOMContentLoaded", () => {
  // Check session so we know which section to show
  fetch('/auth/user', { credentials: 'include' })
    .then(res => res.json())
    .then(user => {
      const guestSection = document.getElementById('guest-quote-section');
      const quoteSection = document.getElementById('quote-card-section');
      const isLoggedIn = !!(user && user.loggedIn);

      if (!isLoggedIn) {
        // Logged out: show only guest (free) quotes
        if (guestSection) guestSection.style.display = 'grid';
        if (quoteSection) quoteSection.style.display = 'none';
      } else {
        // Logged in: clone guest cards into the logged-in section, hide original guest section,
        // then load DB quotes to append after the cloned free cards.
        if (quoteSection) {
          // clear any previous content (we'll re-clone the guest cards)
          quoteSection.innerHTML = '';

          if (guestSection) {
            Array.from(guestSection.children).forEach(card => {
              // clone guest cards so they become part of the logged-in grid
              quoteSection.appendChild(card.cloneNode(true));
            });
            // hide the original guest section so it doesn't show twice
            guestSection.style.display = 'none';
          }

          quoteSection.style.display = 'grid';
          loadQuotes();
        } else {
          // fallback: if no quoteSection found, leave guestSection visible
          if (guestSection) guestSection.style.display = 'grid';
        }
      }
    })
    .catch(() => {
      // If auth check fails, treat as logged out
      const guestSection = document.getElementById('guest-quote-section');
      const quoteSection = document.getElementById('quote-card-section');
      if (guestSection) guestSection.style.display = 'grid';
      if (quoteSection) quoteSection.style.display = 'none';
    });
});

async function loadQuotes() {
  try {
    const res = await fetch('/resources/quotes');
    const quotes = await res.json();
    const section = document.getElementById('quote-card-section');
    if (!section) return;

    // Remove previously appended dynamic cards to avoid duplicates on multiple loads
    Array.from(section.querySelectorAll('[data-dynamic="true"]')).forEach(n => n.remove());

    quotes.forEach(q => {
      const card = document.createElement('div');
      card.className = "bg-white rounded-xl shadow-md overflow-hidden flex flex-col";
      card.setAttribute('data-dynamic', 'true'); // mark as dynamic so we can remove later
      card.innerHTML = `
                <div class="h-56 bg-gray-200 overflow-hidden">
                    <img src="${q.thumbnail || '/img/default-quote.jpg'}" alt="Quote Cover" class="object-cover w-full h-full">
                </div>
                <div class="flex flex-col justify-between flex-1 p-4">
                    <div class="space-y-2">
                        <h2 class="text-lg font-semibold text-gray-900">${escapeHtml(q.author || "Unknown")}</h2>
                        <p class="text-sm text-gray-500">${escapeHtml(q.country || "")}</p>
                        <h3 class="font-medium text-gray-800">${escapeHtml(q.title || q.quoteTitle || "")}</h3>
                        <blockquote class="italic text-sm text-gray-600 mt-2 border-l-4 border-gray-300 pl-4">
                            "${escapeHtml(q.quoteText || q.text || "")}"
                        </blockquote>
                    </div>
                    <div class="pt-4">
                        <p class="text-xs text-gray-500 font-medium">Famous for:</p>
                        <p class="text-sm text-gray-700">${escapeHtml(q.famousFor || "")}</p>
                    </div>
                </div>
            `;
      section.appendChild(card);
    });

    section.style.display = 'grid';
  } catch (err) {
    console.error('Failed to load quotes:', err);
  }
}

// tiny sanitizer for the quote text
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
