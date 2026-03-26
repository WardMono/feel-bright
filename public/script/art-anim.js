
// Slide For Resources Articles Start //
   document.addEventListener("DOMContentLoaded", function () {
      const slides = document.querySelectorAll(".carousel-slide");
      const prev = document.querySelector(".carousel-prev");
      const next = document.querySelector(".carousel-next");
      let current = 1;

      function updateSlides() {
        slides.forEach((slide, index) => {
          slide.classList.remove("left", "active", "right");

          if (index === current) {
            slide.classList.add("active");
          } else if (index === (current - 1 + slides.length) % slides.length) {
            slide.classList.add("left");
          } else if (index === (current + 1) % slides.length) {
            slide.classList.add("right");
          }
        });
      }

      prev.addEventListener("click", () => {
        current = (current - 1 + slides.length) % slides.length;
        updateSlides();
      });

      next.addEventListener("click", () => {
        current = (current + 1) % slides.length;
        updateSlides();
      });

      updateSlides(); // initialize
    });

    // Slide For Resources Articles End //

     const articles = [
    {
      image: "./img/24.png",
      category: "Personal Growth",
      title: "Authenticity and the Self",
      description: "Discover how embracing your true nature can slow down the noise and bring clarity to your everyday life.",
      link: "./resources/authenticty-and-the-self.html"
    },
    {
      image: "./img/25.png",
      category: "Leadership Insights",
      title: "Emotional Intelligence in Leadership",
      description: "Learn how tuning into your emotions and others’ can transform leadership from command to connection.",
      link: "./resources/ei-in-leadership.html"
    },
    {
      image: "./img/26.png",
      category: "Mindful Awareness",
      title: "Emotional Awareness",
      description: "Explore the importance of recognizing and understanding your feelings to foster inner calm and mindful decisions.",
      link: "./resources/emotional-awareness.html"
    },
    {
      image: "./img/27.png",
      category: "Mindful Practices",
      title: "Stillness and Reflection",
      description: "Discover simple ways to slow down and create space for thoughtful self-awareness in a busy world.",
      link: "./resources/stillness-and-reflection.html"
    },
    {
      image: "./img/28.png",
      category: "Resilience Skills",
      title: "Stress Tolerance and Resilience",
      description: "Build the capacity to face life’s challenges with calm strength and bounce back with renewed clarity.",
      link: "./resources/stress-tolerance.html"
    },
    {
      image: "./img/29.png",
      category: "Self Understanding",
      title: "What is Ego?",
      description: "Unpack the role of ego in shaping your sense of self and how mindful awareness can bring balance and freedom.",
      link: "./resources/what-is-ego.html"
    }
  ];

  const articlesGrid = document.getElementById("articles-grid");

  articles.forEach(article => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-[0_4px_30px_rgba(77,161,103,0.3)] hover:backdrop-blur-sm duration-300";

    card.innerHTML = `
      <div class="relative">
        <img src="${article.image}" alt="${article.title}" class="w-full h-64 object-cover transition-transform duration-500">
        <span class="absolute top-4 left-4 bg-[#E6F9ED] text-[#22693F] text-xs font-medium px-3 py-1 rounded-full">${article.category}</span>
      </div>
      <div class="p-6 space-y-4">
        <h3 class="text-xl font-semibold text-[#1C1C1C] leading-snug">${article.title}</h3>
        <p class="text-sm text-gray-600 leading-relaxed">${article.description}</p>
        <div class="flex justify-end pt-2">
          <a href="${article.link}" class="text-sm px-4 py-2 rounded-full border border-[#7FC58B] text-[#7FC58B] bg-white transition-all duration-300 hover:bg-[#7FC58B] hover:text-white">
            View Article
          </a>
        </div>
      </div>
    `;

    articlesGrid.appendChild(card);
  });