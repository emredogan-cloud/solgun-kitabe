/* ════════════════════════════════════════════════════════════════
   finalize.js
   Tüm kayıt dosyaları yüklendikten sonra, kayıtları kategori
   sırasına göre yeniden diz. Bu adım, dosyaların yüklenme sırası
   ne olursa olsun, kodeksin daima aynı düzeni göstermesini sağlar.

   Sıra:
     1) Diyârlar
     2) Mahlûkât
     3) Tarîkât
     4) Emânetler
     5) Vakâyiname
     6) Vesîkalar

   Aynı kategori içindeki kayıtların asıl sırası (dosyada yazıldığı
   sıra) korunur — sıralama "stable".
   ════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";
    const NS = window.KODEKS;
    if (!NS || !Array.isArray(NS.entries) || !Array.isArray(NS.categories)) return;

    const order = new Map(NS.categories.map((c, i) => [c.id, i]));
    const lastResort = NS.categories.length + 1;

    // Stable: aynı kategoride olanların asıl indeksini koru
    NS.entries
        .map((e, i) => ({ e, i, ord: order.has(e.category) ? order.get(e.category) : lastResort }))
        .sort((a, b) => a.ord - b.ord || a.i - b.i)
        .forEach((wrapped, idx) => { NS.entries[idx] = wrapped.e; });

    // Hata-ayıklama için: kaç kayıt yüklendi
    if (typeof console !== "undefined" && console.info) {
        const tally = {};
        NS.entries.forEach(e => { tally[e.category] = (tally[e.category] || 0) + 1; });
        console.info("[Solgun Kitabe] " + NS.entries.length + " kayıt yüklendi:", tally);
    }
})();
