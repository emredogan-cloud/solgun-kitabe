/* ════════════════════════════════════════════════════════════════
   app.js — Üst denetleyici
   Motoru başlatır, kapılar, chrome düğmeleri, klavye, kaydırma,
   tema değişimi, yazı ölçeklemesi, kan-iz şeridi.
   ════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    const NS = window.KODEKS;
    const Storage = NS.Storage;

    const $ = (sel, scope = document) => scope.querySelector(sel);
    const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

    const dom = {
        html: document.documentElement,
        body: document.body,
        loader: $("#loader"),
        bookEl: $("#book"),
        pagesEl: $("#book-pages"),
        ribbon: $("#book-ribbon"),

        edgePrev: $("#edge-prev"),
        edgeNext: $("#edge-next"),
        btnPrev: $("#btn-prev"),
        btnNext: $("#btn-next"),

        btnToc: $("#btn-toc"),
        btnBookmark: $("#btn-bookmark"),
        btnBookmarks: $("#btn-bookmarks"),
        btnTheme: $("#btn-theme"),
        btnFont: $("#btn-font"),
        btnPerf: $("#btn-perf"),
        btnFullscreen: $("#btn-fullscreen"),
        btnPrint: $("#btn-print"),

        chapterLabel: $("#chapter-label"),
        progressFill: $("#progress-fill"),
        pageCurrent: $("#page-current"),
        pageTotal: $("#page-total"),

        tocDrawer: $("#toc-drawer"),
        tocFilters: $("#toc-filters"),
        tocList: $("#toc-list"),
        tocSearch: $("#toc-search"),

        bmDrawer: $("#bookmarks-drawer"),
        bmList: $("#bookmarks-list"),

        toast: $("#toast"),
        hint: $("#hint")
    };

    const THEMES = ["hisar", "kulgun", "karaoz"];
    const THEME_LABELS = { hisar: "Hisâr", kulgun: "Külgün", karaoz: "Karaöz" };
    const TYPE_STEPS = [0.92, 1.0, 1.1, 1.22, 1.36];

    let engine = null;
    let activeFilter = "all";
    let toastTimer = null;

    // ──────────────────────────────────────────────────────────────
    // BOOT
    // ──────────────────────────────────────────────────────────────

    async function boot() {
        applyTheme(Storage.getTheme());
        applyTypeStep(Storage.getTypeStep());
        const initialPerf = dom.html.dataset.perf || "rich";
        dom.btnPerf.dataset.active = initialPerf === "lite" ? "true" : "false";

        try {
            if (document.fonts && document.fonts.ready) {
                await Promise.race([
                    document.fonts.ready,
                    new Promise(r => setTimeout(r, 2000))
                ]);
            }
        } catch (e) { /* */ }

        engine = new NS.BookEngine(dom.pagesEl);
        const loaderText = $(".loader__text");
        engine.onProgress = (done, total) => {
            if (loaderText) loaderText.textContent = `Mühür çözülüyor… ${done}/${total}`;
        };
        await engine.build();
        engine.onSpreadChange = handleSpreadChange;

        wireUI();

        const saved = Storage.getProgress();
        if (saved > 0 && saved < engine.getSpreadCount()) {
            await engine.goToSpread(saved);
        } else {
            handleSpreadChange(engine.getCurrentSpread());
        }

        renderTocDrawer();
        renderBookmarksDrawer();

        requestAnimationFrame(() => {
            dom.body.classList.remove("is-loading");
            if (!Storage.getFirstSeen()) {
                showHintBriefly();
                Storage.setFirstSeen(true);
            }
        });
    }

    // ──────────────────────────────────────────────────────────────
    // SPREAD DEĞİŞİMİ
    // ──────────────────────────────────────────────────────────────

    function handleSpreadChange(spreadIdx) {
        Storage.setProgress(spreadIdx);

        const total = engine.getSpreadCount();
        dom.pageCurrent.textContent = engine.getCurrentFolioRange();
        dom.pageTotal.textContent = (total - 1) + "";
        const pct = total > 1 ? (spreadIdx / (total - 1)) * 100 : 0;
        dom.progressFill.style.width = pct + "%";

        const label = engine.getCurrentChapterLabel() || NS.book.title;
        dom.chapterLabel.textContent = label;

        dom.btnPrev.disabled = spreadIdx <= 0;
        dom.btnNext.disabled = spreadIdx >= total - 1;
        dom.edgePrev.disabled = spreadIdx <= 0;
        dom.edgeNext.disabled = spreadIdx >= total - 1;

        const isBookmarked = Storage.hasBookmark(spreadIdx);
        dom.btnBookmark.dataset.active = isBookmarked ? "true" : "false";
        dom.ribbon.classList.toggle("is-visible", isBookmarked);

        $$(".drawer__entry", dom.tocList).forEach(el => {
            el.dataset.current = (Number(el.dataset.spread) === spreadIdx) ? "true" : "false";
        });
    }

    // ──────────────────────────────────────────────────────────────
    // UI BAĞLAMA
    // ──────────────────────────────────────────────────────────────

    function wireUI() {
        const goNext = () => engine && engine.next();
        const goPrev = () => engine && engine.prev();

        dom.btnNext.addEventListener("click", goNext);
        dom.btnPrev.addEventListener("click", goPrev);
        dom.edgeNext.addEventListener("click", e => { e.stopPropagation(); goNext(); });
        dom.edgePrev.addEventListener("click", e => { e.stopPropagation(); goPrev(); });

        dom.btnToc.addEventListener("click", () => openDrawer(dom.tocDrawer));
        dom.btnBookmarks.addEventListener("click", () => {
            renderBookmarksDrawer();
            openDrawer(dom.bmDrawer);
        });

        $$("[data-drawer-close]").forEach(el => {
            el.addEventListener("click", () => {
                const drawer = el.closest(".drawer");
                if (drawer) closeDrawer(drawer);
            });
        });

        dom.tocSearch.addEventListener("input", () => renderTocDrawer());

        dom.btnBookmark.addEventListener("click", () => {
            const idx = engine.getCurrentSpread();
            const label = engine.getCurrentChapterLabel();
            const added = Storage.toggleBookmark(idx, label);
            handleSpreadChange(idx);
            renderBookmarksDrawer();
            toast(added ? "Kan-iz düşüldü" : "İz kaldırıldı");
        });

        dom.btnTheme.addEventListener("click", () => {
            const cur = Storage.getTheme();
            const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
            applyTheme(next);
            Storage.setTheme(next);
            toast("Tema: " + (THEME_LABELS[next] || next));
        });

        dom.btnFont.addEventListener("click", async () => {
            const cur = Storage.getTypeStep();
            const next = (cur + 1) % TYPE_STEPS.length;
            applyTypeStep(next);
            Storage.setTypeStep(next);
            toast("Yazı boyutu: " + (next + 1) + "/" + TYPE_STEPS.length);
            await rebuildEngineAroundCurrentChapter();
        });

        dom.btnPerf.addEventListener("click", () => {
            const cur = dom.html.dataset.perf || "rich";
            const next = cur === "lite" ? "rich" : "lite";
            dom.html.dataset.perf = next;
            dom.btnPerf.dataset.active = next === "lite" ? "true" : "false";
            try { localStorage.setItem("solgun-kitabe:v1:perfMode", JSON.stringify(next)); } catch (e) { /* */ }
            toast(next === "lite" ? "Performans modu" : "Zengin görseller");
        });

        dom.btnFullscreen.addEventListener("click", toggleFullscreen);
        document.addEventListener("fullscreenchange", () => {
            dom.body.classList.toggle("is-fullscreen", !!document.fullscreenElement);
            dom.body.classList.toggle("is-immersive", !!document.fullscreenElement);
            dom.btnFullscreen.dataset.active = document.fullscreenElement ? "true" : "false";
        });

        dom.btnPrint.addEventListener("click", () => {
            toast("Kodeks hazırlanıyor…");
            setTimeout(() => NS.PdfExport.exportPDF(), 200);
        });

        document.addEventListener("keydown", onKey);

        wireSwipe();

        document.addEventListener("click", e => {
            const t = e.target.closest("[data-story-jump]");
            if (t && engine) {
                const id = t.dataset.storyJump;
                engine.goToEntry(id);
            }
        });
        document.addEventListener("keydown", e => {
            const t = e.target.closest("[data-story-jump]");
            if (t && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                engine.goToEntry(t.dataset.storyJump);
            }
        });

        dom.bookEl.addEventListener("click", () => dom.bookEl.focus());

        let resizePending = false;
        let lastWidth = window.innerWidth;
        let lastHeight = window.innerHeight;
        const requestIdle = window.requestIdleCallback ||
            (cb => setTimeout(() => cb({ timeRemaining: () => 16 }), 100));

        window.addEventListener("resize", () => {
            if (resizePending) return;
            const dw = Math.abs(window.innerWidth - lastWidth);
            const dh = Math.abs(window.innerHeight - lastHeight);
            if (dw < 80 && dh < 60) return;
            resizePending = true;
            requestIdle(async () => {
                lastWidth = window.innerWidth;
                lastHeight = window.innerHeight;
                await rebuildEngineAroundCurrentChapter();
                resizePending = false;
            });
        }, { passive: true });

        document.addEventListener("visibilitychange", () => {
            dom.body.classList.toggle("is-doc-hidden", document.hidden);
        });
    }

    async function rebuildEngineAroundCurrentChapter() {
        if (!engine) return;
        const currentLabel = engine.getCurrentChapterLabel();
        engine = new NS.BookEngine(dom.pagesEl);
        await engine.build();
        engine.onSpreadChange = handleSpreadChange;
        let restored = 0;
        for (let i = 0; i < engine.getSpreadCount(); i++) {
            const [li, ri] = engine.spreads[i];
            const lp = engine.pages[li];
            if (lp && lp.chapter === currentLabel) { restored = i; break; }
            if (ri !== null) {
                const rp = engine.pages[ri];
                if (rp && rp.chapter === currentLabel) { restored = i; break; }
            }
        }
        await engine.goToSpread(Math.min(restored, engine.getSpreadCount() - 1));
        renderTocDrawer();
        renderBookmarksDrawer();
    }

    // ──────────────────────────────────────────────────────────────
    // KLAVYE
    // ──────────────────────────────────────────────────────────────

    function onKey(e) {
        const tag = e.target && e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        switch (e.key) {
            case "ArrowRight":
            case "PageDown":
            case " ":
                e.preventDefault();
                engine && engine.next();
                break;
            case "ArrowLeft":
            case "PageUp":
                e.preventDefault();
                engine && engine.prev();
                break;
            case "Home":
                e.preventDefault();
                engine && engine.goToSpread(0);
                break;
            case "End":
                e.preventDefault();
                engine && engine.goToSpread(engine.getSpreadCount() - 1);
                break;
            case "f": case "F":
                openDrawer(dom.tocDrawer);
                break;
            case "k": case "K":
                dom.btnBookmark.click();
                break;
            case "i": case "İ": case "I":
                renderBookmarksDrawer();
                openDrawer(dom.bmDrawer);
                break;
            case "e": case "E":
                toggleFullscreen();
                break;
            case "t": case "T":
                dom.btnTheme.click();
                break;
            case "y": case "Y":
                dom.btnFont.click();
                break;
            case "d": case "D":
                dom.btnPrint.click();
                break;
            case "p": case "P":
                dom.btnPerf.click();
                break;
            case "Escape":
                closeAllDrawers();
                if (document.fullscreenElement) document.exitFullscreen();
                break;
        }
    }

    // ──────────────────────────────────────────────────────────────
    // KAYDIRMA
    // ──────────────────────────────────────────────────────────────

    function wireSwipe() {
        let startX = 0, startY = 0, tracking = false;
        const stage = $("#stage");
        stage.addEventListener("touchstart", e => {
            if (e.touches.length !== 1) return;
            tracking = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        stage.addEventListener("touchend", e => {
            if (!tracking) return;
            tracking = false;
            const t = e.changedTouches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                if (dx < 0) engine && engine.next();
                else engine && engine.prev();
            }
        });
    }

    // ──────────────────────────────────────────────────────────────
    // KAPILAR
    // ──────────────────────────────────────────────────────────────

    function openDrawer(drawer) {
        closeAllDrawers();
        drawer.setAttribute("aria-hidden", "false");
        const closeBtn = drawer.querySelector(".drawer__close");
        if (closeBtn) setTimeout(() => closeBtn.focus(), 250);
    }
    function closeDrawer(drawer) {
        drawer.setAttribute("aria-hidden", "true");
    }
    function closeAllDrawers() {
        $$(".drawer").forEach(d => d.setAttribute("aria-hidden", "true"));
    }

    // ──────────────────────────────────────────────────────────────
    // FİHRİST
    // ──────────────────────────────────────────────────────────────

    function renderTocDrawer() {
        if (!engine) return;
        const entries = NS.entries;
        const cats = NS.categories;
        const search = (dom.tocSearch.value || "").trim().toLowerCase();

        if (!dom.tocFilters.children.length) {
            const all = document.createElement("button");
            all.className = "drawer__filter";
            all.setAttribute("role", "tab");
            all.dataset.cat = "all";
            all.textContent = "Tümü";
            all.setAttribute("aria-selected", "true");
            all.addEventListener("click", () => {
                activeFilter = "all";
                renderTocDrawer();
            });
            dom.tocFilters.appendChild(all);

            cats.forEach(c => {
                const b = document.createElement("button");
                b.className = "drawer__filter";
                b.setAttribute("role", "tab");
                b.dataset.cat = c.id;
                b.textContent = c.name;
                b.setAttribute("aria-selected", "false");
                b.addEventListener("click", () => {
                    activeFilter = c.id;
                    renderTocDrawer();
                });
                dom.tocFilters.appendChild(b);
            });
        }

        $$(".drawer__filter", dom.tocFilters).forEach(b => {
            b.setAttribute("aria-selected", b.dataset.cat === activeFilter ? "true" : "false");
        });

        const ROMAN_ONES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
        const ROMAN_TENS = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"];
        const toRoman = n => n <= 0 ? "" : (n >= 100 ? "C" + toRoman(n - 100) : ROMAN_TENS[Math.floor(n / 10)] + ROMAN_ONES[n % 10]);
        const ROMAN = new Proxy({}, { get: (_, k) => toRoman(Number(k)) });

        const filtered = entries
            .map((s, i) => ({ s, i, num: ROMAN[i + 1] }))
            .filter(({ s }) => activeFilter === "all" || s.category === activeFilter)
            .filter(({ s }) => {
                if (!search) return true;
                const cat = NS.categoryById(s.category);
                const hay = [
                    s.title, s.subtitle, cat ? cat.full : "",
                    (s.themes || []).join(" ")
                ].join(" ").toLowerCase();
                return hay.includes(search);
            });

        dom.tocList.innerHTML = "";
        if (filtered.length === 0) {
            const empty = document.createElement("div");
            empty.className = "drawer__empty";
            empty.textContent = "Aranan kayıt bu arşivde yok.";
            dom.tocList.appendChild(empty);
            return;
        }

        const currentSpread = engine.getCurrentSpread();
        filtered.forEach(({ s, i, num }) => {
            const cat = NS.categoryById(s.category);
            const spread = engine.entryToSpread.get(s.id);
            const btn = document.createElement("button");
            btn.className = "drawer__entry";
            btn.dataset.spread = spread;
            btn.dataset.current = (spread === currentSpread) ? "true" : "false";
            btn.innerHTML = `
                <span class="drawer__entry-num">${num}.</span>
                <span class="drawer__entry-body">
                    <span class="drawer__entry-name">${escapeHtml(s.title)}</span>
                    <span class="drawer__entry-civ">${escapeHtml(cat ? cat.full : "")}</span>
                </span>
                <span class="drawer__entry-page">f. ${i + 1}</span>
            `;
            btn.addEventListener("click", async () => {
                closeDrawer(dom.tocDrawer);
                await engine.goToEntry(s.id);
            });
            dom.tocList.appendChild(btn);
        });
    }

    // ──────────────────────────────────────────────────────────────
    // KAN-İZLER
    // ──────────────────────────────────────────────────────────────

    function renderBookmarksDrawer() {
        const bms = Storage.getBookmarks();
        dom.bmList.innerHTML = "";
        if (!bms.length) {
            const empty = document.createElement("div");
            empty.className = "drawer__empty";
            empty.textContent = "Henüz hiçbir folyoya kan-iz düşülmemiş. K tuşuyla iz koyabilirsin.";
            dom.bmList.appendChild(empty);
            return;
        }
        const current = engine ? engine.getCurrentSpread() : -1;
        bms.forEach(bm => {
            const btn = document.createElement("button");
            btn.className = "drawer__entry";
            btn.dataset.spread = bm.spread;
            btn.dataset.current = bm.spread === current ? "true" : "false";
            const date = new Date(bm.ts || Date.now());
            const stamp = date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
            btn.innerHTML = `
                <span class="drawer__entry-num">◆</span>
                <span class="drawer__entry-body">
                    <span class="drawer__entry-name">${escapeHtml(bm.label || "Folyo")}</span>
                    <span class="drawer__entry-civ">Açılış ${bm.spread + 1} · ${escapeHtml(stamp)}</span>
                </span>
                <span class="drawer__entry-page">→</span>
            `;
            btn.addEventListener("click", async () => {
                closeDrawer(dom.bmDrawer);
                await engine.goToSpread(bm.spread);
            });
            dom.bmList.appendChild(btn);
        });
    }

    // ──────────────────────────────────────────────────────────────
    // TEMA / YAZI
    // ──────────────────────────────────────────────────────────────

    function applyTheme(name) {
        if (!THEMES.includes(name)) name = "hisar";
        dom.body.dataset.theme = name;
    }

    function applyTypeStep(step) {
        const scale = TYPE_STEPS[step] || 1;
        document.documentElement.style.setProperty("--reader-scale", String(scale));
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }

    function toast(msg) {
        clearTimeout(toastTimer);
        dom.toast.textContent = msg;
        dom.toast.classList.add("is-visible");
        toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 1800);
    }

    function showHintBriefly() {
        dom.hint.classList.add("is-visible");
        setTimeout(() => dom.hint.classList.remove("is-visible"), 5500);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
