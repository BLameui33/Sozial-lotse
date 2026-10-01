// freibetraege-buergergeld-rechner.js
// Freibeträge bei Erwerbseinkommen nach § 11b SGB II (Grundsicherung, früher Bürgergeld).
// Die Freibeträge richten sich nach dem BRUTTO, abgezogen werden sie vom NETTO.
// Rechtsstand: 2026. Werte jährlich im CONFIG-Block prüfen.

(() => {
  "use strict";

  const CONFIG = {
    jahr: 2026,
    fix: 100,                   // Grundfreibetrag / Pauschale für Absetzbeträge
    absetzGrenze: 400,          // ab diesem Brutto können höhere tatsächliche Absetzbeträge gelten
    zone1: { lo: 100, hi: 520, satz: 0.20 },
    zone2: { lo: 520, hi: 1000, satz: 0.30 },
    zone3: { lo: 1000, hiOhneKind: 1200, hiMitKind: 1500, satz: 0.10 },
    minijob: 603,               // Freibetrag für bestimmte Nebenjobs junger Menschen unter 25
    maxEinkommen: 20000
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

  /* ---------- Freibetrag auf Basis des Brutto ---------- */
  function freibetrag(brutto, p, o) {
    const B = Math.max(0, brutto);
    const anteil = (lo, hi) => Math.max(0, Math.min(B, Math.max(lo, hi)) - Math.max(0, lo));

    // Grundfreibetrag: 100 €, oder höhere tatsächliche Absetzbeträge bei Brutto über 400 €
    let grund = Math.min(B, p.fix);
    let grundAlsAbsetz = false;
    if (B > CONFIG.absetzGrenze && o.absetz > p.fix) { grund = Math.min(B, o.absetz); grundAlsAbsetz = true; }

    const z1b = anteil(p.z1_lo, p.z1_hi), z2b = anteil(p.z2_lo, p.z2_hi), z3b = anteil(p.z3_lo, p.z3_hi);
    const z1 = CONFIG.zone1.satz * z1b, z2 = CONFIG.zone2.satz * z2b, z3 = CONFIG.zone3.satz * z3b;
    let gesamt = grund + z1 + z2 + z3;

    // junge Menschen unter 25 in Schule/Ausbildung: mindestens Minijob-Grenze
    let jungeAnhebung = 0;
    if (o.junge) {
      const minimum = Math.min(B, CONFIG.minijob);
      if (minimum > gesamt) { jungeAnhebung = minimum - gesamt; gesamt = minimum; }
    }
    return { grund, grundAlsAbsetz, z1b, z2b, z3b, z1, z2, z3, jungeAnhebung, gesamt: round2(gesamt) };
  }

  /* ---------- Gesamtrechnung ---------- */
  function berechne(e) {
    const fb = freibetrag(e.brutto, e.params, { absetz: e.absetz, junge: e.junge });
    const anrechenbarErwerb = round2(Math.max(0, e.netto - fb.gesamt));
    const anrechenbarGesamt = round2(anrechenbarErwerb + e.weitere);
    const aufstockung = round2(Math.max(0, e.bedarf - anrechenbarGesamt));
    const verfuegbar = round2(e.netto + e.weitere + aufstockung);
    const abdeckung = e.bedarf > 0 ? Math.min(100, (anrechenbarGesamt / e.bedarf) * 100) : 0;
    return { fb, anrechenbarErwerb, anrechenbarGesamt, aufstockung, verfuegbar, abdeckung };
  }

  /* ---------- Ergebnis-HTML ---------- */
  function ergebnisHtml(e, r) {
    const datum = new Date().toLocaleDateString("de-DE");
    const f = r.fb;
    const hatAnspruch = r.aufstockung > 0;

    const kopf = hatAnspruch ? `
      <div class="fb-hero">
        <h2 class="fb-hero-label">Deine voraussichtliche Aufstockung</h2>
        <p class="fb-hero-value">${euro(r.aufstockung)}</p>
        <p class="fb-hero-sub">pro Monat. Zusammen mit deinem Einkommen hast du etwa ${euro(r.verfuegbar)} im Monat zur Verfügung.</p>
      </div>` : `
      <div class="fb-empty">
        <h2>Nach deinen Angaben besteht rechnerisch keine Aufstockung.</h2>
        <p>Dein anzurechnendes Einkommen von ${euro(r.anrechenbarGesamt)} liegt über deinem Bedarf von ${euro(e.bedarf)}.
        Wenn du nur knapp darüber liegst, kann ein Antrag auf Wohngeld oder Kinderzuschlag sinnvoll sein.</p>
      </div>`;

    const zeile = (name, detail, betrag) =>
      `<tr><td>${name}${detail ? `<span class="fb-detail">${detail}</span>` : ""}</td><td>${euro(betrag)}</td></tr>`;

    const stufen = [
      zeile("Grundfreibetrag",
        f.grundAlsAbsetz ? "dein höherer Betrag an tatsächlichen Absetzbeträgen" : "pauschal für Versicherungen und ähnliche Kosten",
        f.grund),
      f.z1b > 0 ? zeile("20 % Stufe", `von ${euro(f.z1b)} Brutto zwischen ${euro(e.params.z1_lo)} und ${euro(e.params.z1_hi)}`, f.z1) : "",
      f.z2b > 0 ? zeile("30 % Stufe", `von ${euro(f.z2b)} Brutto zwischen ${euro(e.params.z2_lo)} und ${euro(e.params.z2_hi)}`, f.z2) : "",
      f.z3b > 0 ? zeile("10 % Stufe", `von ${euro(f.z3b)} Brutto zwischen ${euro(e.params.z3_lo)} und ${euro(e.params.z3_hi)}`, f.z3) : "",
      f.jungeAnhebung > 0 ? zeile("Anhebung für junge Menschen", `Freibetrag mindestens in Höhe der Minijob-Grenze von ${euro(CONFIG.minijob)}`, f.jungeAnhebung) : ""
    ].join("");

    const weitere = e.weitere > 0 ? `<tr><td>Weiteres Einkommen<span class="fb-detail">ohne Freibetrag, voll angerechnet</span></td><td>+ ${euro(e.weitere)}</td></tr>` : "";

    return `
    <article class="fb-result" id="fb_result_card">
      ${kopf}

      <div class="fb-section">
        <h3>Dein Freibetrag</h3>
        <p class="fb-lead">Er wird nach deinem Brutto von ${euro(e.brutto)} bestimmt${e.kind ? ", mit minderjährigem Kind im Haushalt" : ""}.</p>
        <table class="fb-table">
          ${stufen}
          <tr class="fb-total"><td>Freibetrag gesamt</td><td>${euro(f.gesamt)}</td></tr>
        </table>
      </div>

      <div class="fb-section">
        <h3>Anrechnung und Aufstockung</h3>
        <div class="fb-bar" role="img" aria-label="Eigenes Einkommen deckt ${Math.round(r.abdeckung)} Prozent des Bedarfs">
          <span style="width:${r.abdeckung.toFixed(1)}%"></span>
        </div>
        <p class="fb-bar-caption">Dein anzurechnendes Einkommen deckt etwa ${Math.round(r.abdeckung)} % deines Bedarfs.</p>
        <table class="fb-table" style="margin-top:12px;">
          <tr><td>Netto-Einkommen aus Arbeit</td><td>${euro(e.netto)}</td></tr>
          <tr><td>Abzüglich Freibetrag</td><td>− ${euro(f.gesamt)}</td></tr>
          <tr class="fb-sum"><td>Anrechenbares Erwerbseinkommen</td><td>${euro(r.anrechenbarErwerb)}</td></tr>
          ${weitere}
          <tr class="fb-sum"><td>Anzurechnendes Einkommen gesamt</td><td>${euro(r.anrechenbarGesamt)}</td></tr>
          <tr><td>Dein Gesamtbedarf</td><td>${euro(e.bedarf)}</td></tr>
          <tr class="fb-total"><td>Aufstockung (Bedarf minus Einkommen)</td><td>${euro(r.aufstockung)}</td></tr>
        </table>
      </div>

      <div class="fb-notes">
        <p>Jedes Einkommen musst du dem Jobcenter melden, auch einen kleinen Minijob. Das Jobcenter rechnet dein Einkommen im Bescheid verbindlich an.</p>
        <p>Diese Berechnung gilt für Lohn aus einer Anstellung. Bei Selbstständigkeit zählen Betriebseinnahmen abzüglich der Betriebsausgaben, und es gelten weitere Regeln.</p>
        <p>Das Jobcenter prüft außerdem Vermögen und das Einkommen aller Personen in deiner Bedarfsgemeinschaft. Das ist hier nicht berücksichtigt.</p>
      </div>

      <div class="fb-actions">
        <button type="button" id="fb_pdf_btn" class="button">Ergebnis als PDF speichern</button>
      </div>

      <p class="fb-meta">Berechnung vom ${datum}, Rechtsstand ${CONFIG.jahr}. Dies ist eine Orientierung und ersetzt keinen Bescheid und keine Beratung. Verbindlich entscheidet das Jobcenter.</p>
    </article>`;
  }

  /* ---------- PDF-Export ---------- */
  function initPdf(out) {
    const btn = out.querySelector("#fb_pdf_btn");
    const card = out.querySelector("#fb_result_card");
    if (!btn || !card) return;

    btn.addEventListener("click", () => {
      if (typeof window.html2pdf !== "function") { window.print(); return; }

      const label = btn.textContent;
      btn.textContent = "PDF wird erstellt …";
      btn.disabled = true;

      const clone = card.cloneNode(true);
      const actions = clone.querySelector(".fb-actions");
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
        filename: "freibetraege-berechnung.pdf",
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
      brutto: $("fb_brutto"), netto: $("fb_netto"), weitere: $("fb_weitere"),
      bedarf: $("fb_bedarf"), kind: $("fb_kind_toggle"), junge: $("fb_junge"),
      absetz: $("fb_sonstig"),
      fix: $("fb_fix"), z1lo: $("fb_z1_lo"), z1hi: $("fb_z1_hi"),
      z2lo: $("fb_z2_lo"), z2hi: $("fb_z2_hi"), z3lo: $("fb_z3_lo"), z3hi: $("fb_z3_hi")
    };
    const form = $("fb-form"), btn = $("fb_berechnen"), reset = $("fb_reset");
    const out = $("fb_ergebnis"), fehler = $("fb_fehler");
    if (!form || !btn || !out || !el.brutto) return;

    const zeigeFehler = (text, feld) => {
      if (fehler) { fehler.textContent = text || ""; fehler.hidden = !text; }
      if (text && feld) feld.focus();
    };

    // Obergrenze der 10-%-Stufe folgt der Kinderfrage
    const setzeZ3Grenze = () => {
      if (el.z3hi && el.kind) el.z3hi.value = el.kind.value === "ja" ? CONFIG.zone3.hiMitKind : CONFIG.zone3.hiOhneKind;
    };
    if (el.kind) el.kind.addEventListener("change", () => { setzeZ3Grenze(); out.innerHTML = ""; });
    setzeZ3Grenze();

    const rechnen = () => {
      zeigeFehler("");
      out.innerHTML = "";

      if (leer(el.brutto)) return zeigeFehler("Bitte gib dein monatliches Brutto-Einkommen ein.", el.brutto);
      if (leer(el.netto)) return zeigeFehler("Bitte gib dein monatliches Netto-Einkommen ein. Bei einem Minijob ist es gleich dem Brutto.", el.netto);
      if (leer(el.bedarf)) return zeigeFehler("Bitte gib deinen monatlichen Gesamtbedarf ein. Du findest ihn in deinem Bescheid.", el.bedarf);

      const wert = (feld, std) => (leer(feld) ? std : Math.max(0, num(feld)));
      const e = {
        brutto: Math.max(0, num(el.brutto)),
        netto: Math.max(0, num(el.netto)),
        weitere: Math.max(0, num(el.weitere)),
        bedarf: Math.max(0, num(el.bedarf)),
        absetz: Math.max(0, num(el.absetz)),
        kind: el.kind && el.kind.value === "ja",
        junge: el.junge && el.junge.value === "ja",
        params: {
          fix: wert(el.fix, CONFIG.fix),
          z1_lo: wert(el.z1lo, CONFIG.zone1.lo), z1_hi: wert(el.z1hi, CONFIG.zone1.hi),
          z2_lo: wert(el.z2lo, CONFIG.zone2.lo), z2_hi: wert(el.z2hi, CONFIG.zone2.hi),
          z3_lo: wert(el.z3lo, CONFIG.zone3.lo), z3_hi: wert(el.z3hi, CONFIG.zone3.hiOhneKind)
        }
      };

      if (e.brutto > CONFIG.maxEinkommen || e.netto > CONFIG.maxEinkommen) return zeigeFehler("Bitte prüfe deine Eingabe: Gemeint sind Monatswerte, keine Jahreswerte.", el.brutto);
      if (e.netto > e.brutto) return zeigeFehler("Das Netto kann nicht höher sein als das Brutto. Bitte prüfe beide Werte.", el.netto);
      if (e.bedarf <= 0) return zeigeFehler("Der Gesamtbedarf muss größer als 0 € sein.", el.bedarf);

      out.innerHTML = ergebnisHtml(e, berechne(e));
      initPdf(out);
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    btn.addEventListener("click", rechnen);
    form.addEventListener("submit", (ev) => { ev.preventDefault(); rechnen(); });
    if (reset) reset.addEventListener("click", () => setTimeout(() => { out.innerHTML = ""; zeigeFehler(""); setzeZ3Grenze(); }, 0));
  });
})();