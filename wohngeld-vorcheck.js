// wohngeld-vorcheck.js – Nutzerfreundlich & automatisiert
// Long-Tail-Variante: Fokus auf Alleinerziehende mit Unterhalt/Unterhaltsvorschuss

function n(el){
  if(!el) return 0;

  const raw = (el.value || "")
    .toString()
    .replace(",", ".");

  const v = Number(raw);

  return Number.isFinite(v) ? v : 0;
}

function euro(v){
  const x = Number.isFinite(v) ? v : 0;
  return x.toFixed(2).replace(".", ",") + " €";
}

function clamp(v, min, max){
  return Math.min(Math.max(v, min), max);
}

function errorBox(msgs){
  if (!msgs.length) return "";

  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid #e53935; padding: 15px; background: #fff3f3; margin-top: 20px;">
      <h3 style="margin-top: 0; color: #d32f2f;">Bitte Angaben prüfen:</h3>
      <ul style="margin-bottom: 0;">
        ${msgs.map(m => `<li>${m}</li>`).join("")}
      </ul>
    </div>
  `;
}

function badge(kind){
  const map = {
    pos: {
      label:"Rechnerisch Anspruch vorhanden",
      color:"#2e7d32",
      bg:"#e8f5e9"
    },
    warn:{
      label:"Prüfung erforderlich",
      color:"#ed6c02",
      bg:"#fff3e0"
    },
    neg: {
      label:"Kein rechnerischer Anspruch",
      color:"#d32f2f",
      bg:"#ffebee"
    }
  };

  const b = map[kind] || map.warn;

  return `
    <span style="padding: 4px 10px; border-radius: 20px; font-weight: bold; color: ${b.color}; background-color: ${b.bg};">
      ${b.label}
    </span>
  `;
}


function getCap(personen, stufe){

  const baseCaps = {
    1: [361, 408, 456, 511, 562, 615, 677],
    2: [437, 493, 551, 619, 680, 745, 820],
    3: [521, 587, 657, 737, 809, 887, 975],
    4: [608, 686, 766, 858, 946, 1035, 1139],
    5: [694, 782, 875, 982, 1080, 1183, 1302]
  };

  const extraPersonCap = [
    82,
    94,
    106,
    119,
    129,
    149,
    163
  ];

  const p = clamp(personen, 1, 12);
  const s = clamp(stufe, 1, 7);

  let cap;

  if (p <= 5) {
    cap = baseCaps[p][s - 1];
  } else {
    cap = baseCaps[5][s - 1]
      + (p - 5) * extraPersonCap[s - 1];
  }

  return cap;
}


function getWohnkomponenten(personen){

  const p = clamp(personen, 1, 12);

  const klimaBasis = [19.20, 24.80, 29.60, 34.40, 39.20];
  const heizungBasis = [110.40, 142.60, 170.20, 197.80, 225.40];

  let klima;
  let heizung;

  if (p <= 5) {
    klima = klimaBasis[p - 1];
    heizung = heizungBasis[p - 1];
  } else {
    klima = klimaBasis[4] + (p - 5) * 4.80;
    heizung = heizungBasis[4] + (p - 5) * 27.60;
  }

  return {
    klima,
    heizung
  };
}


function getFormelwerte(personen){

  const werte = {
    1: { a: 0.04000, b: 0.0004797, c: 0.0000408 },
    2: { a: 0.03000, b: 0.0003571, c: 0.0000304 },
    3: { a: 0.02000, b: 0.0002917, c: 0.0000245 },
    4: { a: 0.01000, b: 0.0002163, c: 0.0000176 },
    5: { a: 0.00000, b: 0.0001907, c: 0.0000172 },
    6: { a: -0.01000, b: 0.0001722, c: 0.0000166 },
    7: { a: -0.02000, b: 0.0001592, c: 0.0000165 },
    8: { a: -0.03000, b: 0.0001583, c: 0.0000165 },
    9: { a: -0.04000, b: 0.0001376, c: 0.0000166 },
    10: { a: -0.06000, b: 0.0001249, c: 0.0000166 },
    11: { a: -0.09000, b: 0.0001141, c: 0.0000196 },
    12: { a: -0.12000, b: 0.0001107, c: 0.0000221 }
  };

  const p = clamp(personen, 1, 12);

  return werte[p];
}


function getMindestwerte(personen){

  const minM = [54, 67, 79, 92, 103, 103, 115, 128, 140, 152, 187, 298];
  const minY = [396, 679, 906, 1132, 1358, 1585, 1811, 2037, 2264, 2490, 2717, 2943];

  const p = clamp(personen, 1, 12);

  return {
    minM: minM[p - 1],
    minY: minY[p - 1]
  };
}


function roundFixed10(v){
  if (!Number.isFinite(v)) return 0;
  return Number(v.toFixed(10));
}


// ------------------------------------------------------------
// Kernberechnung nach § 19 WoGG
// Mit Unterhalt/Unterhaltsvorschuss und Alleinerziehenden-Freibetrag
// ------------------------------------------------------------

function schaetzeWohngeld(kaltmiete, netto, personen, stufe, alleinerziehend, unterhalt){

  const p = clamp(personen, 1, 12);
  const s = clamp(stufe, 1, 7);

  const cap = getCap(p, s);
  const komponenten = getWohnkomponenten(p);

  const formel = getFormelwerte(p);
  const mindestwerte = getMindestwerte(p);

  // Gesamteinkommen: Netto + Unterhalt/Unterhaltsvorschuss
  const gesamtEinkommen = netto + unterhalt;

  // Alleinerziehenden-Freibetrag (vereinfacht für Vorcheck)
  let bereinigtesNetto = gesamtEinkommen;
  let freibetrag = 0;
  if (alleinerziehend === 1) {
      freibetrag = 110;
      bereinigtesNetto = Math.max(0, gesamtEinkommen - freibetrag);
  }

  const gedeckelteKaltmiete = Math.min(
    Math.max(0, kaltmiete),
    cap
  );

  const M = roundFixed10(
    gedeckelteKaltmiete
    + komponenten.klima
    + komponenten.heizung
  );

  const Y = roundFixed10(
    Math.max(
      Math.max(0, bereinigtesNetto),
      mindestwerte.minY
    )
  );

  const M_gesetzt = roundFixed10(
    Math.max(
      M,
      mindestwerte.minM
    )
  );

  const z1 = roundFixed10(
    formel.a
    + (formel.b * M_gesetzt)
    + (formel.c * Y)
  );

  const z2 = roundFixed10(
    z1 * Y
  );

  const z3 = roundFixed10(
    M_gesetzt - z2
  );

  const z4 = roundFixed10(
    1.15 * z3
  );

  const ungerundet = Math.max(0, z4);

  const gerundet = Math.round(ungerundet);

  const wohngeld = gerundet >= 10
    ? gerundet
    : 0;

  return {
    cap,
    gedeckelteKaltmiete,
    klima: komponenten.klima,
    heizung: komponenten.heizung,
    freibetrag: freibetrag,
    unterhalt: unterhalt,
    gesamtEinkommen: gesamtEinkommen,

    M: M_gesetzt,
    Y,

    minM: mindestwerte.minM,
    minY: mindestwerte.minY,

    a: formel.a,
    b: formel.b,
    c: formel.c,

    z1,
    z2,
    z3,
    z4,

    ungerundet,
    gerundet,
    wohngeld
  };
}


function einordnung(wohngeld){

  if (wohngeld < 10){
    return {
      label:"Kein rechnerischer Anspruch",
      kind:"neg"
    };
  }

  return {
    label:"Rechnerisch Anspruch vorhanden",
    kind:"pos"
  };
}


function buildResult(e, res){

  const ord = einordnung(res.wohngeld);

  return `
    <div style="border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin-top: 30px; background: #fafafa;">
      <h2 style="margin-top: 0; color: #0d47a1;">Ergebnis deiner Schätzung</h2>
      
      <div style="margin-bottom: 20px; font-size: 1.1rem;">
        <strong>Rechnerische Einordnung:</strong> ${badge(ord.kind)}
      </div>

      <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Voraussichtlicher Wohngeldbetrag</h3>

        <p style="font-size: 1.5rem; color: #2e7d32; font-weight: bold; margin: 10px 0;">
          ${euro(res.wohngeld)}
          <span style="font-size: 1rem; color: #666; font-weight: normal;">pro Monat</span>
        </p>

        <p style="font-size: 0.9rem; color: #666; margin: 0;">
          Der Betrag wird nach der gesetzlichen Wohngeldformel berechnet und auf volle Euro gerundet.
        </p>
      </div>

      <h3 style="font-size: 1rem;">Wie kommt diese Summe zustande?</h3>

      <ul style="font-size: 0.95rem; line-height: 1.6; color: #444;">

        <li>
          Deine Bruttokaltmiete von ${euro(e.kaltmiete)}
          wird beim Mietanteil auf den gesetzlichen Höchstbetrag für
          Mietstufe ${e.stufe} von <strong>${euro(res.cap)}</strong> begrenzt.
        </li>

        <li>
          Zusätzlich berücksichtigt das Wohngeld eine gesetzliche
          Klimakomponente von <strong>${euro(res.klima)}</strong>
          und einen gesetzlichen Betrag zur Entlastung bei den Heizkosten
          von <strong>${euro(res.heizung)}</strong>.
        </li>

        <li>
          Daraus ergibt sich eine für die Formel berücksichtigte Miete von
          <strong>${euro(res.M)}</strong> monatlich.
        </li>

        ${e.unterhalt > 0 ? `<li>Dein Unterhalt/Unterhaltsvorschuss von <strong>${euro(res.unterhalt)}</strong> wird als Einkommen berücksichtigt.</li>` : ''}

        ${e.alleinerziehend === 1 ? `<li>Da du alleinerziehend bist, wird ein pauschaler Freibetrag von <strong>${euro(res.freibetrag)}</strong> von deinem Einkommen abgezogen. Das erhöht deinen Wohngeldanspruch.</li>` : ''}

        <li>
          Für diesen Vorcheck wird dein bereinigtes Einkommen von
          ${euro(res.Y)}
          als Näherung für das wohngeldrechtliche Einkommen verwendet.
          Das amtliche Verfahren kann wegen Steuern, Versicherungsbeiträgen,
          Werbungskosten und weiteren Freibeträgen zu einem anderen Einkommen kommen.
        </li>

        <li>
          Anschließend wird die gesetzliche Wohngeldformel nach § 19 WoGG
          angewendet und das Ergebnis auf volle Euro gerundet.
        </li>

      </ul>

      <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
        <h4 style="margin-top: 0; color: #0d47a1;">Wichtig für die genaue Prüfung</h4>

        <ol style="margin-bottom: 0; padding-left: 20px;">

          <li>
            Dieser Rechner ist ein Vorcheck. Das amtliche Wohngeld kann
            insbesondere wegen der genauen Einkommensermittlung,
            Freibeträgen, Ausschlusstatbeständen und weiteren gesetzlichen
            Angaben abweichen.
          </li>

          <li>
            Trage deine genauen Daten zusätzlich in den
            <strong>
              <a href="https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeldrechner/wohngeldrechner-2025_node.html"
                 target="_blank"
                 rel="noopener noreferrer">
                amtlichen Wohngeldrechner
              </a>
            </strong>
            ein.
          </li>

          <li>
            Sammle deine Einkommens- und Mietnachweise.
          </li>

          <li>
            Ein Wohngeldantrag sollte grundsätzlich im Monat der Antragstellung
            gestellt werden, da der Bewilligungszeitraum grundsätzlich mit
            dem Monat der Antragstellung beginnt.
          </li>

        </ol>
      </div>
    </div>
  `;
}


// ------------------------------------------------------------
// Formularlogik
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

  const pers = document.getElementById("wg_personen");
  const netto = document.getElementById("wg_netto");
  const kalt = document.getElementById("wg_kaltmiete");
  const mietstufe = document.getElementById("wg_mietstufe");
  const alleinerziehend = document.getElementById("wg_alleinerziehend");
  const unterhalt = document.getElementById("wg_unterhalt");

  const btn = document.getElementById("wg_berechnen");
  const reset = document.getElementById("wg_reset");
  const out = document.getElementById("wg_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {

    const errors = [];

    const personenWert = n(pers);
    const nettoWert = n(netto);
    const kaltmieteWert = n(kalt);
    const stufeWert = Math.floor(n(mietstufe));
    const alleinerziehendWert = alleinerziehend ? parseInt(alleinerziehend.value) : 0;
    const unterhaltWert = n(unterhalt);

    if (!pers.value) {
      errors.push("Bitte die Personenanzahl angeben.");
    }

    if (!netto.value) {
      errors.push("Bitte dein monatliches Haushaltseinkommen angeben.");
    }

    if (!kalt.value) {
      errors.push("Bitte deine Bruttokaltmiete eintragen.");
    }

    if (kalt.value && kaltmieteWert <= 0) {
      errors.push("Die Bruttokaltmiete muss größer als 0 € sein.");
    }

    if (!mietstufe.value) {
      errors.push("Bitte wähle eine Mietstufe (schätze zur Not).");
    }

    if (personenWert < 1 || personenWert > 8) {
      errors.push("Die Personenanzahl muss zwischen 1 und 8 liegen.");
    }

    if (netto.value && nettoWert < 0) {
      errors.push("Das Einkommen darf nicht negativ sein.");
    }

    if (mietstufe.value && (stufeWert < 1 || stufeWert > 7)) {
      errors.push("Die Mietstufe muss zwischen I und VII liegen.");
    }

    if (unterhaltWert < 0) {
      errors.push("Der Unterhalt darf nicht negativ sein.");
    }

    if (errors.length){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const eingabe = {
      personen: Math.max(1, Math.min(8, Math.floor(personenWert))),
      netto: nettoWert,
      kaltmiete: kaltmieteWert,
      stufe: stufeWert,
      alleinerziehend: alleinerziehendWert,
      unterhalt: unterhaltWert
    };

    const res = schaetzeWohngeld(
      eingabe.kaltmiete,
      eingabe.netto,
      eingabe.personen,
      eingabe.stufe,
      eingabe.alleinerziehend,
      eingabe.unterhalt
    );

    out.innerHTML = buildResult(eingabe, res);

    out.scrollIntoView({
      behavior: "smooth"
    });
  });

  if (reset) {

    reset.addEventListener("click", () => {

      setTimeout(() => {
        out.innerHTML = "";
      }, 0);

    });

  }

});