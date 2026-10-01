// alg1-netto-rechner.js
// Schätzung des Arbeitslosengeldes I nach pauschaliertem Nettoentgelt (§ 153 SGB III)

(() => {
  "use strict";

  /* ---------- Konfiguration (jährlich prüfen) ---------- */
  const CONFIG = {
    jahr: 2026,
    bbgRV: 8450,            // Beitragsbemessungsgrenze Renten-/Arbeitslosenvers., West, € / Monat
    bbgKV: 5812.5,          // Beitragsbemessungsgrenze Kranken-/Pflegeversicherung, € / Monat
    svPauschale: 0.21,      // pauschaler Abzug für Sozialversicherung im Leistungsentgelt
    satzOhneKind: 0.60,
    satzMitKind: 0.67,
    tageProMonat: 30,       // ALG wird je Kalendertag berechnet, ein Monat zählt 30 Tage
    maxBrutto: 100000,      // Plausibilitätsgrenze der Eingabe

    // Näherung der Vorsorgepauschale (nur für die Steuerberechnung)
    vorsorgeRV: 0.093,
    vorsorgeKVPV: 0.102,
    werbungskosten: 1230,
    sonderausgaben: 36,

    // Solidaritätszuschlag
    soliFreigrenze: 20350,  // Lohnsteuer p. a. (Splitting: doppelt)
    soliSatz: 0.055,
    soliMilderung: 0.119,

    // Näherung Arbeitnehmeranteile für die Netto-Schätzung
    anAnteilRVAV: 0.106,    // RV 9,3 % + AV 1,3 %
    anAnteilKVPV: 0.1055    // KV 7,3 % + halber Zusatzbeitrag + PV
  };

  const STK_NAMEN = {
    sk1: "Steuerklasse 1", sk3: "Steuerklasse 3", sk4: "Steuerklasse 4",
    sk5: "Steuerklasse 5", sk6: "Steuerklasse 6"
  };

  /* ---------- Hilfsfunktionen ---------- */
  const num = (el) => {
    if (!el) return 0;
    const v = Number(String(el.value || "").trim().replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };
  const euro = (v) => (Number.isFinite(v) ? v : 0)
    .toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const round2 = (v) => Math.round(v * 100) / 100;

  /* ---------- Steuerberechnung (Einkommensteuertarif § 32a EStG, 2026) ---------- */
  function tarif(zvE) {
    const x = Math.floor(Math.max(0, zvE));
    if (x <= 12348) return 0;
    if (x <= 17799) { const y = (x - 12348) / 10000; return Math.floor((914.51 * y + 1400) * y); }
    if (x <= 69878) { const z = (x - 17799) / 10000; return Math.floor((173.1 * z + 2397) * z + 1034.87); }
    if (x <= 277825) return Math.floor(0.42 * x - 11135.63);
    return Math.floor(0.45 * x - 19470.38);
  }

  function lohnsteuerJahr(zvE, klasse) {
    switch (klasse) {
      case "sk3": return 2 * tarif(zvE / 2);
      case "sk5":
      case "sk6": return Math.max(2 * (tarif(1.25 * zvE) - tarif(0.75 * zvE)), 0.14 * zvE);
      default:    return tarif(zvE); // sk1, sk4
    }
  }

  function steuerMonat(brutto, klasse) {
    const rv = Math.min(brutto, CONFIG.bbgRV);
    const kv = Math.min(brutto, CONFIG.bbgKV);
    const vorsorge = 12 * (rv * CONFIG.vorsorgeRV + kv * CONFIG.vorsorgeKVPV);
    const zvE = Math.max(0, 12 * brutto - CONFIG.werbungskosten - CONFIG.sonderausgaben - vorsorge);
    const lst = lohnsteuerJahr(zvE, klasse);

    const frei = klasse === "sk3" ? CONFIG.soliFreigrenze * 2 : CONFIG.soliFreigrenze;
    let soli = 0;
    if (lst > frei) soli = Math.min(CONFIG.soliSatz * lst, CONFIG.soliMilderung * (lst - frei));

    return { lst: lst / 12, soli: soli / 12 };
  }

  /* ---------- Kernberechnung ---------- */
  function berechne({ brutto, klasse, kinder, nettoAngabe }) {
    const gedeckelt = brutto > CONFIG.bbgRV;
    const basis = Math.min(brutto, CONFIG.bbgRV);

    const sv = basis * CONFIG.svPauschale;
    const { lst, soli } = steuerMonat(basis, klasse);
    const leistungsentgelt = basis - sv - lst - soli;

    const satz = kinder ? CONFIG.satzMitKind : CONFIG.satzOhneKind;
    const alg = round2(leistungsentgelt * satz);
    const algTag = round2(alg / CONFIG.tageProMonat);

    // bisheriges Netto: Angabe oder Schätzung aus echtem Brutto
    let nettoAlt, nettoGeschaetzt = false;
    if (nettoAngabe > 0) {
      nettoAlt = nettoAngabe;
    } else {
      const s = steuerMonat(brutto, klasse);
      const svAN = Math.min(brutto, CONFIG.bbgRV) * CONFIG.anAnteilRVAV
                 + Math.min(brutto, CONFIG.bbgKV) * CONFIG.anAnteilKVPV;
      nettoAlt = brutto - svAN - s.lst - s.soli;
      nettoGeschaetzt = true;
    }
    const luecke = nettoAlt - alg;
    const anteil = nettoAlt > 0 ? Math.max(0, Math.min(100, (alg / nettoAlt) * 100)) : 0;

    return { gedeckelt, basis, sv, lst, soli, leistungsentgelt, satz, alg, algTag,
             nettoAlt, nettoGeschaetzt, luecke, anteil };
  }

  /* ---------- Ergebnis-HTML ---------- */
  function ergebnisHtml(eingabe, r) {
    const prozent = Math.round(r.satz * 100);
    const datum = new Date().toLocaleDateString("de-DE");
    const soliZeile = r.soli > 0.005
      ? `<tr class="an-minus"><td>Solidaritätszuschlag</td><td>− ${euro(r.soli)}</td></tr>` : "";

    const luecke = r.luecke > 0.5
      ? `<tr class="an-sum"><td>Monatliche Differenz</td><td>− ${euro(r.luecke)}</td></tr>`
      : `<tr class="an-sum"><td>Monatliche Differenz</td><td>keine</td></tr>`;

    const hinweisBBG = r.gedeckelt
      ? `<p>Dein Brutto liegt über der Beitragsbemessungsgrenze. Für die Berechnung wurden ${euro(r.basis)} angesetzt.</p>` : "";

    return `
    <article class="an-result" id="an_result_card">
      <div class="an-hero">
        <h2 class="an-hero-label" style="font-weight:400;">Dein geschätztes Arbeitslosengeld I</h2>
        <p class="an-hero-value">${euro(r.alg)}</p>
        <p class="an-hero-sub">pro Monat, das sind etwa ${euro(r.algTag)} pro Kalendertag</p>
      </div>

      <div class="an-section">
        <h3>So setzt sich der Betrag zusammen</h3>
        <p class="an-lead">${STK_NAMEN[eingabe.klasse]}, ${eingabe.kinder ? "mit" : "ohne"} Kind, Leistungssatz ${prozent} %.</p>
        <table class="an-table">
          <tr><td>Brutto${r.gedeckelt ? " (begrenzt auf die Bemessungsgrenze)" : ""}</td><td>${euro(r.basis)}</td></tr>
          <tr class="an-minus"><td>Sozialversicherungspauschale (21 %)</td><td>− ${euro(r.sv)}</td></tr>
          <tr class="an-minus"><td>Lohnsteuer</td><td>− ${euro(r.lst)}</td></tr>
          ${soliZeile}
          <tr class="an-sum"><td>Leistungsentgelt</td><td>${euro(r.leistungsentgelt)}</td></tr>
          <tr class="an-total"><td>Arbeitslosengeld (${prozent} % davon)</td><td>${euro(r.alg)}</td></tr>
        </table>
      </div>

      <div class="an-section">
        <h3>Vergleich mit deinem bisherigen Netto</h3>
        <div class="an-bar" role="img" aria-label="Arbeitslosengeld entspricht ${Math.round(r.anteil)} Prozent des bisherigen Nettos">
          <span style="width:${r.anteil.toFixed(1)}%"></span>
        </div>
        <p class="an-bar-caption">Das Arbeitslosengeld entspricht etwa ${Math.round(r.anteil)} % deines bisherigen Nettos.</p>
        <table class="an-table" style="margin-top:12px;">
          <tr><td>Bisheriges Netto${r.nettoGeschaetzt ? " (geschätzt)" : ""}</td><td>${euro(r.nettoAlt)}</td></tr>
          <tr><td>Arbeitslosengeld I</td><td>${euro(r.alg)}</td></tr>
          ${luecke}
        </table>
      </div>

      <div class="an-notes">
        <p>Kranken-, Pflege- und Rentenversicherung übernimmt während des Bezugs die Agentur für Arbeit. Von dem Betrag oben musst du diese Beiträge nicht selbst zahlen.</p>
        <p>Kirchensteuer wird bei der Berechnung nicht berücksichtigt. Das Arbeitslosengeld ist steuerfrei, erhöht aber den Steuersatz auf andere Einkünfte (Progressionsvorbehalt).</p>
        ${hinweisBBG}
      </div>

      <div class="an-actions">
        
        <a class="button button-secondary" href="https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/arbeitslosengeld">ALG I beantragen</a>
      </div>

      <p class="an-meta">Berechnung vom ${datum}, Rechtsstand ${CONFIG.jahr}. Dies ist eine Näherung. Maßgeblich ist allein der Bescheid der Agentur für Arbeit.</p>
    </article>`;
  }

  /* ---------- PDF-Export ---------- */
  function initPdf(out) {
    const btn = out.querySelector("#an_pdf_btn");
    const card = out.querySelector("#an_result_card");
    if (!btn || !card) return;

    btn.addEventListener("click", () => {
      if (typeof window.html2pdf !== "function") { window.print(); return; }

      const label = btn.textContent;
      btn.textContent = "PDF wird erstellt …";
      btn.disabled = true;

      const clone = card.cloneNode(true);
      const actions = clone.querySelector(".an-actions");
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
        filename: "alg1-netto-berechnung.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      }).save().then(() => { cleanup(); btn.textContent = label; })
        .catch((err) => { console.error(err); cleanup(); btn.textContent = "Fehler, bitte erneut versuchen"; });
    });
  }

  /* ---------- Initialisierung ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("alg-netto-form");
    const el = {
      brutto: document.getElementById("an_brutto"),
      stk: document.getElementById("an_stk"),
      kinder: document.getElementById("an_kinder"),
      netto: document.getElementById("an_netto")
    };
    const btn = document.getElementById("an_berechnen");
    const reset = document.getElementById("an_reset");
    const out = document.getElementById("an_ergebnis");
    const fehler = document.getElementById("an_fehler");
    if (!form || !btn || !out || !el.brutto) return;

    const zeigeFehler = (text) => {
      if (!fehler) return;
      fehler.textContent = text || "";
      fehler.hidden = !text;
    };

    const rechnen = () => {
      zeigeFehler("");
      out.innerHTML = "";

      const brutto = num(el.brutto);
      const netto = num(el.netto);

      if (brutto <= 0) { zeigeFehler("Bitte gib dein monatliches Brutto ein (größer als 0 €)."); el.brutto.focus(); return; }
      if (brutto > CONFIG.maxBrutto) { zeigeFehler("Bitte prüfe deine Eingabe: Das Brutto ist ein Monatswert, kein Jahreswert."); el.brutto.focus(); return; }
      if (netto > 0 && netto >= brutto) { zeigeFehler("Das bisherige Netto muss niedriger sein als das Brutto."); el.netto.focus(); return; }

      const eingabe = {
        brutto,
        klasse: el.stk.value in STK_NAMEN ? el.stk.value : "sk1",
        kinder: el.kinder.value === "ja",
        nettoAngabe: netto
      };

      out.innerHTML = ergebnisHtml(eingabe, berechne(eingabe));
      initPdf(out);
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    btn.addEventListener("click", rechnen);
    form.addEventListener("submit", (e) => { e.preventDefault(); rechnen(); });
    if (reset) reset.addEventListener("click", () => setTimeout(() => { out.innerHTML = ""; zeigeFehler(""); }, 0));
  });
})();