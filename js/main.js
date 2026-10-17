// Mobile navigation
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

function setNavOpen(isOpen) {
  siteNav.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    setNavOpen(!siteNav.classList.contains("is-open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
      setNavOpen(false);
      navToggle.focus();
    }
  });
}

// Copy email address
const copyButton = document.querySelector(".copy-email");
const copyStatus = document.querySelector(".copy-status");

if (copyButton && copyStatus) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copy);
      copyStatus.textContent = "Copied to your clipboard.";
    } catch {
      copyStatus.textContent = "Couldn't copy. Select the address above instead.";
    }
  });
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Code-to-document demos: play once when scrolled into view
function playDemo(demo) {
  const lines = [...demo.querySelectorAll(".line")];
  let i = 0;

  function next() {
    if (i >= lines.length) {
      setTimeout(() => demo.classList.add("is-done"), 300);
      return;
    }
    const line = lines[i++];
    line.classList.add("is-shown");

    if (line.hasAttribute("data-type")) {
      const full = line.textContent;
      let n = 0;
      line.textContent = "";
      line.classList.add("is-typing");
      const timer = setInterval(() => {
        line.textContent = full.slice(0, ++n);
        if (n >= full.length) {
          clearInterval(timer);
          line.classList.remove("is-typing");
          setTimeout(next, 350);
        }
      }, 28);
    } else {
      setTimeout(next, 260);
    }
  }
  next();
}

const demos = document.querySelectorAll("[data-demo]");

if (demos.length && !reduceMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        playDemo(entry.target);
      }
    });
  }, { threshold: 0.4 });

  demos.forEach((demo) => {
    demo.classList.add("is-armed");
    observer.observe(demo);
  });
}

// Colophon: word count and reading time for this page
const colophon = document.querySelector("[data-colophon]");
const mainContent = document.querySelector("main");

if (colophon && mainContent) {
  const words = mainContent.innerText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 230));
  colophon.textContent = `Built with plain HTML, CSS, and JavaScript. No frameworks. This page: ${words.toLocaleString()} words, ${minutes}-minute read.`;
}

// Hero grid: the vanishing point follows the pointer
const heroGrid = document.querySelector(".hero-grid");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (heroGrid && finePointer && !reduceMotion) {
  const hero = heroGrid.closest(".hero");
  const path = heroGrid.querySelector("path");
  const W = 1600;
  const H = 900;
  const depths = [60, 150, 230, 300, 360, 410];
  const edgeYs = [-300, 0, 150, 300, 600, 750, 900, 1200];
  const edgeXs = [200, 500, 1100, 1400];
  const current = { x: W / 2, y: H / 2 };
  const target = { x: W / 2, y: H / 2 };
  let frame = 0;

  function draw() {
    const { x, y } = current;
    let d = "";
    // Wall lines keep their depth as the vanishing point moves
    depths.forEach((depth) => {
      const left = (x * depth) / (W / 2);
      const right = W - ((W - x) * depth) / (W / 2);
      d += `M${left.toFixed(1)} 0V${H}M${right.toFixed(1)} 0V${H}`;
    });
    d += `M0 ${y.toFixed(1)}H${W}`;
    const vp = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    edgeYs.forEach((ey) => {
      d += `${vp}L0 ${ey}${vp}L${W} ${ey}`;
    });
    edgeXs.forEach((ex) => {
      d += `${vp}L${ex} 0${vp}L${ex} ${H}`;
    });
    path.setAttribute("d", d);
    heroGrid.style.setProperty("--vx", `${(x / W) * 100}%`);
    heroGrid.style.setProperty("--vy", `${(y / H) * 100}%`);
  }

  function tick() {
    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;
    draw();
    const settled = Math.abs(target.x - current.x) < 0.5 && Math.abs(target.y - current.y) < 0.5;
    frame = settled ? 0 : requestAnimationFrame(tick);
  }

  function aim(x, y) {
    target.x = x;
    target.y = y;
    if (!frame) frame = requestAnimationFrame(tick);
  }

  hero.addEventListener("pointermove", (event) => {
    const box = hero.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    // Move part of the way toward the pointer so the effect stays subtle
    aim(W / 2 + px * W * 0.35, H / 2 + py * H * 0.35);
  });

  hero.addEventListener("pointerleave", () => aim(W / 2, H / 2));
}
