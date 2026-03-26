// Back to top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function toggleBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    btn.classList.toggle('show', y >= 200);
}
window.addEventListener('scroll', toggleBackToTop, { passive: true });
window.addEventListener('load', toggleBackToTop);
document.addEventListener('DOMContentLoaded', toggleBackToTop);

// Article loader
function qs(id) { return document.getElementById(id); }
function textOrEmpty(v) { return (v ?? "").toString().trim(); }

async function loadArticle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
        document.body.innerHTML = '<p class="p-8 text-center text-red-600">Invalid article ID.</p>';
        return;
    }

    try {
        const res = await fetch(`/resources/article/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!res.ok) throw new Error("Article not found");
        const art = await res.json();

        // Header
        const cat = textOrEmpty(art.category) || "Uncategorized";
        const title = textOrEmpty(art.previewTitle || art.title);
        qs("preview-cat-pill").textContent = cat;
        qs("preview-title").textContent = title;

        // Hero
        const heroEl = qs("preview-hero");
        const heroSkeleton = qs("hero-skeleton");
        const heroUrl = textOrEmpty(art.heroImage || art.hero || art.hero_url || art.heroSrc);
        if (heroUrl) {
            heroEl.src = heroUrl;
            heroEl.onload = () => { heroEl.classList.remove("hidden"); heroSkeleton.style.display = "none"; };
            heroEl.onerror = () => { heroSkeleton.style.display = "none"; };
        } else {
            heroSkeleton.style.display = "none";
        }

        // Sections
        const container = qs("preview-content");
        const skeleton = qs("sections-skeleton");
        container.querySelectorAll(".section").forEach(n => n.remove());
        skeleton?.remove();

        const sections = Array.isArray(art.sections) ? art.sections : [];
        if (!sections.length) {
            const empty = document.createElement("p");
            empty.className = "text-center text-gray-500 py-6 section";
            empty.textContent = "No content available for this article.";
            container.appendChild(empty);
            return;
        }

        sections
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .forEach(sec => {
                const isQuote = !!sec.isQuote;
                const tpl = document.getElementById(isQuote ? "tpl-quote" : "tpl-text").content.cloneNode(true);
                if (isQuote) {
                    const quote = textOrEmpty(sec.text);
                    const author = textOrEmpty(sec.author);
                    tpl.querySelector("blockquote").textContent = quote;
                    tpl.querySelector("p").textContent = author ? `— ${author}` : "";
                } else {
                    const subtitle = textOrEmpty(sec.subtitle);
                    const text = textOrEmpty(sec.text);
                    tpl.querySelector("h2").textContent = subtitle;
                    tpl.querySelector("p").textContent = text;
                }
                const wrap = document.createElement("div");
                wrap.className = "section";
                wrap.appendChild(tpl);
                container.appendChild(wrap);
            });
    } catch (err) {
        console.error(err);
        document.body.innerHTML = `
          <div class="max-w-xl mx-auto p-8 text-center">
            <p class="text-red-600 font-semibold">Failed to load article.</p>
            <p class="text-gray-600 mt-2">Please refresh the page or try again later.</p>
            <div class="mt-6">
              <button onclick="window.history.back()"
                      class="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-semibold">Back</button>
            </div>
          </div>`;
    }
}
document.addEventListener("DOMContentLoaded", loadArticle);