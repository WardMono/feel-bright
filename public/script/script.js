
//SHOW/HIDE BTOP-BTN
window.addEventListener("scroll", () => {
  const backToTopBtn = document.getElementById("backToTop");
  if (window.scrollY > 400) {
    backToTopBtn.classList.add("show");
  } else {
    backToTopBtn.classList.remove("show");
  }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Update copyright year dynamically
const currentYear = new Date().getFullYear();
