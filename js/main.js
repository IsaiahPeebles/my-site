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

// Hero field: a rolling landscape of dots that swells under the pointer
const field = document.querySelector(".hero-field");

if (field && field.getContext) {
  const hero = field.closest(".hero");
  const ctx = field.getContext("2d");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const animate = !reduceMotion;

  const near = 2;
  const far = 34;
  const colStep = 1.6; // width between front-to-back lines
  let w = 0;
  let h = 0;
  let horizon = 0;
  let focal = 0;
  let camHeight = 0;

  const cam = { x: 0, target: 0 };
  const swell = { x: 0, z: 10, tx: 0, tz: 10, strength: 0, target: 0 };
  let visible = true;
  let frame = 0;
  let start = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth;
    h = hero.clientHeight;
    field.width = Math.round(w * dpr);
    field.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    horizon = h * 0.68;
    focal = h * 0.9;
    // The nearest row lands on the bottom edge
    camHeight = ((h - horizon) * near) / focal;
    if (!frame) draw(performance.now());
  }

  function height(x, z, t) {
    let y =
      0.16 * Math.sin(x * 0.32 + t * 0.5) * Math.cos(z * 0.22 - t * 0.35) +
      0.09 * Math.sin(x * 0.75 - z * 0.4 + t * 0.8) +
      0.05 * Math.sin(z * 0.9 + t * 0.6);
    y *= Math.min(1, z / 6) + 0.3; // calmer up close, hillier far away
    if (swell.strength > 0.001) {
      const dx = x - swell.x;
      const dz = z - swell.z;
      y += 0.22 * swell.strength * Math.exp(-(dx * dx + dz * dz) / 5);
    }
    return y * camHeight * 2.2;
  }

  function dot(x, z, t, boost = 1) {
    const y = height(x, z, t);
    const sx = w / 2 + ((x - cam.x) * focal) / z;
    if (sx < -2 || sx > w + 2) return;
    const sy = horizon + ((camHeight - y) * focal) / z;
    const depth = 1 - (z - near) / (far - near);
    const crest = Math.max(0, y / (camHeight * 0.6));
    ctx.globalAlpha = Math.min(1, depth ** 2.6 * (0.5 + crest) * boost);
    const size = z < 6 ? 1.6 : 1.2;
    ctx.fillRect(sx, sy, size, size);
  }

  function draw(now) {
    const t = animate ? (now - start) / 1000 : 0;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";

    // Rows: closer together in depth up front so they look evenly spaced
    for (let z = near; z <= far; z += 0.1 + z * 0.035) {
      const half = ((w / 2) * z) / focal + 1;
      const step = (4 * z) / focal;
      for (let x = cam.x - half; x <= cam.x + half; x += step) dot(x, z, t);
    }

    // Columns running into the distance
    const reach = ((w / 2) * far) / focal;
    const first = Math.ceil((cam.x - reach) / colStep) * colStep + colStep / 2;
    for (let x = first; x <= cam.x + reach; x += colStep) {
      for (let z = near; z <= far; z += 0.03 + z * 0.006) dot(x, z, t, 1.4);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    cam.x += (cam.target - cam.x) * 0.05;
    swell.x += (swell.tx - swell.x) * 0.08;
    swell.z += (swell.tz - swell.z) * 0.08;
    swell.strength += (swell.target - swell.strength) * 0.05;
    draw(now);
    frame = visible ? requestAnimationFrame(loop) : 0;
  }

  resize();
  new ResizeObserver(resize).observe(hero);

  if (animate) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(loop);
    }).observe(hero);

    if (finePointer) {
      hero.addEventListener("pointermove", (event) => {
        const box = hero.getBoundingClientRect();
        const sx = event.clientX - box.left;
        const sy = event.clientY - box.top;
        cam.target = ((sx / w) - 0.5) * 3;
        // Find the spot on the ground under the pointer
        const below = Math.max(sy - horizon, 8);
        swell.tz = Math.min(far * 0.6, Math.max(5, (camHeight * focal) / below));
        swell.tx = cam.x + ((sx - w / 2) * swell.tz) / focal;
        swell.target = sy > horizon - 40 ? 1 : 0.4;
      });

      hero.addEventListener("pointerleave", () => {
        cam.target = 0;
        swell.target = 0;
      });
    }
  }
}
