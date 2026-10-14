// @env browser
// Page behaviour for labb5.html, inlined by build_labb5.py: starts the 3D breadboards and links each schematic to its
// breadboard, so hovering a part's label in one highlights the part in the other.

const root = document.documentElement;

// Each circuit section: its board model, schematic labels, SVG breadboard and (once mounted) 3D controller.
const sections = [...document.querySelectorAll("section.circuit")].map((section) => {
  const stage = section.querySelector(".stage[data-model]");
  const model = JSON.parse(document.getElementById(stage.dataset.model).textContent);
  const keysByName = new Map();
  for (const tag of model.tags) {
    keysByName.set(tag.name, [...(keysByName.get(tag.name) || []), tag.key]);
  }
  const schematic = section.querySelector("figure .drawing:not(.view-iso) svg");
  const svgBoard = section.querySelector(".view-iso svg");
  const board = { stage, model, controller: null };

  // A schematic label refers to a tag when its first word is the tag's name ("C1 10 µF" → C1). Labels can't tell
  // which of two same-named parts they mean (the astable's two R1s), so they light up all of them.
  const refs = [...schematic.querySelectorAll("text")].filter((text) => {
    const name = text.textContent.trim().split(/\s+/)[0];
    if (!keysByName.has(name)) {
      return false;
    }
    text.dataset.ref = name;
    text.classList.add("sch-ref");
    return true;
  });
  const markSchematic = (name) => {
    for (const text of refs) {
      text.classList.toggle("is-hot", text.dataset.ref === name);
    }
  };
  const markBoard = (keys) => {
    board.controller?.highlight(keys);
    for (const part of svgBoard.querySelectorAll(".part[data-part]")) {
      part.classList.toggle("xhl", keys.includes(part.dataset.part));
    }
  };

  for (const text of refs) {
    text.addEventListener("pointerenter", () => {
      markSchematic(text.dataset.ref);
      markBoard(keysByName.get(text.dataset.ref));
    });
    text.addEventListener("pointerleave", () => {
      markSchematic(null);
      markBoard([]);
    });
  }
  // Breadboard → schematic, from the 3D tags (tag-hover events from the viewer) and from the SVG fallback's tags.
  section.addEventListener("tag-hover", (event) => markSchematic(event.detail?.name ?? null));
  for (const pill of svgBoard.querySelectorAll(".pill[data-for]")) {
    const name = pill.querySelector("text").textContent;
    for (const type of ["pointerenter", "focusin"]) {
      pill.addEventListener(type, () => markSchematic(name));
    }
    for (const type of ["pointerleave", "focusout"]) {
      pill.addEventListener(type, () => markSchematic(null));
    }
  }
  return board;
});

// Circuit nav: the link for the section in view is highlighted. Where CSS scroll markers are supported
// (scroll-target-group), :target-current does that natively and this only mirrors it into aria-current for screen
// readers once scrolling settles. Elsewhere, an IntersectionObserver tracks the section crossing the middle of the
// viewport and sets the .\:target-current class that page-head.html styles the same way.
const navLinks = [...document.querySelectorAll("nav.jump a")];
const markCurrent = (link) => {
  for (const other of navLinks) {
    other.classList.toggle(":target-current", other === link);
    if (other === link) {
      other.setAttribute("aria-current", "true");
    } else {
      other.removeAttribute("aria-current");
    }
  }
};
if (CSS.supports("scroll-target-group: auto")) {
  const sync = () => {
    const current = document.querySelector("nav.jump a:target-current");
    for (const link of navLinks) {
      if (link === current) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  };
  // The browser updates :target-current on the frame after scrolling, so read it a couple of frames later; scrollend
  // (and page load) fire before that.
  const syncSoon = () => requestAnimationFrame(() => requestAnimationFrame(sync));
  syncSoon();
  document.addEventListener("scrollend", syncSoon);
} else {
  const byId = new Map(navLinks.map((link) => [link.hash.slice(1), link]));
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        markCurrent(byId.get(entry.target.id));
      }
    }
  }, { rootMargin: "-50% 0px -50% 0px" });
  for (const id of byId.keys()) {
    const section = document.getElementById(id);
    if (section) {
      spy.observe(section);
    }
  }
}

// Full screen: the caption button expands its figure. The Fullscreen API is used where elements support it; iPhone
// Safari has none, so there the figure becomes a fixed overlay instead. Either way the figure gets .is-full, which
// page-head.html styles, and a 3D board switches to one-finger orbit.
const boardByFigure = new Map(sections.map((board) => [board.stage.closest("figure"), board]));
let expanded = null;
const setExpanded = (figure, on) => {
  figure.classList.toggle("is-full", on);
  figure.querySelector(".fs-toggle span").textContent = on ? "Close" : "Full screen";
  boardByFigure.get(figure)?.controller?.setExpanded(on);
  for (const drawing of figure.querySelectorAll(".drawing:not(.view-3d)")) {
    zoomByDrawing.get(drawing)?.reset();
  }
  expanded = on ? figure : null;
};

