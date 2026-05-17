/* ════════════════════════════════════════════════════════════════
   book.js — Sayfa motoru
   Kayıtları sayfa dizisine dönüştürür, ölçer, sayfalandırır ve
   üç-boyutlu çevirme animasyonunu yönetir.
   ════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    const NS = window.KODEKS;

    const PAGE_KINDS = {
        COVER: "cover",
        TOC: "toc",
        CHAPTER_OPENING: "chapter-opening",
        STORY: "story",
        EPILOGUE: "epilogue",
        BLANK: "blank"
    };

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    const _idleYield = (typeof window.requestIdleCallback === "function")
        ? () => new Promise(r => window.requestIdleCallback(() => r(), { timeout: 50 }))
        : () => new Promise(r => setTimeout(r, 0));
    const yieldToBrowser = _idleYield;

    function paragraphHtml(item) {
        if (typeof item === "string") {
            return `<p>${escapeHtml(item)}</p>`;
        }
        if (item && item.style === "quote") {
            return `<p data-style="quote">${escapeHtml(item.text || "")}</p>`;
        }
        if (item && item.style === "hr") {
            return `<p data-style="hr">✠ ✠ ✠</p>`;
        }
        return "";
    }

    // Romence rakam — 100'e kadar yeterli (kayıt sayısı çok geç o eşiği geçer).
    const ROMAN_ONES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
    const ROMAN_TENS = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"];
    function toRoman(n) {
        if (n <= 0) return "";
        if (n >= 100) return "C" + toRoman(n - 100);
        return ROMAN_TENS[Math.floor(n / 10)] + ROMAN_ONES[n % 10];
    }
    const ROMAN = new Proxy({}, { get(_, key) { return toRoman(Number(key)); } });

    // ──────────────────────────────────────────────────────────────
    // BookEngine
    // ──────────────────────────────────────────────────────────────

    class BookEngine {
        constructor(root) {
            this.root = root;
            this.pages = [];
            this.spreads = [];
            this.spread = 0;
            this.isAnimating = false;
            this.measureEl = null;
            this.onSpreadChange = null;
            this.entryToSpread = new Map();   // kayıt id'si -> açılış spread'i
        }

        async build() {
            this._createMeasureEl();
            await this._buildPages();
            this._pairSpreads();
            this._mountInitial();
            this._removeMeasureEl();
        }

        // -------- Ölçüm scratch --------
        _createMeasureEl() {
            const sample = document.createElement("div");
            sample.className = "page page--right";
            sample.style.visibility = "hidden";
            sample.style.position = "absolute";
            sample.style.zIndex = "-1";
            sample.style.pointerEvents = "none";
            sample.innerHTML = `<div class="page__inner"><div class="page__content"><div class="story-body" data-measure-target></div></div></div>`;
            this.root.appendChild(sample);
            this.measureEl = sample;
            this.measureContent = sample.querySelector("[data-measure-target]");
            this.measureFrame = sample.querySelector(".page__content");
        }
        _removeMeasureEl() {
            if (this.measureEl && this.measureEl.parentNode) {
                this.measureEl.parentNode.removeChild(this.measureEl);
            }
            this.measureEl = null;
        }
        _measureFits(html) {
            this.measureContent.innerHTML = html;
            return this.measureContent.scrollHeight <= this._frameHeight;
        }

        // Sayfalandırma — üstel arama + ikili daraltma
        _paginate(contentItems) {
            this._frameHeight = this.measureFrame.clientHeight;

            const htmls = [];
            for (let i = 0; i < contentItems.length; i++) {
                const h = paragraphHtml(contentItems[i]);
                if (h) htmls.push({ html: h, item: contentItems[i] });
            }

            const pages = [];
            let cursor = 0;

            while (cursor < htmls.length) {
                let lo = 1;
                let hi = 1;
                while (cursor + hi <= htmls.length) {
                    const trial = htmls.slice(cursor, cursor + hi).map(h => h.html).join("");
                    if (this._measureFits(trial)) {
                        lo = hi;
                        if (cursor + hi === htmls.length) break;
                        hi = Math.min(hi * 2, htmls.length - cursor);
                        if (hi === lo) break;
                    } else {
                        break;
                    }
                }

                if (lo === 1 && cursor + 1 <= htmls.length) {
                    const trial = htmls[cursor].html;
                    if (!this._measureFits(trial)) {
                        const sliced = this._splitOversizedParagraph(htmls[cursor].item);
                        htmls.splice(cursor, 1, ...sliced.map(s => ({ html: s, item: null })));
                        continue;
                    }
                }

                let fits = lo;
                let over = Math.min(hi, htmls.length - cursor);
                if (over > fits) {
                    while (over - fits > 1) {
                        const mid = (fits + over) >> 1;
                        const trial = htmls.slice(cursor, cursor + mid).map(h => h.html).join("");
                        if (this._measureFits(trial)) fits = mid;
                        else over = mid;
                    }
                }

                pages.push(htmls.slice(cursor, cursor + fits).map(h => h.html).join(""));
                cursor += fits;
            }

            if (pages.length === 0) pages.push("");
            return pages;
        }

        _splitOversizedParagraph(item) {
            const text = (typeof item === "string") ? item : (item.text || "");
            const style = (typeof item === "string") ? null : item.style;
            const sentences = text.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) || [text];
            const wrap = (txt) => style === "quote"
                ? `<p data-style="quote">${escapeHtml(txt)}</p>`
                : `<p>${escapeHtml(txt)}</p>`;

            const out = [];
            let buf = "";
            for (const s of sentences) {
                const trial = buf + s;
                if (this._measureFits(wrap(trial))) {
                    buf = trial;
                } else {
                    if (buf) out.push(wrap(buf));
                    buf = s;
                }
            }
            if (buf) out.push(wrap(buf));
            return out;
        }

        // Tüm sayfaları kur
        async _buildPages() {
            const entries = NS.entries;
            const book = NS.book;

            // 1. Kapak: sol-blank + ön-kapak
            this.pages.push({
                kind: PAGE_KINDS.BLANK,
                html: `<div class="page__inner"></div>`,
                chapter: "", folio: ""
            });
            this.pages.push({
                kind: PAGE_KINDS.COVER,
                html: this._coverHtml(book),
                chapter: "", folio: ""
            });

            // 2. Başlık spread'i
            this.pages.push({
                kind: PAGE_KINDS.BLANK,
                html: `<div class="page__inner"></div>`,
                chapter: "", folio: ""
            });
            this.pages.push({
                kind: PAGE_KINDS.BLANK,
                html: this._titleHtml(book),
                chapter: "", folio: ""
            });

            // 3. Fihrist sayfaları için yer ayır
            const TOC_ENTRIES_PER_PAGE = 13;
            let tocPagesNeeded = Math.max(2, Math.ceil(entries.length / TOC_ENTRIES_PER_PAGE));
            if (tocPagesNeeded % 2 === 1) tocPagesNeeded++;
            const tocPlaceholderIndex = this.pages.length;
            for (let i = 0; i < tocPagesNeeded; i++) {
                this.pages.push({ kind: PAGE_KINDS.TOC, html: "", chapter: "Fihrist", folio: "" });
            }

            // 4. Her kayıt: açılış sayfası + içerik sayfaları
            const YIELD_EVERY = 5;
            const tocEntries = [];
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const cat = NS.categoryById(entry.category);
                const num = ROMAN[i + 1] || String(i + 1);

                // Açılışı sağ sayfaya hizala
                if (this.pages.length % 2 === 1) {
                    this.pages.push({
                        kind: PAGE_KINDS.BLANK,
                        html: `<div class="page__inner"></div>`,
                        chapter: "", folio: ""
                    });
                }

                const openingIdx = this.pages.length;
                this.pages.push({
                    kind: PAGE_KINDS.CHAPTER_OPENING,
                    html: this._chapterOpeningHtml(entry, cat, num),
                    chapter: entry.title,
                    folio: ""
                });

                const paginated = this._paginate(entry.content);

                paginated.forEach((html, idx) => {
                    const isContinuation = idx > 0;
                    const isLast = idx === paginated.length - 1;
                    this.pages.push({
                        kind: PAGE_KINDS.STORY,
                        html: this._storyPageHtml(html, isContinuation, isLast, entry, cat, num),
                        chapter: entry.title,
                        folio: "",
                        story: entry.id,
                        continuation: isContinuation,
                        ending: isLast
                    });
                });

                tocEntries.push({
                    num,
                    title: entry.title,
                    civ: cat ? cat.full : "",
                    civId: entry.category,
                    folioPage: openingIdx,
                    storyId: entry.id
                });

                if (typeof this.onProgress === "function") {
                    this.onProgress(i + 1, entries.length);
                }
                if ((i + 1) % YIELD_EVERY === 0 && i + 1 < entries.length) {
                    await yieldToBrowser();
                }
            }

            // 5. Mühür sayfası (epilogue)
            if (this.pages.length % 2 === 1) {
                this.pages.push({
                    kind: PAGE_KINDS.BLANK,
                    html: `<div class="page__inner"></div>`,
                    chapter: "", folio: ""
                });
            }
            this.pages.push({
                kind: PAGE_KINDS.EPILOGUE,
                html: this._epilogueHtml(book),
                chapter: "Mühür",
                folio: ""
            });

            if (this.pages.length % 2 === 1) {
                this.pages.push({
                    kind: PAGE_KINDS.BLANK,
                    html: `<div class="page__inner"></div>`,
                    chapter: "", folio: ""
                });
            }
            this.pages.push({
                kind: PAGE_KINDS.BLANK,
                html: this._backCoverHtml(book),
                chapter: "", folio: ""
            });
            this.pages.push({
                kind: PAGE_KINDS.BLANK,
                html: `<div class="page__inner"></div>`,
                chapter: "", folio: ""
            });

            // Folyo numaraları
            let folio = 1;
            const firstChapterIdx = this.pages.findIndex(p => p.kind === PAGE_KINDS.CHAPTER_OPENING);
            for (let i = 0; i < this.pages.length; i++) {
                if (i < firstChapterIdx) continue;
                const p = this.pages[i];
                if (p.kind === PAGE_KINDS.BLANK) continue;
                p.folio = ROMAN[folio] || String(folio);
                folio++;
            }

            tocEntries.forEach(e => {
                const page = this.pages[e.folioPage];
                e.folio = page.folio;
            });
            tocEntries.forEach(e => {
                this.entryToSpread.set(e.storyId, Math.floor(e.folioPage / 2));
            });

            this._writeTocPages(tocPlaceholderIndex, tocEntries, tocPagesNeeded);
            this.tocEntries = tocEntries;
        }

        _pairSpreads() {
            this.spreads = [];
            for (let i = 0; i < this.pages.length; i += 2) {
                this.spreads.push([i, this.pages[i + 1] ? i + 1 : null]);
            }
        }

        // -------- HTML üreteçleri --------

        _coverHtml(book) {
            return `
                <div class="page__inner">
                  <div class="cover">
                    <div class="cover__crest" aria-hidden="true">
                      <svg viewBox="0 0 100 100" fill="none">
                        <defs>
                          <radialGradient id="crestG" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#d4b46a"/>
                            <stop offset="100%" stop-color="#5a3a10"/>
                          </radialGradient>
                        </defs>
                        <circle cx="50" cy="50" r="44" stroke="url(#crestG)" stroke-width="0.7" fill="none"/>
                        <circle cx="50" cy="50" r="34" stroke="url(#crestG)" stroke-width="0.5" fill="none"/>
                        <!-- Yedi-kollu haç (yedi katedralin sembolü) -->
                        <g stroke="url(#crestG)" stroke-width="0.7" fill="none">
                          <path d="M50 10 L50 90"/>
                          <path d="M20 28 L80 28"/>
                          <path d="M16 50 L84 50"/>
                          <path d="M20 72 L80 72"/>
                        </g>
                        <!-- Yedi diken -->
                        <g fill="url(#crestG)" opacity="0.85">
                          <path d="M50 50 L42 32 L50 36 Z"/>
                          <path d="M50 50 L58 32 L50 36 Z"/>
                          <path d="M50 50 L32 42 L36 50 Z"/>
                          <path d="M50 50 L68 42 L64 50 Z"/>
                          <path d="M50 50 L32 58 L36 50 Z"/>
                          <path d="M50 50 L68 58 L64 50 Z"/>
                          <path d="M50 50 L42 68 L50 64 Z"/>
                          <path d="M50 50 L58 68 L50 64 Z"/>
                        </g>
                        <circle cx="50" cy="50" r="6.5" fill="url(#crestG)"/>
                        <circle cx="50" cy="50" r="2.6" fill="#16100a"/>
                      </svg>
                    </div>
                    <div class="cover__series">${escapeHtml(book.series)}</div>
                    <h1 class="cover__title">${escapeHtml(book.title)}</h1>
                    <p class="cover__subtitle">${escapeHtml(book.subtitle)}</p>
                    <div class="cover__divider" aria-hidden="true"></div>
                    <p class="cover__epigraph">${escapeHtml(book.epigraph)}</p>
                    <div class="cover__edition">${escapeHtml(book.edition)}</div>
                  </div>
                </div>
            `;
        }

        _backCoverHtml(book) {
            return `
                <div class="page__inner">
                  <div class="cover" style="justify-content:center;">
                    <div class="cover__crest" aria-hidden="true" style="opacity:0.65;">
                      <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#a8842c" stroke-width="0.5"/>
                        <circle cx="50" cy="50" r="30" fill="none" stroke="#a8842c" stroke-width="0.4"/>
                      </svg>
                    </div>
                    <div class="cover__series" style="margin-top:2rem;">Hitâm — Burada Tükenir</div>
                  </div>
                </div>
            `;
        }

        _titleHtml(book) {
            const chips = NS.categories
                .map(c => `<span class="chapter-opening__theme">${escapeHtml(c.name)}</span>`)
                .join("");
            return `
                <div class="page__inner">
                  <div class="page__content">
                    <div class="chapter-opening" style="border:none; padding-top:4rem;">
                      <div class="chapter-opening__civ-mark">Cilt-i Evvel</div>
                      <h1 class="chapter-opening__title" style="margin-bottom:1.2rem;">${escapeHtml(book.title)}</h1>
                      <p class="chapter-opening__subtitle">${escapeHtml(book.subtitle)}</p>
                      <div class="chapter-opening__divider"></div>
                      <p class="chapter-opening__subtitle" style="font-style:italic;max-width:80%;">${escapeHtml(book.epigraph)}</p>
                      <div class="chapter-opening__themes">${chips}</div>
                    </div>
                  </div>
                </div>
            `;
        }

        _writeTocPages(startIdx, entries, totalPages) {
            const perPage = Math.ceil(entries.length / totalPages);
            for (let p = 0; p < totalPages; p++) {
                const slice = entries.slice(p * perPage, (p + 1) * perPage);
                if (!slice.length) {
                    this.pages[startIdx + p].html = `<div class="page__inner"></div>`;
                    continue;
                }
                const first = slice[0].num;
                const last = slice[slice.length - 1].num;
                this.pages[startIdx + p].html = this._tocPageHtml(
                    "Defter-i Fihrist",
                    `${first} — ${last}`,
                    slice
                );
            }
        }

        _tocPageHtml(title, eyebrow, entries) {
            const items = entries.map(e => `
                <li class="toc-page__item" data-story-jump="${e.storyId}" role="link" tabindex="0">
                  <span class="toc-page__num">${e.num}.</span>
                  <span class="toc-page__name">${escapeHtml(e.title)}</span>
                  <span class="toc-page__civ">${escapeHtml(e.civ)}</span>
                  <span class="toc-page__page">${e.folio}</span>
                </li>
            `).join("");

            return `
                <div class="page__inner">
                  <div class="page__content">
                    <div class="toc-page">
                      <div class="toc-page__header">
                        <div class="toc-page__eyebrow">${escapeHtml(eyebrow)}</div>
                        <h2 class="toc-page__title">${escapeHtml(title)}</h2>
                      </div>
                      <ul class="toc-page__list">${items}</ul>
                    </div>
                  </div>
                </div>
            `;
        }

        _chapterOpeningHtml(entry, cat, num) {
            const themes = (entry.themes || []).map(t => `<span class="chapter-opening__theme">${escapeHtml(t)}</span>`).join("");
            return `
                <div class="page__inner">
                  <div class="page__content">
                    <div class="chapter-opening">
                      <div class="chapter-opening__civ-mark">${escapeHtml(cat ? cat.full : "")}</div>
                      <div class="chapter-opening__num">${num}</div>
                      <h2 class="chapter-opening__title">${escapeHtml(entry.title)}</h2>
                      <p class="chapter-opening__subtitle">${escapeHtml(entry.subtitle || "")}</p>
                      <div class="chapter-opening__divider"></div>
                      <div class="chapter-opening__themes">${themes}</div>
                    </div>
                  </div>
                </div>
            `;
        }

        _storyPageHtml(bodyHtml, isContinuation, isLast, entry, cat, num) {
            const endingMark = isLast ? `<div class="chapter-end">✠</div>` : "";
            const continuationCls = isContinuation ? " page--continuation" : "";
            const catName = cat ? cat.name : "";
            return `
                <div class="page__inner${continuationCls}">
                  <div class="page__chapter-mark">${escapeHtml(entry.title)} · ${escapeHtml(catName)}</div>
                  <div class="page__content">
                    <div class="story-body">${bodyHtml}${endingMark}</div>
                  </div>
                </div>
            `;
        }

        _epilogueHtml(book) {
            return `
                <div class="page__inner">
                  <div class="page__content">
                    <div class="epilogue">
                      <h2 class="epilogue__title">Mühür</h2>
                      <p class="epilogue__text">${escapeHtml(book.epilogueText)}</p>
                      <div class="chapter-opening__divider" style="width:140px;"></div>
                      <p class="epilogue__text" style="font-size:0.95rem;">${escapeHtml(book.colophon)}</p>
                      <div class="epilogue__seal" aria-hidden="true">℟</div>
                    </div>
                  </div>
                </div>
            `;
        }

        // -------- Mount + Navigasyon --------

        _mountInitial() {
            this.root.innerHTML = "";
            const left = document.createElement("div");
            left.className = "page page--left page--current";
            const right = document.createElement("div");
            right.className = "page page--right page--current";
            this.root.appendChild(left);
            this.root.appendChild(right);
            this._renderSpread(this.spread, left, right);
            const bookEl = this.root.closest(".book");
            if (bookEl) bookEl.classList.add("is-ready");
        }

        _renderSpread(spreadIdx, leftEl, rightEl) {
            const [li, ri] = this.spreads[spreadIdx] || [null, null];
            const lp = li !== null ? this.pages[li] : null;
            const rp = ri !== null ? this.pages[ri] : null;

            this._writePage(leftEl, lp, "left");
            this._writePage(rightEl, rp, "right");
        }

        _writePage(el, page, side) {
            if (!page) {
                el.innerHTML = `<div class="page__inner"></div>`;
                return;
            }
            const folio = page.folio
                ? `<div class="page__folio">${escapeHtml(page.folio)}</div>`
                : "";
            const curl = `<div class="page__curl" aria-hidden="true"></div>`;
            el.innerHTML = page.html + folio + curl;
        }

        getSpreadCount() { return this.spreads.length; }
        getCurrentSpread() { return this.spread; }
        getCurrentPages() {
            const [li, ri] = this.spreads[this.spread] || [null, null];
            return [
                li !== null ? this.pages[li] : null,
                ri !== null ? this.pages[ri] : null
            ];
        }
        getCurrentChapterLabel() {
            const [lp, rp] = this.getCurrentPages();
            return (rp && rp.chapter) || (lp && lp.chapter) || "";
        }
        getCurrentFolioRange() {
            const [lp, rp] = this.getCurrentPages();
            const lf = lp ? lp.folio : "";
            const rf = rp ? rp.folio : "";
            if (lf && rf) return `${lf} — ${rf}`;
            return lf || rf || "—";
        }

        async next() { return this._turn(+1); }
        async prev() { return this._turn(-1); }

        async goToSpread(spreadIdx) {
            spreadIdx = Math.max(0, Math.min(this.spreads.length - 1, spreadIdx | 0));
            if (spreadIdx === this.spread) return;
            const dir = spreadIdx > this.spread ? +1 : -1;
            const distance = Math.abs(spreadIdx - this.spread);
            if (distance === 1) {
                await this._turn(dir);
                return;
            }
            this.spread = spreadIdx;
            const [leftEl, rightEl] = this._currentDomPair();
            leftEl.classList.add("page--fade");
            rightEl.classList.add("page--fade");
            this._renderSpread(this.spread, leftEl, rightEl);
            requestAnimationFrame(() => {
                leftEl.classList.remove("page--fade");
                rightEl.classList.remove("page--fade");
            });
            this._fireSpreadChange();
        }

        async goToEntry(entryId) {
            const idx = this.entryToSpread.get(entryId);
            if (typeof idx === "number") {
                await this.goToSpread(idx);
                return true;
            }
            return false;
        }

        // İsim eski çağrılarla uyumlu kalsın (TOC tıklama vb.)
        async goToStory(entryId) { return this.goToEntry(entryId); }

        _currentDomPair() {
            return [this.root.querySelector(".page--left"), this.root.querySelector(".page--right")];
        }

        async _turn(direction) {
            if (this.isAnimating) return;
            const newSpread = this.spread + direction;
            if (newSpread < 0 || newSpread >= this.spreads.length) return;

            this.isAnimating = true;
            const [leftEl, rightEl] = this._currentDomPair();

            const reduceMotion = (typeof window.matchMedia === "function")
                ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
                : false;

            if (reduceMotion) {
                this.spread = newSpread;
                this._renderSpread(this.spread, leftEl, rightEl);
                this.isAnimating = false;
                this._fireSpreadChange();
                return;
            }

            const target = this.spreads[newSpread];
            const targetLeft = this.pages[target[0]];
            const targetRight = target[1] !== null ? this.pages[target[1]] : null;

            const sourceEl = direction === +1 ? rightEl : leftEl;
            const baseClass = direction === +1
                ? "page page--right page--turning"
                : "page page--left page--turning";
            const triggerClass = direction === +1 ? "page--turn-forward" : "page--turn-backward";

            const turnEl = document.createElement("div");
            turnEl.className = baseClass;
            turnEl.innerHTML = sourceEl.innerHTML;
            turnEl.style.willChange = "transform, opacity";
            this.root.appendChild(turnEl);

            this._writePage(leftEl, targetLeft, "left");
            this._writePage(rightEl, targetRight, "right");

            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            turnEl.classList.add(triggerClass);

            await this._waitForTransition(turnEl);
            turnEl.style.willChange = "auto";
            turnEl.remove();

            this.spread = newSpread;
            this.isAnimating = false;
            this._fireSpreadChange();
        }

        _waitForTransition(el) {
            return new Promise(resolve => {
                let done = false;
                const handler = () => {
                    if (done) return;
                    done = true;
                    el.removeEventListener("transitionend", handler);
                    resolve();
                };
                el.addEventListener("transitionend", handler);
                setTimeout(() => { if (!done) { done = true; resolve(); } }, 1400);
            });
        }

        _fireSpreadChange() {
            if (typeof this.onSpreadChange === "function") {
                this.onSpreadChange(this.spread);
            }
        }
    }

    NS.BookEngine = BookEngine;
    NS.PAGE_KINDS = PAGE_KINDS;
})();
