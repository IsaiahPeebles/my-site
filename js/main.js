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

// Nav icons: line icons that animate on hover
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const doodles = {
  "about.html": {
    art: `
      <g class="eye-pair">
        <rect class="is-paper" x="5" y="10" width="10" height="17" rx="5" />
        <rect class="is-paper" x="17" y="10" width="10" height="17" rx="5" />
        <g class="pupils">
          <circle class="is-solid" cx="10" cy="18.5" r="2.5" />
          <circle class="is-solid" cx="22" cy="18.5" r="2.5" />
        </g>
      </g>
      <g class="brows">
        <path d="M5.5 5.5L13 4.5" />
        <path d="M19 4.5l7.5 1" />
      </g>`,
    setup(svg) {
      const pupils = svg.querySelector(".pupils");
      if (!finePointer) return;
      // The eyes keep watching the pointer, anywhere on the page
      document.addEventListener("pointermove", (event) => {
        const box = svg.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const reach = Math.min(1, Math.hypot(dx, dy) / 120);
        const angle = Math.atan2(dy, dx);
        pupils.style.transform =
          `translate(${(Math.cos(angle) * 1.6 * reach).toFixed(2)}px, ${(Math.sin(angle) * 4.5 * reach).toFixed(2)}px)`;
      }, { passive: true });
    },
    play(svg) {
      const eyes = svg.querySelector(".eye-pair");
      eyes.style.transformOrigin = "16px 18.5px";
      eyes.animate(
        [{ transform: "scaleY(1)" }, { transform: "scaleY(0.08)" }, { transform: "scaleY(1)" }],
        { duration: 220, easing: "ease-in-out" }
      );
      if (!finePointer) {
        // No hover to hold the brows up, so raise them for the glance
        svg.querySelector(".brows").animate(
          [
            { transform: "translateY(0)" },
            { transform: "translateY(-2.5px)", offset: 0.2 },
            { transform: "translateY(-2.5px)", offset: 0.8 },
            { transform: "translateY(0)" },
          ],
          { duration: 1300, delay: 150, easing: "ease-in-out" }
        );
        svg.querySelector(".pupils").animate(
          [
            { transform: "translate(0, 0)" },
            { transform: "translate(-1.6px, 0)", offset: 0.3 },
            { transform: "translate(1.6px, -1px)", offset: 0.7 },
            { transform: "translate(0, 0)" },
          ],
          { duration: 1100, delay: 250, easing: "ease-in-out" }
        );
      }
      return 1500;
    },
  },

  "projects.html": {
    art: `
      <g class="hammer" style="transform-origin: 16px 28px">
        <rect class="is-paper" x="14.5" y="13" width="3" height="15" rx="1.5" />
        <rect class="is-paper" x="8" y="6" width="16" height="7" rx="1.5" />
      </g>
      <g class="sparks is-hidden">
        <path d="M27.5 5.5l2.5-2.5" />
        <path d="M28.5 10h3.5" />
        <path d="M27.5 14.5l2.5 2.5" />
      </g>`,
    play(svg, link) {
      const swing = 560;
      const impact = swing * 0.6;
      svg.querySelector(".hammer").animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-40deg)", offset: 0.45, easing: "ease-in" },
          { transform: "rotate(24deg)", offset: 0.6, easing: "ease-out" },
          { transform: "rotate(16deg)", offset: 0.7, easing: "ease-in-out" },
          { transform: "rotate(0deg)" },
        ],
        { duration: swing }
      );
      setTimeout(() => {
        svg.querySelector(".sparks").animate(
          [{ opacity: 1, transform: "translate(0, 0)" }, { opacity: 0, transform: "translate(2px, 0)" }],
          { duration: 260, easing: "ease-out" }
        );
        // The hit knocks the letters loose, hardest at the front
        link.querySelectorAll(".doodle-label > span").forEach((letter, i) => {
          const force = Math.max(0.25, 1 - i * 0.12);
          const jolt = (min, max) => (min + Math.random() * (max - min)) * force;
          letter.animate(
            [
              { transform: `translate(${jolt(1, 3)}px, ${-jolt(1.5, 4)}px) rotate(${jolt(-12, 12)}deg)` },
              { transform: "none" },
            ],
            { duration: 380, delay: i * 18, easing: "cubic-bezier(0.3, 1.6, 0.5, 1)" }
          );
        });
      }, impact);
      return 900;
    },
  },

  "contact.html": {
    art: `
      <path class="heart is-solid is-hidden" d="M16 20l-4.6-4.6a2.9 2.9 0 0 1 4.1-4.1l.5.5.5-.5a2.9 2.9 0 0 1 4.1 4.1z" />
      <rect class="is-paper" x="4" y="8" width="24" height="17" rx="2.5" />
      <path class="flap" style="transform-origin: 16px 9px" d="M4.5 9.5L16 17.5l11.5-8" />`,
    play(svg) {
      svg.querySelector(".flap").animate(
        [
          { transform: "scaleY(1)" },
          { transform: "scaleY(-0.9)", offset: 0.22, easing: "ease-out" },
          { transform: "scaleY(-0.9)", offset: 0.75 },
          { transform: "scaleY(1)" },
        ],
        { duration: 1250, easing: "ease-in-out" }
      );
      svg.querySelector(".heart").animate(
        [
          { opacity: 0, transform: "translate(0, 0) scale(0.6)" },
          { opacity: 1, transform: "translate(0, -13px) scale(1.25)", offset: 0.5, easing: "ease-out" },
          { opacity: 0, transform: "translate(1px, -19px) scale(1.1)" },
        ],
        { duration: 900, delay: 220, easing: "ease-in", fill: "none" }
      );
      svg.querySelector(".heart").style.transformOrigin = "16px 15px";
      return 1500;
    },
  },

  "assets/resume.pdf": {
    art: `
      <g class="arrow">
        <path class="arrow-shaft doodle-draw" pathLength="1" d="M16 4v16" />
        <path class="arrow-head doodle-draw" pathLength="1" d="M9.5 13.5L16 20l6.5-6.5" />
      </g>
      <path d="M5 22v3a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3v-3" />`,
    play(svg) {
      const draw = (el, delay, duration) =>
        el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration, delay, easing: "ease-in-out", fill: "backwards",
        });
      draw(svg.querySelector(".arrow-shaft"), 0, 320);
      draw(svg.querySelector(".arrow-head"), 260, 220);
      svg.querySelector(".arrow").animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(2.5px)" }, { transform: "translateY(0)" }],
        { duration: 360, delay: 520, easing: "ease-in-out" }
      );
      return 1400;
    },
  },
};