// Full-screen drawings (schematics, the SVG breadboard fallback) zoom and pan: pinch or the wheel zooms, a drag pans,
// a double tap zooms in on that spot or back out. The SVG is transformed inside its box, never smaller than fitted and
// never pulled off an edge.
const MAX_ZOOM = 8;
const zoomable = (drawing) => {
  const svg = drawing.querySelector("svg");
  const pointers = new Map();
  let scale = 1;
  let x = 0;
  let y = 0;
  let lastTap = null;
  const apply = () => {
    const { width, height } = drawing.getBoundingClientRect();
    scale = Math.min(MAX_ZOOM, Math.max(1, scale));
    x = Math.min(0, Math.max(width * (1 - scale), x));
    y = Math.min(0, Math.max(height * (1 - scale), y));
    svg.style.transform = scale === 1 ? "" : `translate(${x}px, ${y}px) scale(${scale})`;
  };
  // Zoom by factor about a point given in the drawing box's coordinates, keeping that point still.
  const zoomAt = (factor, px, py) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, scale * factor));
    x = px - ((px - x) * next) / scale;
    y = py - ((py - y) * next) / scale;
    scale = next;
    apply();
  };
  const local = (event) => {
    const box = drawing.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  };
  // Centre and spread of the pointers currently down.
  const span = () => {
    const points = [...pointers.values()];
    const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    const dist = points.length > 1 ? Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]) : 0;
    return { cx, cy, dist };
  };
  const active = () => drawing.closest("figure") === expanded;

  drawing.addEventListener("pointerdown", (event) => {
    if (!active() || event.button !== 0) {
      return;
    }
    drawing.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, local(event));
  });
  drawing.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    const before = span();
    pointers.set(event.pointerId, local(event));
    const after = span();
    x += after.cx - before.cx;
    y += after.cy - before.cy;
    if (before.dist && after.dist) {
      zoomAt(after.dist / before.dist, after.cx, after.cy);
    } else {
      apply();
    }
  });
  const release = (event) => {
    if (!pointers.delete(event.pointerId) || event.type !== "pointerup" || pointers.size) {
      return;
    }
    // Double tap: two quick taps close together.
    const [px, py] = local(event);
    const now = event.timeStamp;
    if (lastTap && now - lastTap.time < 300 && Math.hypot(px - lastTap.x, py - lastTap.y) < 24) {
      if (scale > 1) {
        scale = 1;
        apply();
      } else {
        zoomAt(2.5, px, py);
      }
      lastTap = null;
    } else {
      lastTap = { time: now, x: px, y: py };
    }
  };
  drawing.addEventListener("pointerup", release);
  drawing.addEventListener("pointercancel", release);
  drawing.addEventListener("wheel", (event) => {
    if (!active()) {
      return;
    }
    event.preventDefault();
    const [px, py] = local(event);
    zoomAt(Math.exp(-event.deltaY * 0.002), px, py);
  }, { passive: false });
  return {
    reset() {
      pointers.clear();
      scale = 1;
      x = 0;
      y = 0;
      svg.style.transform = "";
    },
  };
};
const zoomByDrawing = new Map([...document.querySelectorAll("figure .drawing:not(.view-3d)")].map((drawing) => [drawing, zoomable(drawing)]));
const toggleExpanded = async (figure) => {
  if (expanded === figure) {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      setExpanded(figure, false);
    }
    return;
  }
  if (document.fullscreenEnabled) {
    try {
      await figure.requestFullscreen({ navigationUI: "hide" });
      return;
    } catch {
      // Refused (e.g. inside an iframe without permission): fall through to the overlay.
    }
  }
  setExpanded(figure, true);
};
document.addEventListener("fullscreenchange", () => {
  const current = document.fullscreenElement;
  if (expanded && expanded !== current) {
    setExpanded(expanded, false);
  }
  if (current?.classList.contains("fs-target")) {
    setExpanded(current, true);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && expanded && !document.fullscreenElement) {
    setExpanded(expanded, false);
  }
});
for (const button of document.querySelectorAll(".fs-toggle")) {
  const figure = button.closest("figure");
  figure.classList.add("fs-target");
  button.hidden = false;
  button.addEventListener("click", () => toggleExpanded(figure));
}

// Breadboards are shown in 3D. The isometric SVG is the fallback: it shows by default (no JavaScript), and the page only
// switches to 3D ("has-3d") when WebGL is available. If three.js can't load (offline) the whole page falls back; if a
// single board can't get a WebGL context, just that figure does. Printing always uses the SVG (see page-head.html).
// The viewer is inlined as text and imported from a blob URL so the page stays a single file; the import map still
// resolves "three". Each board mounts as it nears the viewport.
if (document.createElement("canvas").getContext("webgl2")) {
  root.classList.add("has-3d");
  try {
    const source = new Blob([document.getElementById("viewer-src").textContent], { type: "text/javascript" });
    const { mountBoard } = await import(URL.createObjectURL(source));
    const byStage = new Map(sections.map((board) => [board.stage, board]));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        observer.unobserve(entry.target);
        const board = byStage.get(entry.target);
        board.controller = mountBoard(board.stage, board.model);
        const figure = board.stage.closest("figure");
        if (!board.controller) {
          figure.classList.add("fallback");
        } else if (figure === expanded) {
          board.controller.setExpanded(true);
        }
      }
    }, { rootMargin: "400px 0px" });
    sections.forEach((board) => observer.observe(board.stage));
  } catch {
    root.classList.remove("has-3d");
  }
}
