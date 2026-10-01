// alg1-rechner.js
// ALG-I-Anspruchscheck: Anwartschaftszeit (§ 142 SGB III), Anspruchsdauer (§ 147),
// Sperrzeit (§ 159) und Schätzung der Höhe (§ 153). Rechtsstand: 2026.
// Zahlen jährlich im CONFIG-Block prüfen.

(() => {
  "use strict";

  const CONFIG = {
    jahr: 2026,
    anwartschaftMonate: 12,     // Mindestversicherungszeit
    rahmenfristMonate: 30,      // innerhalb dieser Monate
    sperrzeitTage: 84,          // 12 Wochen
    tageProMonat: 30,

    // Höhe
    bbgRV: 8450,
    bbgKV: 5812.5,
    svPauschale: 0.21,
    satzOhneKind: 0.60,
    satzMitKind: 0.67,
    maxBrutto: 100000,
    vorsorgeRV: 0.093,
    vorsorgeKVPV: 0.102,
    werbungskosten: 1230,
    sonderausgaben: 36,
    soliFreigrenze: 20350,
    soliSatz: 0.055,
    soliMilderung: 0.119
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
  const leer = (el) => !el || String(el.value || "").trim() === "";
  const euro = (v) => (Number.isFinite(v) ? v : 0)
    .toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const round2 = (v) => Math.round(v * 100) / 100;
  const monate = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));

  /* ---------- Anspruch & Dauer (§ 142, § 147 SGB III) ---------- */
  function grunddauer(m) {
    if (m >= 24) return 12;
    if (m >= 20) return 10;
    if (m >= 16) return 8;
    if (m >= 12) return 6;
    return 0;
  }

  function anspruchsdauer(alter, m5) {
    const grund = grunddauer(m5);
    let dauer = grund;
    if (alter >= 50 && m5 >= 30) dauer = 15;
    if (alter >= 55 && m5 >= 36) dauer = 18;
    if (alter >= 58 && m5 >= 48) dauer = 24;
    return { grund, dauer };
  }

  // Sperrzeit mindert die Dauer um die Sperrzeittage, mindestens aber um ein Viertel
  function dauerMitSperrzeit(dauer) {
    const tage = dauer * CONFIG.tageProMonat;
    const minderung = Math.max(CONFIG.sperrzeitTage, tage / 4);
    return Math.max(0, (tage - minderung) / CONFIG.tageProMonat);
  }

  /* ---------- Höhe (Näherung, Tarif 2026) ---------- */
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
      default:    return tarif(zvE);
    }
  }

  function hoehe(brutto, klasse, kinder) {
    const gedeckelt = brutto > CONFIG.bbgRV;
    const basis = Math.min(brutto, CONFIG.bbgRV);
    const sv = basis * CONFIG.svPauschale;

    const rv = basis;
    const kv = Math.min(basis, CONFIG.bbgKV);
    const vorsorge = 12 * (rv * CONFIG.vorsorgeRV + kv * CONFIG.vorsorgeKVPV);
    const zvE = Math.max(0, 12 * basis - CONFIG.werbungskosten - CONFIG.sonderausgaben - vorsorge);
    const lstJ = lohnsteuerJahr(zvE, klasse);
    const frei = klasse === "sk3" ? CONFIG.soliFreigrenze * 2 : CONFIG.soliFreigrenze;
    const soliJ = lstJ > frei ? Math.min(CONFIG.soliSatz * lstJ, CONFIG.soliMilderung * (lstJ - frei)) : 0;

    const leistungsentgelt = basis - sv - lstJ / 12 - soliJ / 12;
    const satz = kinder ? CONFIG.satzMitKind : CONFIG.satzOhneKind;
    const alg = round2(leistungsentgelt * satz);
    return { gedeckelt, basis, leistungsentgelt, satz, alg, algTag: round2(alg / CONFIG.tageProMonat) };
  }

  /* ---------- Auswertung ---------- */
  function auswerten(e) {
    const hatAnspruch = e.m30 >= CONFIG.anwartschaftMonate;
    const r = { hatAnspruch, fehlend: Math.max(0, CONFIG.anwartschaftMonate - e.m30) };
    if (!hatAnspruch) return r;

    const m5 = Math.max(e.m60, e.m30);
    const d = anspruchsdauer(e.alter, m5);
    Object.assign(r, d, { m5, m5geschaetzt: e.m60Leer });
    r.sperrzeitMoeglich = e.ende === "eigen" || e.ende === "aufhebung";
    r.dauerMitSperrzeit = r.sperrzeitMoeglich ? dauerMitSperrzeit(d.dauer) : null;
    r.zuAlt = e.alter >= 66;
    if (e.brutto > 0) {
      r.hoehe = hoehe(e.brutto, e.klasse, e.kinder);
      r.gesamt = round2(r.hoehe.alg * d.dauer);
    }
    return r;
  }

  /* ---------- Ergebnis-HTML ---------- */
  function ergebnisHtml(e, r) {
    const datum = new Date().toLocaleDateString("de-DE");
    const meta = `<p class="ac-meta">Prüfung vom ${datum}, Rechtsstand ${CONFIG.jahr}. Dies ist eine Orientierung und keine Rechtsberatung. Verbindlich entscheidet die Agentur für Arbeit.</p>`;
    const aktionen = (extra = "") => `
      <div class="ac-actions">
        <button type="button" id="ac_pdf_btn" class="button">Ergebnis als PDF speichern</button>
        ${extra}
      </div>`;

    /* --- kein Anspruch --- */
    if (!r.hatAnspruch) {
      return `
      <article class="ac-result" id="ac_result_card">
        <div class="ac-status ac-status-nein">
          <h2>Nach deinen Angaben besteht aktuell voraussichtlich kein Anspruch.</h2>
          <p>In den letzten ${CONFIG.rahmenfristMonate} Monaten hast du ${monate(e.m30)} Monate Versicherungszeit.
          Nötig sind ${CONFIG.anwartschaftMonate} Monate, dir fehlen noch ${monate(r.fehlend)}.</p>
        </div>

        <div class="ac-section">
          <h3>Was du jetzt tun kannst</h3>
          <ol class="ac-steps">
            <li><strong>Trotzdem arbeitslos melden.</strong> Die Agentur prüft deinen Anspruch verbindlich und kennt Sonderregeln, zum Beispiel für kurz befristete Beschäftigungen.</li>
            <li><strong>Weitere Zeiten prüfen.</strong> Neben normalen Jobs zählen oft auch Ausbildung, Krankengeld oder Mutterschaftsgeld. Deine Arbeitgeber und die Rentenversicherung können dir Nachweise geben.</li>
            <li><strong>Grundsicherung beantragen.</strong> Wenn du kein Arbeitslosengeld bekommst und Unterstützung brauchst, ist das Jobcenter die richtige Anlaufstelle.</li>
          </ol>
        </div>
        ${aktionen()}
        ${meta}
      </article>`;
    }

    /* --- Anspruch --- */
    const mitAlter = r.dauer > r.grund
      ? `<tr><td>Verlängerung durch dein Alter</td><td>+ ${monate(r.dauer - r.grund)} Monate</td></tr>` : "";
    const sperrzeitZeile = r.sperrzeitMoeglich
      ? `<tr class="ac-muted"><td>Bei verhängter Sperrzeit (12 Wochen)</td><td>etwa ${monate(Math.round(r.dauerMitSperrzeit * 10) / 10)} Monate</td></tr>` : "";
    const dauerHinweis = r.m5geschaetzt
      ? `<p>Du hast keine Monate für die letzten 5 Jahre angegeben. Wenn du länger versichert warst, kann deine Anspruchsdauer höher sein.</p>` : "";

    const figuren = `
      <div class="ac-figures">
        <div>
          <p class="ac-figure-label">Bezugsdauer</p>
          <p class="ac-figure-value">bis zu ${monate(r.dauer)} Monate</p>
          <p class="ac-figure-sub">entspricht etwa ${r.dauer * CONFIG.tageProMonat} Tagen</p>
        </div>
        ${r.hoehe ? `
        <div>
          <p class="ac-figure-label">Geschätzte Höhe</p>
          <p class="ac-figure-value">${euro(r.hoehe.alg)}</p>
          <p class="ac-figure-sub">pro Monat, etwa ${euro(r.hoehe.algTag)} pro Tag</p>
        </div>` : ""}
      </div>`;

    const hoeheBlock = r.hoehe ? `
      <div class="ac-section">
        <h3>Höhe des Arbeitslosengeldes</h3>
        <p class="ac-lead">${STK_NAMEN[e.klasse]}, ${e.kinder ? "mit" : "ohne"} Kind. Die Steuerabzüge sind eine Näherung.</p>
        <table class="ac-table">
          <tr><td>Brutto${r.hoehe.gedeckelt ? " (begrenzt auf die Bemessungsgrenze)" : ""}</td><td>${euro(r.hoehe.basis)}</td></tr>
          <tr><td>Leistungsentgelt nach Abzügen</td><td>${euro(r.hoehe.leistungsentgelt)}</td></tr>
          <tr><td>Leistungssatz</td><td>${Math.round(r.hoehe.satz * 100)} %</td></tr>
          <tr class="ac-sum"><td>Arbeitslosengeld pro Monat</td><td>ca. ${euro(r.hoehe.alg)}</td></tr>
          <tr class="ac-total"><td>Höchstens über die ganze Bezugsdauer</td><td>ca. ${euro(r.gesamt)}</td></tr>
        </table>
      </div>` : "";

    const sperrzeitNote = r.sperrzeitMoeglich
      ? `<p>Bei eigener Kündigung oder einem Aufhebungsvertrag verhängt die Agentur häufig eine Sperrzeit von 12 Wochen. In dieser Zeit gibt es kein Geld, und die Bezugsdauer verkürzt sich. Mit einem wichtigen Grund kannst du das vermeiden. Lass dich vor der Unterschrift beraten.</p>` : "";
    const altersNote = r.zuAlt
      ? `<p>Mit Erreichen der Regelaltersgrenze endet der Anspruch auf Arbeitslosengeld I. Je nach Geburtsjahr liegt sie zwischen 66 und 67 Jahren.</p>` : "";

    return `
    <article class="ac-result" id="ac_result_card">
      <div class="ac-status">
        <h2>Du hast nach deinen Angaben voraussichtlich Anspruch auf Arbeitslosengeld I.</h2>
        <p>Du erfüllst die Anwartschaftszeit: ${monate(e.m30)} Monate Versicherungszeit in den letzten ${CONFIG.rahmenfristMonate} Monaten, nötig sind ${CONFIG.anwartschaftMonate}.</p>
      </div>

      ${figuren}

      <div class="ac-section">
        <h3>So kommt die Bezugsdauer zustande</h3>
        <p class="ac-lead">Alter ${e.alter} Jahre, ${monate(r.m5)} Monate Versicherungszeit in den letzten 5 Jahren.</p>
        <table class="ac-table">
          <tr><td>Grunddauer nach Versicherungszeit</td><td>${monate(r.grund)} Monate</td></tr>
          ${mitAlter}
          <tr class="ac-sum"><td>Bezugsdauer</td><td>bis zu ${monate(r.dauer)} Monate</td></tr>
          ${sperrzeitZeile}
        </table>
      </div>

      ${hoeheBlock}

      <div class="ac-section">
        <h3>So gehst du jetzt vor</h3>
        <ol class="ac-steps">
          <li><strong>Arbeitsuchend melden.</strong> Sobald du vom Ende deines Jobs weißt, spätestens drei Monate vorher. Wenn du später davon erfährst, innerhalb von drei Tagen. Sonst kann eine Sperrzeit von einer Woche drohen.</li>
          <li><strong>Arbeitslos melden.</strong> Am ersten Tag ohne Job, online oder persönlich bei der Agentur für Arbeit. Erst ab dann gibt es Geld.</li>
          <li><strong>Antrag stellen.</strong> Den Antrag auf Arbeitslosengeld stellst du online. Halte Personalausweis, Steuer-ID, Bankverbindung und die Arbeitsbescheinigung deines Arbeitgebers bereit.</li>
        </ol>
      </div>

      <div class="ac-notes">
        <p>Außer der Versicherungszeit musst du arbeitsfähig sein, dem Arbeitsmarkt zur Verfügung stehen und dich selbst um eine neue Stelle bemühen.</p>
        <p>Bei einer Abfindung ohne Einhaltung der Kündigungsfrist oder bei ausgezahltem Resturlaub kann der Anspruch zeitweise ruhen.</p>
        ${sperrzeitNote}
        ${altersNote}
        ${dauerHinweis}
      </div>

      ${aktionen(`<a class="button button-secondary" href="/alg1-netto-rechner/">Höhe genauer berechnen</a>`)}
      ${meta}
    </article>`;
  }

  /* ---------- PDF-Export ---------- */
  function initPdf(out) {
    const btn = out.querySelector("#ac_pdf_btn");
    const card = out.querySelector("#ac_result_card");
    if (!btn || !card) return;

    btn.addEventListener("click", () => {
      if (typeof window.html2pdf !== "function") { window.print(); return; }

      const label = btn.textContent;
      btn.textContent = "PDF wird erstellt …";
      btn.disabled = true;

      const clone = card.cloneNode(true);
      const actions = clone.querySelector(".ac-actions");
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
        filename: "alg1-anspruchscheck.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      }).save().then(() => { cleanup(); btn.textContent = label; })
        .catch((err) => { console.error(err); cleanup(); btn.textContent = "Fehler, bitte erneut versuchen"; });
    });
  }

  /* ---------- Initialisierung ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("alg-form");
    const el = {
      alter: document.getElementById("alg_alter"),
      kinder: document.getElementById("alg_kinder"),
      monate: document.getElementById("alg_monate"),
      monate60: document.getElementById("alg_monate60"),
      ende: document.getElementById("alg_ende"),
      brutto: document.getElementById("alg_brutto"),
      sk: document.getElementById("alg_steuerklasse")
    };
    const btn = document.getElementById("alg_berechnen");
    const reset = document.getElementById("alg_reset");
    const out = document.getElementById("alg_ergebnis");
    const fehler = document.getElementById("alg_fehler");
    if (!form || !btn || !out || !el.alter || !el.monate) return;

    const zeigeFehler = (text, feld) => {
      if (fehler) { fehler.textContent = text || ""; fehler.hidden = !text; }
      if (text && feld) feld.focus();
    };

    const pruefen = () => {
      zeigeFehler("");
      out.innerHTML = "";

      const alter = num(el.alter);
      const m30 = num(el.monate);
      const m60Leer = leer(el.monate60);
      const m60 = m60Leer ? m30 : num(el.monate60);
      const brutto = num(el.brutto);

      if (leer(el.alter) || alter < 15 || alter > 67) return zeigeFehler("Bitte gib ein Alter zwischen 15 und 67 Jahren ein.", el.alter);
      if (leer(el.monate) || m30 < 0) return zeigeFehler("Bitte gib deine Versicherungsmonate der letzten 30 Monate ein. Hast du keine, trage 0 ein.", el.monate);
      if (m30 > CONFIG.rahmenfristMonate) return zeigeFehler("In den letzten 30 Monaten können es höchstens 30 Monate sein.", el.monate);
      if (m60 > 60) return zeigeFehler("In den letzten 5 Jahren können es höchstens 60 Monate sein.", el.monate60);
      if (!m60Leer && m60 < m30) return zeigeFehler("Die Monate der letzten 5 Jahre schließen die letzten 30 Monate ein und können nicht weniger sein.", el.monate60);
      if (brutto < 0 || brutto > CONFIG.maxBrutto) return zeigeFehler("Bitte prüfe das Brutto: Gemeint ist ein Monatswert, kein Jahreswert.", el.brutto);

      const eingabe = {
        alter, m30, m60, m60Leer, brutto,
        kinder: el.kinder.value === "ja",
        klasse: el.sk.value in STK_NAMEN ? el.sk.value : "sk1",
        ende: el.ende ? el.ende.value : "ag"
      };

      out.innerHTML = ergebnisHtml(eingabe, auswerten(eingabe));
      initPdf(out);
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    btn.addEventListener("click", pruefen);
    form.addEventListener("submit", (ev) => { ev.preventDefault(); pruefen(); });
    if (reset) reset.addEventListener("click", () => setTimeout(() => { out.innerHTML = ""; zeigeFehler(""); }, 0));
  });
})();