const doodleLinks = [...document.querySelectorAll(".site-nav a")].filter(
  (link) => doodles[link.getAttribute("href")]
);

if (doodleLinks.length) {
  const svgNS = "http://www.w3.org/2000/svg";

  doodleLinks.forEach((link) => {
    const doodle = doodles[link.getAttribute("href")];

    // Split the label into letters so animations can knock them around
    const text = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (text) {
      const label = document.createElement("span");
      label.className = "doodle-label";
      for (const ch of text.textContent.trim()) {
        if (ch === " ") {
          label.append(ch);
          continue;
        }
        const letter = document.createElement("span");
        letter.textContent = ch;
        label.append(letter);
      }
      text.replaceWith(label);
    }

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "doodle");
    svg.setAttribute("viewBox", "0 0 32 32");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.innerHTML = doodle.art;
    link.classList.add("has-doodle");
    link.prepend(svg);

    if (reduceMotion) return;
    doodle.setup?.(svg);

    let hovering = false;
    let timer = 0;

    function cycle() {
      const wait = doodle.play(svg, link);
      timer = setTimeout(() => (hovering ? cycle() : stop()), wait);
    }

    function stop() {
      timer = 0;
    }

    function start() {
      hovering = true;
      if (!timer) cycle();
    }

    link.addEventListener("pointerenter", start);
    link.addEventListener("focus", start);
    link.addEventListener("pointerleave", () => (hovering = false));
    link.addEventListener("blur", () => (hovering = false));
    // Touch has no hover, so play once when the menu opens
    link.addEventListener("doodle:once", () => {
      if (timer) return;
      hovering = false;
      cycle();
    });
  });

  if (navToggle && !reduceMotion) {
    navToggle.addEventListener("click", () => {
      if (!siteNav.classList.contains("is-open")) return;
      doodleLinks.forEach((link, i) =>
        setTimeout(() => link.dispatchEvent(new Event("doodle:once")), 120 + i * 140)
      );
    });
  }
}

