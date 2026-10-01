// buergergeld-vorcheck.js
// Vorcheck Grundsicherungsgeld (früher Bürgergeld): Bedarf (§ 20, 21, 22 SGB II),
// Einkommen mit Freibeträgen (§ 11b) und Schonvermögen nach Alter (§ 12).
// Rechtsstand: 2026 (Regelsätze unverändert, Schonvermögen seit 1. Juli 2026). Werte jährlich im CONFIG-Block prüfen.

(() => {
  "use strict";

  const CONFIG = {
    jahr: 2026,
    rs: { single: 563, partner: 506, erw: 451, k05: 357, k613: 390, k1417: 471 },

    // Alleinerziehenden-Mehrbedarf, § 21 Abs. 3
    pctAeFest: 0.36, pctAeProKind: 0.12, pctAeMax: 0.60,

    // Freibeträge Erwerbseinkommen, § 11b
    fix: 100,
    zone1: { lo: 100, hi: 520, satz: 0.20 },
    zone2: { lo: 520, hi: 1000, satz: 0.30 },
    zone3: { lo: 1000, hiOhneKind: 1200, hiMitKind: 1500, satz: 0.10 },

    // Schonvermögen je Person nach Alter (ab 1. Juli 2026)
    schonvermoegen: [
      { bisAlter: 30, betrag: 5000 },
      { bisAlter: 40, betrag: 10000 },
      { bisAlter: 50, betrag: 12500 },
      { bisAlter: 200, betrag: 20000 }
    ],

    grenzBereich: 100,          // Spanne für „grenzwertig“ in €
    maxEinkommen: 20000
  };

  /* ---------- Hilfsfunktionen ---------- */
  const num = (el) => {
    if (!el) return 0;
    const v = Number(String(el.value || "").trim().replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };
  const leer = (el) => !el || String(el.value || "").trim() === "";
  const anzahl = (el) => Math.max(0, Math.floor(num(el)));
  const euro = (v) => (Number.isFinite(v) ? v : 0)
    .toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const euro0 = (v) => (Number.isFinite(v) ? v : 0).toLocaleString("de-DE", { maximumFractionDigits: 0 }) + " €";
  const round2 = (v) => Math.round(v * 100) / 100;
  const pct = (v) => (v * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " %";

  /* ---------- Bausteine ---------- */
  const schonFuerAlter = (alter) => CONFIG.schonvermoegen.find((s) => alter <= s.bisAlter).betrag;

  function aeProzent(kinder, unter7, unter16) {
    if (kinder <= 0) return 0;
    const fest = (unter7 >= 1 || unter16 === 2 || unter16 === 3) ? CONFIG.pctAeFest : 0;
    return Math.max(fest, Math.min(CONFIG.pctAeMax, CONFIG.pctAeProKind * kinder));
  }

  function freibetrag(brutto, mitKind) {
    const B = Math.max(0, brutto);
    const teil = (lo, hi) => Math.max(0, Math.min(B, hi) - lo);
    const z = CONFIG;
    const grund = Math.min(B, z.fix);
    const z1 = z.zone1.satz * teil(z.zone1.lo, z.zone1.hi);
    const z2 = z.zone2.satz * teil(z.zone2.lo, z.zone2.hi);
    const z3 = z.zone3.satz * teil(z.zone3.lo, mitKind ? z.zone3.hiMitKind : z.zone3.hiOhneKind);
    return round2(grund + z1 + z2 + z3);
  }

  /* ---------- Gesamtrechnung ---------- */
  function berechne(e) {
    const rs = e.rs, paar = e.haushalt === "paar", ae = e.haushalt === "ae";
    const jug = e.k1415 + e.k1617;
    const kinder = e.k05 + e.k613 + jug;

    // Bedarf
    const rsErw = paar ? rs.partner * 2 : rs.single;
    const rsWeitere = e.erwWeitere * rs.erw;
    const rsKinder = e.k05 * rs.k05 + e.k613 * rs.k613 + jug * rs.k1417;

    let aeProz = 0, aeBetrag = 0;
    if (ae) {
      aeProz = aeProzent(kinder, Math.min(e.unter7, kinder), e.k05 + e.k613 + e.k1415);
      aeBetrag = round2(rs.single * aeProz);
    }
    const kdu = e.mieteCap > 0 ? Math.min(e.miete, e.mieteCap) : e.miete;
    const kduGedeckelt = e.mieteCap > 0 && e.miete > e.mieteCap;
    const bedarf = round2(rsErw + rsWeitere + rsKinder + aeBetrag + e.mehrbedarf + kdu);

    // Einkommen
    const hatErwerb = e.brutto > 0 || e.netto > 0;
    const fb = hatErwerb ? freibetrag(e.brutto, kinder > 0) : 0;
    const erwerbAnr = round2(Math.max(0, e.netto - fb));
    const anrechenbar = round2(erwerbAnr + e.weitere);

    // Vermögen
    const personen = [{ name: "Du", alter: e.alter, betrag: schonFuerAlter(e.alter) }];
    if (paar) personen.push({ name: "Partner", alter: e.alterPartner, betrag: schonFuerAlter(e.alterPartner) });
    if (e.erwWeitere > 0) personen.push({ name: `Volljährige Kinder (${e.erwWeitere})`, betrag: schonFuerAlter(24) * e.erwWeitere });
    if (kinder > 0) personen.push({ name: `Minderjährige Kinder (${kinder})`, betrag: schonFuerAlter(0) * kinder });
    const schon = personen.reduce((s, p) => s + p.betrag, 0);
    const vermUeber = Math.max(0, e.vermoegen - schon);

    // Einordnung
    const luecke = round2(bedarf - anrechenbar);
    let urteil;
    if (vermUeber > 0) urteil = "vermoegen";
    else if (luecke > CONFIG.grenzBereich) urteil = "ja";
    else if (luecke >= -CONFIG.grenzBereich) urteil = "grenz";
    else urteil = "nein";

    return { kinder, rsErw, rsWeitere, rsKinder, aeProz, aeBetrag, kdu, kduGedeckelt, bedarf,
             hatErwerb, fb, erwerbAnr, anrechenbar, personen, schon, vermUeber, luecke, urteil };
  }

  /* ---------- Ergebnis-HTML ---------- */
  function ergebnisHtml(e, r) {
    const datum = new Date().toLocaleDateString("de-DE");
    const z = (name, detail, betrag, plus) =>
      `<tr><td>${name}${detail ? `<span class="bg-detail">${detail}</span>` : ""}</td><td>${plus ? "+ " : ""}${euro(betrag)}</td></tr>`;

    const texte = {
      ja: ["Du hast nach deinen Angaben voraussichtlich Anspruch.",
           `Dein Bedarf liegt um ${euro(r.luecke)} über deinem anzurechnenden Einkommen, und dein Vermögen liegt im geschützten Bereich.`],
      grenz: ["Dein Fall liegt im Grenzbereich.",
              "Bedarf und Einkommen liegen nah beieinander. Schon kleine Abweichungen, etwa bei der Miete, können über einen Anspruch entscheiden. Ein Antrag lohnt sich, damit das Jobcenter genau rechnet."],
      nein: ["Nach deinen Angaben besteht eher kein Anspruch.",
             `Dein anzurechnendes Einkommen liegt um ${euro(Math.abs(r.luecke))} über deinem Bedarf. Wenn du knapp darüber liegst, kann ein Antrag auf Wohngeld oder Kinderzuschlag sinnvoll sein.`],
      vermoegen: ["Dein Vermögen liegt über dem Schonvermögen.",
                  `Du liegst ${euro0(r.vermUeber)} über der Grenze. Dieser Betrag muss zuerst eingesetzt werden. Danach kann ein Anspruch entstehen.`]
    }[r.urteil];

    const hero = (r.urteil === "ja" || r.urteil === "grenz") && r.luecke > 0 ? `
      <div class="bg-hero">
        <h3 class="bg-hero-label" style="font-weight:400;">Voraussichtlicher Anspruch</h3>
        <p class="bg-hero-value">${euro(r.luecke)}</p>
        <p class="bg-hero-sub">pro Monat, grob geschätzt aus Bedarf minus Einkommen</p>
      </div>` : "";

    const bedarfZeilen = [
      z(e.haushalt === "paar" ? "Regelsätze der Partner" : "Regelsatz", "", r.rsErw),
      r.rsWeitere > 0 ? z("Volljährige Kinder (18 bis 24)", "", r.rsWeitere) : "",
      r.rsKinder > 0 ? z(`Kinder (${r.kinder})`, "", r.rsKinder) : "",
      r.aeBetrag > 0 ? z("Alleinerziehenden-Mehrbedarf", `${pct(r.aeProz)} von ${euro(e.rs.single)}`, r.aeBetrag) : "",
      e.mehrbedarf > 0 ? z("Weitere Mehrbedarfe", "deine Angabe", e.mehrbedarf) : "",
      e.miete > 0 ? z("Unterkunft und Heizung", r.kduGedeckelt ? `begrenzt auf die Angemessenheitsgrenze von ${euro(e.mieteCap)}` : "deine Warmmiete", r.kdu) : ""
    ].join("");

    const einkZeilen = [
      r.hatErwerb ? z("Netto aus Arbeit", "", e.netto) : "",
      r.hatErwerb ? `<tr class="bg-minus"><td>Abzüglich Freibetrag<span class="bg-detail">nach dem Brutto von ${euro(e.brutto)}</span></td><td>− ${euro(r.fb)}</td></tr>` : "",
      r.hatErwerb ? z("Anrechenbares Erwerbseinkommen", "", r.erwerbAnr) : "",
      e.weitere > 0 ? z("Weiteres Einkommen", "voll angerechnet", e.weitere, true) : "",
      !r.hatErwerb && e.weitere <= 0 ? `<tr><td>Kein Einkommen angegeben</td><td>${euro(0)}</td></tr>` : ""
    ].join("");

    const personenZeilen = r.personen.map((p) =>
      z(p.name, p.alter ? `Alter ${p.alter}` : "", p.betrag)).join("");

    const schritte = (r.urteil === "ja" || r.urteil === "grenz") ? `
      <div class="bg-section">
        <h3>So gehst du jetzt vor</h3>
        <ol class="bg-steps">
          <li><strong>Antrag stellen.</strong> Beim Jobcenter, online oder persönlich. Stelle ihn möglichst früh. Leistungen gibt es erst ab dem Monat der Antragstellung, nicht für frühere Monate.</li>
          <li><strong>Unterlagen sammeln.</strong> Mietvertrag, Kontoauszüge, Gehaltsabrechnungen, Nachweise über Vermögen, Personalausweis und Angaben zu allen Personen im Haushalt.</li>
          <li><strong>Einkommen melden.</strong> Jede Änderung beim Einkommen musst du dem Jobcenter sofort mitteilen.</li>
        </ol>
      </div>` : "";

    return `
    <article class="bg-result" id="bg_result_card">
      <div class="bg-status ${r.urteil === "ja" ? "bg-status-ja" : ""}">
        <h2>${texte[0]}</h2>
        <p>${texte[1]}</p>
      </div>

      ${hero}

      <div class="bg-section">
        <h3>Dein Bedarf</h3>
        <table class="bg-table">
          ${bedarfZeilen}
          <tr class="bg-total"><td>Gesamtbedarf</td><td>${euro(r.bedarf)}</td></tr>
        </table>
      </div>

      <div class="bg-section">
        <h3>Dein anzurechnendes Einkommen</h3>
        <table class="bg-table">
          ${einkZeilen}
          <tr class="bg-total"><td>Anzurechnendes Einkommen</td><td>${euro(r.anrechenbar)}</td></tr>
        </table>
      </div>

      <div class="bg-section">
        <h3>Dein Erspartes</h3>
        <p class="bg-lead">Das Schonvermögen wird für jede Person nach Alter berechnet.</p>
        <table class="bg-table">
          ${personenZeilen}
          <tr class="bg-sum"><td>Schonvermögen gesamt</td><td>${euro0(r.schon)}</td></tr>
          <tr><td>Dein Vermögen</td><td>${euro0(e.vermoegen)}</td></tr>
          <tr class="bg-total"><td>${r.vermUeber > 0 ? "Darüber hinaus" : "Platz bis zur Grenze"}</td><td>${euro0(r.vermUeber > 0 ? r.vermUeber : r.schon - e.vermoegen)}</td></tr>
        </table>
      </div>

      ${schritte}

      <div class="bg-notes">
        <p>Grundsicherungsgeld bekommen Menschen ab 15 Jahren bis zur Regelaltersgrenze, die mindestens 3 Stunden am Tag arbeiten können und in Deutschland leben. Wer nicht erwerbsfähig ist, erhält stattdessen Leistungen vom Sozialamt.</p>
        <p>Ob deine Miete angemessen ist, prüft dieser Vorcheck nicht. Das entscheidet das Jobcenter nach den Regeln deiner Kommune.</p>
      </div>

      <div class="bg-actions">
        <button type="button" id="bg_pdf_btn" class="button">Ergebnis als PDF speichern</button>
        <a class="button button-secondary" href="freibetraege-buergergeld-rechner.html">Aufstockung genauer berechnen</a>
      </div>

      <p class="bg-meta">Berechnung vom ${datum}, Rechtsstand ${CONFIG.jahr}. Dies ist eine Orientierung und ersetzt keinen Bescheid und keine Beratung. Verbindlich entscheidet das Jobcenter.</p>
    </article>`;
  }

  /* ---------- PDF-Export ---------- */
  function initPdf(out) {
    const btn = out.querySelector("#bg_pdf_btn");
    const card = out.querySelector("#bg_result_card");
    if (!btn || !card) return;

    btn.addEventListener("click", () => {
      if (typeof window.html2pdf !== "function") { window.print(); return; }

      const label = btn.textContent;
      btn.textContent = "PDF wird erstellt …";
      btn.disabled = true;

      const clone = card.cloneNode(true);
      const actions = clone.querySelector(".bg-actions");
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
        filename: "grundsicherungsgeld-vorcheck.pdf",
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
      haushalt: $("bg_haushalt"), alter: $("bg_alter"), alterP: $("bg_alter_partner"), alterPWrap: $("bg_alter_partner_wrap"),
      k05: $("bg_k_0_5"), k613: $("bg_k_6_13"), k1415: $("bg_k_14_15"), k1617: $("bg_k_16_17"),
      u7: $("bg_ae_u7"), aeWrap: $("bg_ae_wrap"), erw: $("bg_erw_weitere"),
      miete: $("bg_warmmiete"), cap: $("bg_miete_cap"), mb: $("bg_mehrbedarf"),
      brutto: $("bg_brutto"), netto: $("bg_netto"), weitere: $("bg_weitere"), verm: $("bg_vermoegen"),
      rsSingle: $("bg_rs_single"), rsPartner: $("bg_rs_partner"), rsErw: $("bg_rs_erw_weitere"),
      rs05: $("bg_rs_0_5"), rs613: $("bg_rs_6_13"), rs1417: $("bg_rs_14_17")
    };
    const form = $("bg-form"), btn = $("bg_berechnen"), reset = $("bg_reset");
    const out = $("bg_ergebnis"), fehler = $("bg_fehler");
    if (!form || !btn || !out || !el.haushalt) return;

    const zeigeFehler = (text, feld) => {
      if (fehler) { fehler.textContent = text || ""; fehler.hidden = !text; }
      if (text && feld) feld.focus();
    };

    /* Sichtbarkeit: Partner-Alter nur bei Paaren, „Kinder unter 7“ nur bei Alleinerziehenden */
    let u7Geaendert = false;
    const sync = () => {
      const h = el.haushalt.value;
      if (el.alterPWrap) el.alterPWrap.hidden = h !== "paar";
      if (el.aeWrap) el.aeWrap.hidden = h !== "ae";
      if (h === "ae" && el.u7 && !u7Geaendert) el.u7.value = String(anzahl(el.k05));
    };
    if (el.u7) el.u7.addEventListener("input", () => { u7Geaendert = true; });
    [el.haushalt, el.k05].forEach((x) => x && x.addEventListener("input", sync));
    el.haushalt.addEventListener("change", sync);
    sync();

    const rechnen = () => {
      zeigeFehler("");
      out.innerHTML = "";

      const wert = (feld, std) => { const v = num(feld); return v > 0 ? v : std; };
      const haushalt = ["single", "ae", "paar"].includes(el.haushalt.value) ? el.haushalt.value : "single";
      const alter = num(el.alter);
      const alterPartner = leer(el.alterP) ? alter : num(el.alterP);

      const e = {
        haushalt, alter, alterPartner,
        erwWeitere: anzahl(el.erw),
        k05: anzahl(el.k05), k613: anzahl(el.k613), k1415: anzahl(el.k1415), k1617: anzahl(el.k1617),
        unter7: anzahl(el.u7),
        miete: Math.max(0, num(el.miete)), mieteCap: Math.max(0, num(el.cap)),
        mehrbedarf: Math.max(0, num(el.mb)),
        brutto: Math.max(0, num(el.brutto)), netto: Math.max(0, num(el.netto)),
        weitere: Math.max(0, num(el.weitere)),
        vermoegen: Math.max(0, num(el.verm)),
        rs: {
          single: wert(el.rsSingle, CONFIG.rs.single), partner: wert(el.rsPartner, CONFIG.rs.partner),
          erw: wert(el.rsErw, CONFIG.rs.erw), k05: wert(el.rs05, CONFIG.rs.k05),
          k613: wert(el.rs613, CONFIG.rs.k613), k1417: wert(el.rs1417, CONFIG.rs.k1417)
        }
      };
      const kinder = e.k05 + e.k613 + e.k1415 + e.k1617;

      if (leer(el.alter) || alter < 15 || alter > 67) return zeigeFehler("Bitte gib dein Alter an (zwischen 15 und 67 Jahren). Es bestimmt dein Schonvermögen.", el.alter);
      if (haushalt === "paar" && !leer(el.alterP) && (alterPartner < 15 || alterPartner > 100)) return zeigeFehler("Bitte prüfe das Alter deines Partners.", el.alterP);
      if (haushalt === "ae" && kinder === 0) return zeigeFehler("Als Alleinerziehende brauchst du mindestens ein Kind. Trage die Kinder ein oder wähle „Alleinstehend“.", el.k05);
      if (haushalt === "ae" && e.unter7 > kinder) return zeigeFehler("Es können nicht mehr Kinder unter 7 Jahren sein als Kinder insgesamt.", el.u7);
      if (e.miete <= 0 && leer(el.miete)) return zeigeFehler("Bitte trage deine Warmmiete ein. Wohnst du mietfrei, trage 0 ein.", el.miete);
      if ((!leer(el.brutto) && leer(el.netto)) || (leer(el.brutto) && !leer(el.netto))) return zeigeFehler("Bitte trage für das Einkommen aus Arbeit Brutto und Netto ein. Bei einem Minijob sind beide gleich.", leer(el.brutto) ? el.brutto : el.netto);
      if (e.netto > e.brutto) return zeigeFehler("Das Netto kann nicht höher sein als das Brutto. Bitte prüfe beide Werte.", el.netto);
      if (e.brutto > CONFIG.maxEinkommen || e.weitere > CONFIG.maxEinkommen) return zeigeFehler("Bitte prüfe deine Eingabe: Gemeint sind Monatswerte, keine Jahreswerte.", el.brutto);

      out.innerHTML = ergebnisHtml(e, berechne(e));
      initPdf(out);
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    btn.addEventListener("click", rechnen);
    form.addEventListener("submit", (ev) => { ev.preventDefault(); rechnen(); });
    if (reset) reset.addEventListener("click", () => setTimeout(() => { out.innerHTML = ""; zeigeFehler(""); u7Geaendert = false; sync(); }, 0));
  });
})();