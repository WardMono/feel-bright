// === Includes Loader ===

// Load Navbar
fetch("includes/navbar.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("navbar").innerHTML = data;

    // === Highlight active navbar link ===
    let currentPath = window.location.pathname.split("/").pop();
    if (!currentPath) currentPath = "index.html";

    document.querySelectorAll("#navbar a").forEach(link => {
      let linkPath = link.getAttribute("href").replace("./", "").trim();
      if (!linkPath) linkPath = "index.html";

      // Reset styles
      link.classList.remove("text-[#7FC58B]");
      link.classList.add("text-[#1C1C1C]", "hover:text-[#7FC58B]");

      // Highlight active
      if (linkPath === currentPath) {
        link.classList.remove("text-[#1C1C1C]", "hover:text-[#7FC58B]");
        link.classList.add("text-[#7FC58B]");
      }
    });

    // === Profile Dropdown Logic ===
    const profileTrigger = document.getElementById("profile-trigger");
    const profileMenu = document.getElementById("profile-menu");
    const profileBridge = document.getElementById("profile-bridge");

    if (profileTrigger && profileMenu) {
      let isOpen = false;

      function openMenu() {
        profileMenu.classList.remove("opacity-0", "translate-y-2", "pointer-events-none");
        profileMenu.setAttribute("aria-hidden", "false");
        isOpen = true;
      }

      function closeMenu() {
        profileMenu.classList.add("opacity-0", "translate-y-2", "pointer-events-none");
        profileMenu.setAttribute("aria-hidden", "true");
        isOpen = false;
      }

      // Desktop hover handling
      profileTrigger.addEventListener("mouseenter", openMenu);
      profileBridge?.addEventListener("mouseenter", openMenu);
      profileTrigger.addEventListener("mouseleave", () => {
        setTimeout(() => {
          if (!profileMenu.matches(":hover")) closeMenu();
        }, 200);
      });
      profileMenu.addEventListener("mouseleave", closeMenu);
    }
  });

// Load Popup Modals
fetch("includes/popupmodals.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("modals").innerHTML = data;

    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember");

    // === Load remembered email on modal open ===
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      emailInput.value = savedEmail;
      rememberCheckbox.checked = true;
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const remember = rememberCheckbox.checked;

        try {
          const res = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, remember })
          });

          if (res.ok) {
            // ✅ Save email if "Remember me" checked
            if (remember) {
              localStorage.setItem("rememberedEmail", email);
            } else {
              localStorage.removeItem("rememberedEmail");
            }

            closeLoginModal();
            window.location.reload(); // or redirect to dashboard
          } else {
            alert("Login failed.");
          }
        } catch (err) {
          console.error("Login error:", err);
        }
      });
    }
  });