// Brand: the name decodes itself, letter by letter
const brand = document.querySelector(".brand");

if (brand && !reduceMotion) {
  const glyphs = "01<>/{}[]#*_=+";
  const name = brand.textContent.trim();
  brand.setAttribute("aria-label", name);
  brand.textContent = "";

  const letters = [...name].map((ch) => {
    if (ch === " ") {
      brand.append(ch);
      return null;
    }
    const span = document.createElement("span");
    span.className = "brand-letter";
    span.textContent = ch;
    span.setAttribute("aria-hidden", "true");
    brand.append(span);
    return { span, ch };
  }).filter(Boolean);

  // Lock each slot to its real letter's width so the centered name holds still
  function lockWidths() {
    if (running) return;
    letters.forEach(({ span }) => (span.style.width = ""));
    letters.forEach(({ span }) => (span.style.width = `${span.getBoundingClientRect().width}px`));
  }
  document.fonts.ready.then(lockWidths);
  window.addEventListener("resize", lockWidths, { passive: true });

  let running = 0;

  function decode() {
    if (running) return;
    const start = performance.now();
    let lastSwap = 0;

    running = requestAnimationFrame(function step(now) {
      const elapsed = now - start;
      const swap = now - lastSwap > 50;
      if (swap) lastSwap = now;
      let done = true;

      letters.forEach(({ span, ch }, i) => {
        const settled = elapsed > 180 + i * 45;
        if (settled) {
          if (span.textContent !== ch) {
            span.textContent = ch;
            span.classList.remove("is-scrambled");
          }
          return;
        }
        done = false;
        if (swap) {
          span.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
          span.classList.add("is-scrambled");
        }
      });

      running = done ? 0 : requestAnimationFrame(step);
    });
  }

  brand.addEventListener("pointerenter", decode);
  brand.addEventListener("focus", decode);

  // Play once on the first page of a visit
  let seen = false;
  try {
    seen = sessionStorage.getItem("brand-decoded") === "1";
    sessionStorage.setItem("brand-decoded", "1");
  } catch {}
  if (!seen) {
    if (document.prerendering) {
      document.addEventListener("prerenderingchange", () => setTimeout(decode, 200), { once: true });
    } else {
      document.fonts.ready.then(() => setTimeout(decode, 200));
    }
  }
}

// Colophon: word count and reading time for this page
const colophon = document.querySelector("[data-colophon]");
const mainContent = document.querySelector("main");

if (colophon && mainContent) {
  const words = mainContent.innerText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 230));
  colophon.textContent = `This page: ${words.toLocaleString()} words, ${minutes}-minute read.`;
}

// Hero art in 3D: load the WebGL scene once the page has settled. The SVG
// stays up until the first frame, and for good if anything fails.
const art3d = document.querySelector(".hero-art-3d");

if (art3d && !reduceMotion) {
  const load = () =>
    import("./hero3d.js?v=20")
      .then((mod) => mod.start(art3d))
      .catch(() => art3d.remove());
  const whenIdle = () =>
    "requestIdleCallback" in window ? requestIdleCallback(load, { timeout: 2000 }) : setTimeout(load, 300);

  if (document.prerendering) {
    document.addEventListener("prerenderingchange", whenIdle, { once: true });
  } else if (document.readyState === "complete") {
    whenIdle();
  } else {
    window.addEventListener("load", whenIdle, { once: true });
  }
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
