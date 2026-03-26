document.addEventListener("DOMContentLoaded", () => {
  fetch("/auth/user")
    .then(res => res.json())
    .then(user => {
      const guestSection = document.getElementById("guest-quote-section");
      const quoteSection = document.getElementById("quote-card-section");

      if (user && user.loggedIn) {
        if (guestSection) guestSection.style.display = "none";
        if (quoteSection) {
          quoteSection.style.display = "grid";
          loadQuoteCards(quoteSection);
        }
      } else {
        if (guestSection) guestSection.style.display = "grid";
        if (quoteSection) quoteSection.style.display = "none";
      }
    })
    .catch(err => {
      console.warn("User not logged in, showing guest cards.");
    });
});

function loadQuoteCards(container) {
  fetch("/resources/quotes")
    .then(res => res.json())
    .then(quotes => {
      container.innerHTML = "";
      quotes.forEach(q => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-xl shadow-md overflow-hidden flex flex-col";

        card.innerHTML = `
          <div class="h-56 bg-gray-200 overflow-hidden">
            <img src="${q.thumbnail}" alt="${q.author_name}" class="object-cover w-full h-full">
          </div>
          <div class="flex flex-col justify-between flex-1 p-4">
            <div class="space-y-2">
              <h2 class="text-lg font-semibold text-gray-900">${q.author_name}</h2>
              <p class="text-sm text-gray-500">${q.country}</p>
              <h3 class="font-medium text-gray-800">${q.quote_title}</h3>
              <blockquote class="italic text-sm text-gray-600 mt-2 border-l-4 border-gray-300 pl-4">
                "${q.quote}"
              </blockquote>
            </div>
            <div class="pt-4">
              <p class="text-xs text-gray-500 font-medium">Famous for:</p>
              <p class="text-sm text-gray-700">${q.famous_for}</p>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    })
    .catch(err => {
      console.error("Failed to load quotes:", err);
    });
}
