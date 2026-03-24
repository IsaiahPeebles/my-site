const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const currentPage = document.body.dataset.page;

if (currentPage) {
  document.querySelectorAll(".site-nav a").forEach((link) => {
    const href = link.getAttribute("href");

    if (
      (currentPage === "home" && href === "index.html") ||
      (currentPage === "about" && href === "about.html") ||
      (currentPage === "projects" && href === "projects.html") ||
      (currentPage === "contact" && href === "contact.html")
    ) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
}
