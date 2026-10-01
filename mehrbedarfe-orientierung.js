// mehrbedarfe-orientierung.js
// Mehrbedarfe nach § 21 SGB II (Grundsicherung, früher Bürgergeld) und Regelbedarfe nach § 20 SGB II.
// Rechtsstand: 2026 (Regelsätze unverändert zu 2025). Werte jährlich im CONFIG-Block prüfen.

(() => {
  "use strict";

  const CONFIG = {
    jahr: 2026,
    // Regelbedarfe in € pro Monat
    rs: { single: 563, partner: 506, erw: 451, k05: 357, k613: 390, k1417: 471 },
    // Mehrbedarfe in Prozent des jeweils maßgeblichen Regelbedarfs
    pctSchwanger: 0.17,           // § 21 Abs. 2
    pctBehinderung: 0.35,         // § 21 Abs. 4
    pctAeFest: 0.36,              // § 21 Abs. 3 Nr. 1
    pctAeProKind: 0.12,           // § 21 Abs. 3 Nr. 2
    pctAeMax: 0.60,
    // dezentrale Warmwassererzeugung, § 21 Abs. 7
    pctWwErwachsene: 0.023,
    pctWw05: 0.008,
    pctWw613: 0.012,
    pctWw1417: 0.014,
    maxKinderProGruppe: 10
  };

  /* ---------- Hilfsfunktionen ---------- */
  const num = (el) => {
    if (!el) return 0;
    const v = Number(String(el.value || "").trim().replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };
  const anzahl = (el) => Math.max(0, Math.floor(num(el)));
  const euro = (v) => (Number.isFinite(v) ? v : 0)
    .toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const round2 = (v) => Math.round(v * 100) / 100;
  const pct = (v) => (v * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " %";

  /* ---------- Berechnung ---------- */
  function alleinerziehendenSatz(kinderGesamt, unter7, unter16) {
    if (kinderGesamt <= 0) return 0;
    const festSatz = (unter7 >= 1 || unter16 === 2 || unter16 === 3) ? CONFIG.pctAeFest : 0;
    const proKind = Math.min(CONFIG.pctAeMax, CONFIG.pctAeProKind * kinderGesamt);
    return Math.max(festSatz, proKind);
  }

  function berechne(e) {
    const paar = e.haushalt === "paar";
    const ae = e.haushalt === "ae";
    const rs = e.rs;
    const kinderJug = e.k1415 + e.k1617;
    const kinderGesamt = e.k05 + e.k613 + kinderJug;
    const bezugsRegelsatz = paar ? rs.partner : rs.single;

    // Regelsätze
    const rsErw = paar ? rs.partner * 2 : rs.single;
    const rsWeitere = e.erwWeitere * rs.erw;
    const rsKinder = e.k05 * rs.k05 + e.k613 * rs.k613 + kinderJug * rs.k1417;
    const rsSumme = rsErw + rsWeitere + rsKinder;

    // Mehrbedarfe
    const posten = [];

    if (ae) {
      const unter7 = Math.min(e.unter7, kinderGesamt);
      const unter16 = e.k05 + e.k613 + e.k1415;
      const p = alleinerziehendenSatz(kinderGesamt, unter7, unter16);
      if (p > 0) posten.push({
        name: "Alleinerziehende",
        detail: `${pct(p)} von ${euro(rs.single)}`,
        betrag: round2(rs.single * p)
      });
    }
    if (e.schwanger) posten.push({
      name: "Schwangerschaft",
      detail: `${pct(CONFIG.pctSchwanger)} von ${euro(bezugsRegelsatz)}`,
      betrag: round2(bezugsRegelsatz * CONFIG.pctSchwanger)
    });
    if (e.behinderung) posten.push({
      name: "Behinderung mit Teilhabeleistungen",
      detail: `${pct(CONFIG.pctBehinderung)} von ${euro(bezugsRegelsatz)}`,
      betrag: round2(bezugsRegelsatz * CONFIG.pctBehinderung)
    });
    if (e.warmwasser) {
      const ww = (paar ? 2 * rs.partner : rs.single) * CONFIG.pctWwErwachsene
        + e.erwWeitere * rs.erw * CONFIG.pctWwErwachsene
        + e.k05 * rs.k05 * CONFIG.pctWw05
        + e.k613 * rs.k613 * CONFIG.pctWw613
        + kinderJug * rs.k1417 * CONFIG.pctWw1417;
      posten.push({
        name: "Warmwasser über Strom",
        detail: "Pauschale je Person, nach Alter gestaffelt",
        betrag: round2(ww)
      });
    }
    if (e.ernaehrung > 0) posten.push({ name: "Kostenaufwändige Ernährung", detail: "dein angegebener Betrag", betrag: round2(e.ernaehrung) });
    if (e.sonstig > 0) posten.push({ name: "Weitere laufende Mehrkosten", detail: "dein angegebener Betrag", betrag: round2(e.sonstig) });

    const mbSumme = round2(posten.reduce((s, p) => s + p.betrag, 0));
    const gesamt = round2(rsSumme + mbSumme + e.miete);

    return { paar, kinderGesamt, rsErw, rsWeitere, rsKinder, rsSumme, posten, mbSumme, gesamt };
  }

  /* ---------- Ergebnis-HTML ---------- */
  function ergebnisHtml(e, r) {
    const datum = new Date().toLocaleDateString("de-DE");

    const kopf = r.mbSumme > 0 ? `
      <div class="mb-hero">
        <h2 class="mb-hero-label">Dein Mehrbedarf</h2>
        <p class="mb-hero-value">${euro(r.mbSumme)}</p>
        <p class="mb-hero-sub">pro Monat, zusätzlich zu den Regelsätzen</p>
      </div>` : `
      <div class="mb-empty">
        <h2>Nach deinen Angaben ergibt sich kein Mehrbedarf.</h2>
        <p>Mehrbedarfe gibt es zum Beispiel für Alleinerziehende, in der Schwangerschaft, bei Warmwasser über Strom,
        bei Behinderung mit Teilhabeleistungen oder bei ärztlich verordneter Ernährung. Wenn bei dir etwas davon
        zutrifft, gib es oben an und rechne erneut.</p>
      </div>`;

    const mbTabelle = r.posten.length ? `
      <div class="mb-section">
        <h3>So setzt sich dein Mehrbedarf zusammen</h3>
        <table class="mb-table">
          ${r.posten.map((p) => `<tr><td>${p.name}<span class="mb-detail">${p.detail}</span></td><td>${euro(p.betrag)}</td></tr>`).join("")}
          <tr class="mb-total"><td>Mehrbedarf gesamt</td><td>${euro(r.mbSumme)}</td></tr>
        </table>
      </div>` : "";

    const weitere = r.rsWeitere > 0 ? `<tr><td>Volljährige Kinder (18 bis 24)</td><td>${euro(r.rsWeitere)}</td></tr>` : "";
    const kinder = r.rsKinder > 0 ? `<tr><td>Kinder (${r.kinderGesamt})</td><td>${euro(r.rsKinder)}</td></tr>` : "";
    const miete = e.miete > 0 ? `<tr><td>Warmmiete (deine Angabe)</td><td>${euro(e.miete)}</td></tr>` : "";

    return `
    <article class="mb-result" id="mb_result_card">
      ${kopf}
      ${mbTabelle}

      <div class="mb-section">
        <h3>Dein Gesamtbedarf</h3>
        <p class="mb-lead">Das ist der Bedarf deines Haushalts pro Monat. Eigenes Einkommen und Vermögen werden angerechnet. Ausgezahlt wird nur der Unterschied.</p>
        <table class="mb-table">
          <tr><td>${r.paar ? "Regelsätze der Partner" : "Regelsatz"}</td><td>${euro(r.rsErw)}</td></tr>
          ${weitere}
          ${kinder}
          <tr class="mb-sum"><td>Regelsätze gesamt</td><td>${euro(r.rsSumme)}</td></tr>
          <tr><td>Mehrbedarfe</td><td>${euro(r.mbSumme)}</td></tr>
          ${miete}
          <tr class="mb-total"><td>${e.miete > 0 ? "Gesamtbedarf mit Miete" : "Gesamtbedarf ohne Miete"}</td><td>${euro(r.gesamt)}</td></tr>
        </table>
      </div>

      <div class="mb-notes">
        <p>Mehrbedarfe werden nicht automatisch gezahlt. Gib sie im Antrag oder gegenüber deinem Jobcenter ausdrücklich an und lege Nachweise bei, zum Beispiel Mutterpass, Attest oder Schwerbehindertenausweis.</p>
        <p>Die Miete übernimmt das Jobcenter nur in angemessener Höhe. Diese Prüfung ist in diesem Rechner nicht enthalten.</p>
      </div>

      <div class="mb-actions">
        <button type="button" id="mb_pdf_btn" class="button">Ergebnis als PDF speichern</button>
      </div>

      <p class="mb-meta">Berechnung vom ${datum}, Regelsätze ${CONFIG.jahr}. Dies ist eine Orientierung und ersetzt keinen Bescheid und keine Beratung. Verbindlich entscheidet das Jobcenter.</p>
    </article>`;
  }

  /* ---------- PDF-Export ---------- */
  function initPdf(out) {
    const btn = out.querySelector("#mb_pdf_btn");
    const card = out.querySelector("#mb_result_card");
    if (!btn || !card) return;

    btn.addEventListener("click", () => {
      if (typeof window.html2pdf !== "function") { window.print(); return; }

      const label = btn.textContent;
      btn.textContent = "PDF wird erstellt …";
      btn.disabled = true;

      const clone = card.cloneNode(true);
      const actions = clone.querySelector(".mb-actions");
      if (actions) actions.remove();
      Object.assign(clone.style, {
        position: "fixed", top: "0", left: "-9999px", width: "800px",
        backgroundColor: "#ffffff", border: "0", margin: "0"
      });
      document.body.appendChild(clone);

      const cleanup = () => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        btn.disabled = false;
      };

      window.html2pdf().from(clone).set({
        margin: [12, 12, 12, 12],
        filename: "mehrbedarf-berechnung.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      }).save().then(() => { cleanup(); btn.textContent = label; })
        .catch((err) => { console.error(err); cleanup(); btn.textContent = "Fehler, bitte erneut versuchen"; });
    });
  }

  /* ---------- Initialisierung ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    const el = {
      haushalt: $("mb_haushalt"), erw: $("mb_erw_weitere"),
      k05: $("mb_k_0_5"), k613: $("mb_k_6_13"), k1415: $("mb_k_14_15"), k1617: $("mb_k_16_17"),
      u7: $("mb_ae_u7"), aeWrap: $("mb_ae_wrap"),
      schw: $("mb_schw_flag"), ww: $("mb_ww_flag"), beh: $("mb_beh_flag"),
      ern: $("mb_ernaehrung"), sonst: $("mb_sonstig"), miete: $("mb_warmmiete"),
      rsSingle: $("mb_rs_single"), rsPartner: $("mb_rs_partner"), rsErw: $("mb_rs_erw_weitere"),
      rs05: $("mb_rs_0_5"), rs613: $("mb_rs_6_13"), rs1417: $("mb_rs_14_17")
    };
    const form = $("mb-form"), btn = $("mb_berechnen"), reset = $("mb_reset");
    const out = $("mb_ergebnis"), fehler = $("mb_fehler");
    if (!form || !btn || !out || !el.haushalt) return;

    const zeigeFehler = (text, feld) => {
      if (fehler) { fehler.textContent = text || ""; fehler.hidden = !text; }
      if (text && feld) feld.focus();
    };

    /* Hilfsfeld "Kinder unter 7": nur bei Alleinerziehenden sichtbar, folgt den Altersgruppen */
    let u7Geaendert = false;
    const syncAe = () => {
      const ae = el.haushalt.value === "ae";
      if (el.aeWrap) el.aeWrap.hidden = !ae;
      if (ae && el.u7 && !u7Geaendert) el.u7.value = String(anzahl(el.k05));
    };
    if (el.u7) el.u7.addEventListener("input", () => { u7Geaendert = true; });
    [el.haushalt, el.k05, el.k613, el.k1415, el.k1617].forEach((x) => x && x.addEventListener("input", syncAe));
    [el.haushalt].forEach((x) => x && x.addEventListener("change", syncAe));
    syncAe();

    const rechnen = () => {
      zeigeFehler("");
      out.innerHTML = "";

      const mitFallback = (feld, std) => { const v = num(feld); return v > 0 ? v : std; };
      const e = {
        haushalt: ["single", "ae", "paar"].includes(el.haushalt.value) ? el.haushalt.value : "single",
        erwWeitere: anzahl(el.erw),
        k05: anzahl(el.k05), k613: anzahl(el.k613), k1415: anzahl(el.k1415), k1617: anzahl(el.k1617),
        unter7: anzahl(el.u7),
        schwanger: el.schw.value === "ja",
        warmwasser: el.ww.value === "ja",
        behinderung: el.beh.value === "ja",
        ernaehrung: Math.max(0, num(el.ern)),
        sonstig: Math.max(0, num(el.sonst)),
        miete: Math.max(0, num(el.miete)),
        rs: {
          single: mitFallback(el.rsSingle, CONFIG.rs.single),
          partner: mitFallback(el.rsPartner, CONFIG.rs.partner),
          erw: mitFallback(el.rsErw, CONFIG.rs.erw),
          k05: mitFallback(el.rs05, CONFIG.rs.k05),
          k613: mitFallback(el.rs613, CONFIG.rs.k613),
          k1417: mitFallback(el.rs1417, CONFIG.rs.k1417)
        }
      };

      const kinder = e.k05 + e.k613 + e.k1415 + e.k1617;
      const grenze = CONFIG.maxKinderProGruppe;
      if ([e.k05, e.k613, e.k1415, e.k1617].some((k) => k > grenze)) return zeigeFehler("Bitte prüfe die Kinderzahl. Pro Altersgruppe sind höchstens " + grenze + " möglich.", el.k05);
      if (e.haushalt === "ae" && kinder === 0) return zeigeFehler("Als Alleinerziehende brauchst du mindestens ein Kind. Trage die Kinder ein oder wähle „Alleinstehend“.", el.k05);
      if (e.haushalt === "ae" && e.unter7 > kinder) return zeigeFehler("Es können nicht mehr Kinder unter 7 Jahren sein als Kinder insgesamt.", el.u7);

      out.innerHTML = ergebnisHtml(e, berechne(e));
      initPdf(out);
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    btn.addEventListener("click", rechnen);
    form.addEventListener("submit", (ev) => { ev.preventDefault(); rechnen(); });
    if (reset) reset.addEventListener("click", () => setTimeout(() => {
      out.innerHTML = ""; zeigeFehler(""); u7Geaendert = false; syncAe();
    }, 0));
  });
})();