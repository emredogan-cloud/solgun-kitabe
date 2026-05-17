/* ════════════════════════════════════════════════════════════════
   pdf-export.js — PDF çıkarımı
   Tüm kodeksi yazdırma odaklı DOM'a dönüştürür, sonra tarayıcının
   yazdır penceresini açar. Modern her tarayıcıda "PDF olarak kaydet"
   seçeneği bulunur — harici kitap gerekmez.
   ════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    const NS = window.KODEKS;

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function paragraphToHtml(item) {
        if (typeof item === "string") return `<p>${escapeHtml(item)}</p>`;
        if (item && item.style === "quote") return `<p class="prose-quote">${escapeHtml(item.text || "")}</p>`;
        if (item && item.style === "hr") return `<p class="prose-hr">✠ ✠ ✠</p>`;
        return "";
    }

    const PRINT_CSS = `
        @page { size: A4; margin: 22mm 18mm 22mm 18mm; }

        @media print {
            body * { visibility: hidden !important; }
            .print-mount, .print-mount * { visibility: visible !important; }
            .print-mount {
                position: absolute !important;
                inset: 0 !important;
                display: block !important;
                background: #e8d8b2 !important;
                color: #1a120c !important;
            }
            .ambient, .chrome, .drawer, .toast, .hint, .stage { display: none !important; }
        }

        .print-mount {
            font-family: 'EB Garamond', 'Cormorant Garamond', Georgia, serif;
            font-size: 11pt;
            line-height: 1.58;
            color: #1a120c;
            background: #e8d8b2;
        }
        .print-mount .print-cover {
            text-align: center;
            page-break-after: always;
            padding: 30mm 10mm;
        }
        .print-mount .print-cover h1 {
            font-family: 'UnifrakturMaguntia', 'Cinzel', serif;
            font-size: 38pt;
            margin: 0 0 8pt;
            color: #5a3a10;
        }
        .print-mount .print-cover .pc-series {
            font-family: 'Cinzel', serif;
            font-size: 9pt;
            letter-spacing: 0.6em;
            text-transform: uppercase;
            margin-bottom: 30pt;
            color: #6e5024;
        }
        .print-mount .print-cover .pc-subtitle {
            font-style: italic;
            font-size: 14pt;
            margin: 0 0 20pt;
            color: #3a2818;
        }
        .print-mount .print-cover .pc-divider {
            width: 80pt; height: 1pt; background: #6e5024;
            margin: 20pt auto; position: relative;
        }
        .print-mount .print-cover .pc-divider::before {
            content: '✠';
            position: absolute; left: 50%; top: 50%;
            transform: translate(-50%, -50%);
            background: #e8d8b2; padding: 0 6pt;
            color: #6e5024;
        }
        .print-mount .print-cover .pc-epigraph {
            font-style: italic; font-size: 12pt; max-width: 70%;
            margin: 30pt auto;
        }

        .print-mount .print-toc { page-break-after: always; }
        .print-mount .print-toc h2 {
            font-family: 'Cinzel', serif;
            font-size: 18pt;
            text-align: center;
            letter-spacing: 0.2em;
            color: #1a120c;
            margin: 20pt 0 18pt;
        }
        .print-mount .print-toc ol {
            list-style: none; padding: 0;
            max-width: 480pt;
            margin: 0 auto;
        }
        .print-mount .print-toc li {
            display: flex;
            align-items: baseline;
            gap: 10pt;
            padding: 5pt 0;
            border-bottom: 1px dotted #a88a55;
        }
        .print-mount .print-toc .num {
            font-family: 'Cinzel', serif;
            font-size: 9pt;
            min-width: 36pt;
            color: #4e3a16;
        }
        .print-mount .print-toc .name { flex: 1; }
        .print-mount .print-toc .civ {
            font-family: 'Cinzel', serif;
            font-size: 8pt;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: #4e3a16;
        }
        .print-mount .print-toc .pg {
            font-family: 'Cinzel', serif;
            font-size: 9pt;
            color: #4e3a16;
            min-width: 36pt;
            text-align: right;
        }

        .print-mount .print-chapter { page-break-before: always; }
        .print-mount .print-chapter-opening {
            text-align: center;
            padding: 60pt 20pt 30pt;
            page-break-after: always;
        }
        .print-mount .print-chapter-opening .pco-civ {
            font-family: 'Cinzel', serif;
            font-size: 9pt;
            letter-spacing: 0.6em;
            text-transform: uppercase;
            color: #4e3a16;
            border-top: 1px solid #a88a55;
            border-bottom: 1px solid #a88a55;
            display: inline-block;
            padding: 4pt 10pt;
            margin-bottom: 30pt;
        }
        .print-mount .print-chapter-opening .pco-num {
            font-family: 'UnifrakturMaguntia', 'Cinzel', serif;
            font-size: 48pt;
            color: #5a3a10;
            line-height: 1;
            margin-bottom: 10pt;
        }
        .print-mount .print-chapter-opening h2 {
            font-family: 'Cinzel', serif;
            font-size: 22pt;
            margin: 0 0 6pt;
            color: #1a120c;
        }
        .print-mount .print-chapter-opening .pco-subtitle {
            font-style: italic;
            font-size: 12pt;
            color: #3a2818;
            max-width: 75%;
            margin: 0 auto;
        }

        .print-mount .print-body {
            text-align: justify;
            hyphens: auto;
            -webkit-hyphens: auto;
            padding: 0 8mm;
            orphans: 3;
            widows: 3;
        }
        .print-mount .print-body p {
            margin: 0 0 8pt;
            text-indent: 1.4em;
        }
        .print-mount .print-body p:first-child { text-indent: 0; }
        .print-mount .print-body p:first-child::first-letter {
            font-family: 'UnifrakturMaguntia', 'Cinzel', serif;
            font-size: 3em;
            float: left;
            line-height: 0.8;
            margin: 0.05em 0.1em 0 0;
            color: #6a1818;
        }
        .print-mount .print-body .prose-quote {
            font-style: italic;
            text-indent: 0;
            margin: 8pt 1.2em;
            padding-left: 0.8em;
            border-left: 2pt solid #6e5024;
            color: #3a2818;
        }
        .print-mount .print-body .prose-hr {
            text-indent: 0;
            text-align: center;
            color: #6e5024;
            letter-spacing: 0.5em;
            margin: 12pt 0;
        }

        .print-mount .print-end {
            text-align: center;
            color: #6e5024;
            font-size: 14pt;
            margin: 16pt 0 4pt;
            letter-spacing: 0.4em;
        }
        .print-mount .print-colophon {
            page-break-before: always;
            text-align: center;
            padding: 80pt 20pt;
        }
        .print-mount .print-colophon h2 {
            font-family: 'Cinzel', serif;
            font-size: 18pt;
            letter-spacing: 0.2em;
            margin-bottom: 18pt;
        }
        .print-mount .print-colophon p {
            font-style: italic;
            max-width: 70%;
            margin: 0 auto 14pt;
            line-height: 1.7;
        }
    `;

    function injectPrintStylesOnce() {
        if (document.getElementById("print-css")) return;
        const style = document.createElement("style");
        style.id = "print-css";
        style.textContent = PRINT_CSS;
        document.head.appendChild(style);
    }

    function buildCoverHtml(book) {
        return `
            <div class="print-cover">
                <div class="pc-series">${escapeHtml(book.series)}</div>
                <h1>${escapeHtml(book.title)}</h1>
                <p class="pc-subtitle">${escapeHtml(book.subtitle)}</p>
                <div class="pc-divider"></div>
                <p class="pc-epigraph">${escapeHtml(book.epigraph)}</p>
                <div class="pc-series" style="margin-top:40pt;">${escapeHtml(book.edition)}</div>
            </div>
        `;
    }
    function buildTocHtml(entries, ROMAN) {
        const items = entries.map((s, i) => {
            const cat = NS.categoryById(s.category);
            return `<li>
                <span class="num">${ROMAN[i + 1]}.</span>
                <span class="name">${escapeHtml(s.title)}</span>
                <span class="civ">${escapeHtml(cat ? cat.full : "")}</span>
                <span class="pg">${i + 1}</span>
            </li>`;
        }).join("");
        return `<section class="print-toc">
            <h2>Defter-i Fihrist</h2>
            <ol>${items}</ol>
        </section>`;
    }
    function buildChapterHtml(s, num) {
        const cat = NS.categoryById(s.category);
        const body = s.content.map(paragraphToHtml).join("");
        return `
            <section class="print-chapter">
                <div class="print-chapter-opening">
                    <div class="pco-civ">${escapeHtml(cat ? cat.full : "")}</div>
                    <div class="pco-num">${num}</div>
                    <h2>${escapeHtml(s.title)}</h2>
                    <p class="pco-subtitle">${escapeHtml(s.subtitle || "")}</p>
                </div>
                <div class="print-body">
                    ${body}
                    <div class="print-end">✠</div>
                </div>
            </section>
        `;
    }
    function buildColophonHtml(book) {
        return `<section class="print-colophon">
            <h2>Mühür</h2>
            <p>${escapeHtml(book.epilogueText)}</p>
            <p style="margin-top:30pt;">${escapeHtml(book.colophon)}</p>
        </section>`;
    }

    const requestIdle = window.requestIdleCallback ||
        (cb => setTimeout(() => cb({ timeRemaining: () => 16 }), 0));

    let exporting = false;

    function exportPDF(opts) {
        if (exporting) return;
        exporting = true;
        injectPrintStylesOnce();
        const mount = document.getElementById("print-mount");
        if (!mount) { exporting = false; return; }

        const book = NS.book;
        const entries = NS.entries;
        const ROMAN_ONES = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
        const ROMAN_TENS = ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"];
        const toRoman = n => n <= 0 ? "" : (n >= 100 ? "C" + toRoman(n - 100) : ROMAN_TENS[Math.floor(n / 10)] + ROMAN_ONES[n % 10]);
        const ROMAN = new Proxy({}, { get: (_, k) => toRoman(Number(k)) });

        mount.innerHTML = buildCoverHtml(book) + buildTocHtml(entries, ROMAN);

        const CHUNK = 3;
        let next = 0;

        function emitChunk(deadline) {
            const end = Math.min(next + CHUNK, entries.length);
            let buf = "";
            for (let i = next; i < end; i++) {
                buf += buildChapterHtml(entries[i], ROMAN[i + 1]);
            }
            mount.insertAdjacentHTML("beforeend", buf);
            next = end;
            if (typeof opts === "object" && opts && typeof opts.onProgress === "function") {
                opts.onProgress(next, entries.length);
            }
            if (next < entries.length) {
                requestIdle(emitChunk);
            } else {
                mount.insertAdjacentHTML("beforeend", buildColophonHtml(book));
                requestAnimationFrame(() => {
                    if (typeof window.print === "function") window.print();
                    setTimeout(() => { mount.innerHTML = ""; exporting = false; }, 1500);
                });
            }
        }

        requestIdle(emitChunk);
    }

    NS.PdfExport = { exportPDF };
})();
