/* ════════════════════════════════════════════════════════════════
   codex-data.js
   Kodeks-i Solgun Kitabe — Kütüphane verisi ve kategori meta'sı.

   Dünya: VARÂN — yıkılmış imparatorluk.
   Olay: Yedi-Gün Kararması (Yİ. 1187 — Çürüyen Çağ'ın başlangıcı).
   Şimdiki yıl: Çürüyen Çağ 412 (Yİ. 1599).
   "Yİ." = "Yangın'dan İtibâren" — Solgun Mîmâr'ın kendi mabedinde
   mühürlendiği gün başlatılan takvim.
   ════════════════════════════════════════════════════════════════ */

window.KODEKS = window.KODEKS || {};
window.KODEKS.entries = window.KODEKS.entries || [];

/* ────────── KATEGORİLER ──────────
   Eski sistemde "civilizations" denilen koleksiyonun karşılığı.
   Her giriş bir kategoriye aittir; fihrist bu kategorilere göre
   süzülebilir. Sıra burada belirlenir; "finalize.js" girişleri bu
   sıraya göre yeniden dizer.
*/
window.KODEKS.categories = [
    {
        id: "diyar",
        name: "Diyârlar",
        full: "Diyârlar ve Hâkim Bölgeler",
        epoch: "Yİ. öncesi — bugün",
        sigil: "✠",
        accent: "var(--cat-diyar)",
        description: "Varân'ın yedi katedral şehri ve etrafındaki diyârlar — taht köşkleri çöküp toprak kalanı yutalı dört yüzyıl oldu, fakat hâlâ kendilerini imparator sayanlar var."
    },
    {
        id: "mahluk",
        name: "Mahlûkât",
        full: "Mahlûkât ve Solgun Sûretler",
        epoch: "Yedi-Gün'den sonra",
        sigil: "༅",
        accent: "var(--cat-mahluk)",
        description: "Kararma sonrası diriltilen, dönüştürülen, yarı-yaşar bırakılan varlıklar. Hiçbiri tam canavar değildir; hepsi bir vakitler insan, aziz ya da ilâhî bir şeydi."
    },
    {
        id: "tarikat",
        name: "Tarîkât",
        full: "Tarîkât ve Yeminli Kardeşlikler",
        epoch: "Yİ. öncesi — bugün",
        sigil: "⌖",
        accent: "var(--cat-tarikat)",
        description: "Kül Dîvânı'ndan Boğaz-Açan Hâdımlara: Varân'ın enkazında birbirinin sırtına basıp ayakta durmaya çalışan tarîkâtlar."
    },
    {
        id: "emanet",
        name: "Emânetler",
        full: "Emânetler ve Lânetli Eşya",
        epoch: "değişken",
        sigil: "⚸",
        accent: "var(--cat-emanet)",
        description: "Ya bir imparatorun parmağıyla işaretlenmiş, ya bir azizin yağında pişirilmiş, ya da göğün bir karış altında dövülmüş on iki nesne. Hiçbirine sahip olunmaz — taşınır, dayanılır."
    },
    {
        id: "vakayiname",
        name: "Vakâyiname",
        full: "Vakâyiname — Çağların Sırası",
        epoch: "Yİ. 0 — Çürüyen Çağ 412",
        sigil: "𓊨",
        accent: "var(--cat-vakayiname)",
        description: "Beş büyük devir — yükseliş, kibre yöneliş, Kararma, ilk küller, ve bugün hâlâ çürümekte olan yüzyıllarımız."
    },
    {
        id: "vesika",
        name: "Vesîkalar",
        full: "Vesîkalar — Yıpranmış El Yazmaları",
        epoch: "Yİ. öncesi — bugün",
        sigil: "✎",
        accent: "var(--cat-vesika)",
        description: "Bir hâdımın itirâfı, bir çocuğun kuyu kıyısında bıraktığı kâğıt parçası, bir cellâdın gemi günlüğü, gönderilmemiş bir mektup. Tarihin ana akıntısının kıyısında biriken tortu."
    }
];

window.KODEKS.book = {
    title: "Solgun Kitabe",
    subtitle: "Çöken Varân İmparatorluğu'nun Yasak Arşivi",
    series: "Cilt-i Evvel",
    edition: "Folyo Tab' · MMXXVI",
    epigraph: "“Mîmâr kendi mabedinin altında uyur. Onu uyandıran taşı tutmasın — taş, bir zamanlar onun aviciydi.”",
    epilogueText: "Burada Solgun Kitabe'nin bu cildi tükenir. İmparatorluk tükenmiş değildir — sadece eskimiş ağzıyla artık konuşmuyor; başkasının ağzına geçinceye kadar bekliyor. Kapağı kapatıp gittiğin yerin loş eşiğinde bir an dur; arkanda bir adım sesi varsa, dönme.",
    colophon: "Gümüş Arşivciler'in elinden çıkmış, kaçırılmış, çoğaltılmış ve dağıtılmıştır. Cinzel, Cormorant Garamond, EB Garamond ve Maguntia Fraktur yazıtlarıyla. Yİ. 1599 (Çürüyen Çağ 412)."
};

window.KODEKS.categoryById = function (id) {
    return window.KODEKS.categories.find(c => c.id === id);
};
