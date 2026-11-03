const header = document.querySelector(".site-header");
const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");

function setMenu(open) {
  if (!toggle) return;
  toggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("nav-open", open);
  const label = toggle.querySelector(".sr-only");
  if (label) label.textContent = open ? "Close menu" : "Menu";
}

toggle?.addEventListener("click", () => {
  setMenu(toggle.getAttribute("aria-expanded") !== "true");
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

document.querySelectorAll(".menu").forEach((menu) => {
  const button = menu.querySelector(".menu-btn");
  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = menu.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(open));
  });
  menu.addEventListener("click", (event) => event.stopPropagation());
});

document.addEventListener("click", () => {
  document.querySelectorAll(".menu.is-open").forEach((menu) => {
    menu.classList.remove("is-open");
    menu.querySelector(".menu-btn")?.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  setMenu(false);
  document.querySelectorAll(".menu.is-open").forEach((menu) => {
    menu.classList.remove("is-open");
    menu.querySelector(".menu-btn")?.setAttribute("aria-expanded", "false");
  });
});

if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 6);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-in"));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16 });
  revealItems.forEach((item) => observer.observe(item));
}

const parallax = document.querySelector("[data-parallax]");
if (parallax && !reduceMotion && window.matchMedia("(min-width: 1024px)").matches) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const shift = Math.min(window.scrollY, 480) * 0.05;
      parallax.style.transform = `translateY(${shift}px)`;
      ticking = false;
    });
  }, { passive: true });
}

const dialog = document.querySelector("#story-dialog");
if (dialog) {
  document.querySelectorAll("[data-story]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".story-card");
      const title = card.querySelector("h2, h3")?.textContent.trim() || "Story";
      const blurb = card.querySelector(".story-blurb")?.textContent.trim() || "";
      dialog.querySelector("#story-dialog-title").textContent = title;
      dialog.querySelector(".story-dialog-copy").textContent = blurb;
      const art = dialog.querySelector(".story-dialog-art");
      const source = card.querySelector(".story-art");
      art.replaceChildren(source ? source.cloneNode(true) : document.createTextNode(""));
      dialog.showModal();
    });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
}
