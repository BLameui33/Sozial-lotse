// buergergeld-vorcheck.js (vereinfachter Vorcheck)

function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

function berechneBedarf(input){
  const {
    haushalt, erwWeitere, k05, k613, k1417,
    rsSingle, rsPartner, rsErwWeitere, rs05, rs613, rs1417,
    warmmiete, mieteCap, mehrAEpct
  } = input;

  // Regelsätze Erwachsene
  const rsErw = (haushalt === "paar" ? rsPartner * 2 : rsSingle)
              + rsErwWeitere * Math.max(0, erwWeitere);

  // Regelsätze Kinder
  const rsKids = (rs05 * Math.max(0,k05))
               + (rs613 * Math.max(0,k613))
               + (rs1417 * Math.max(0,k1417));

  // Alleinerziehenden-Mehrbedarf (einfach): % auf Kinder-Regelsätze
  const aeMehr = (haushalt === "single" ? (rsKids * clamp(mehrAEpct,0,60) / 100) : 0);

  // Unterkunft: Warmmiete bis Deckel
  const kdu = Math.min(Math.max(0,warmmiete), Math.max(0,mieteCap));

  const bedarf = rsErw + rsKids + aeMehr + kdu;

  return { rsErw, rsKids, aeMehr, kdu, bedarf };
}

function berechneAnrechenbaresEinkommen(input){
  const { einkommen, freiFix, freiPct, abzuegeSonst } = input;
  const e = Math.max(0, einkommen);
  const fix = Math.min(e, Math.max(0, freiFix));
  const rest = Math.max(0, e - fix);
  const pctAbzug = clamp(freiPct, 0, 50) / 100 * rest;
  const anr = Math.max(0, e - fix - pctAbzug - Math.max(0,abzuegeSonst));
  return { anrechenbar: anr, fix, pctAbzug };
}

function urteilVorcheck(luecke){
  if (luecke > 100) return "Wahrscheinlich Anspruch";
  if (luecke >= -100 && luecke <= 100) return "Grenzwertig";
  return "Eher nicht";
}

function errorBox(msgs){
  const items = msgs.map(m=>`<li>${m}</li>`).join("");
  return `
    <div class="pflegegrad-result-card">
      <h2>Bitte Eingaben prüfen</h2>
      <ul>${items}</ul>
    </div>
  `;
}

function baueErgebnisHTML(input, bedarfRes, einkRes){
  const gesamtbedarf = bedarfRes.bedarf;
  const anr = einkRes.anrechenbar;
  const luecke = gesamtbedarf - anr;
  const urteil = urteilVorcheck(luecke);

  return `
    <h2>Ergebnis: Bürgergeld-Vorcheck</h2>

    <div class="pflegegrad-result-card">
      <h3>Haushaltsbedarf (vereinfacht)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Komponente</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Regelsätze Erwachsene</td><td>${euro(bedarfRes.rsErw)}</td></tr>
          <tr><td>Regelsätze Kinder</td><td>${euro(bedarfRes.rsKids)}</td></tr>
          <tr><td>Alleinerziehenden-Mehrbedarf</td><td>${euro(bedarfRes.aeMehr)}</td></tr>
          <tr><td>Unterkunft &amp; Heizung (gedeckelt)</td><td>${euro(bedarfRes.kdu)}</td></tr>
          <tr><td><strong>Gesamtbedarf</strong></td><td><strong>${euro(gesamtbedarf)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Einkommen (vereinfacht angerechnet)</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Komponente</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Haushalts-Nettoeinkommen (Eingabe)</td><td>${euro(input.einkommen)}</td></tr>
          <tr><td>Fixer Freibetrag</td><td>− ${euro(einkRes.fix)}</td></tr>
          <tr><td>Prozentualer Freibetrag</td><td>− ${euro(einkRes.pctAbzug)}</td></tr>
          <tr><td>Weitere Abzüge</td><td>− ${euro(input.abzuegeSonst)}</td></tr>
          <tr><td><strong>Anrechenbares Einkommen</strong></td><td><strong>${euro(anr)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Vorläufige Einordnung</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Wert</th></tr></thead>
        <tbody>
          <tr><td>Bedarf − anrechenbares Einkommen</td><td><strong>${euro(luecke)}</strong></td></tr>
          <tr><td><strong>Ergebnis</strong></td><td><strong>${urteil}</strong></td></tr>
        </tbody>
      </table>

      <p class="hinweis">
        Unverbindliche Orientierung. Für eine verbindliche Prüfung (inkl. Vermögen,
        genaue Freibeträge, Kinder-/Unterhaltsanrechnung, besondere Konstellationen)
        bitte das <strong>Jobcenter</strong> kontaktieren oder unabhängige Beratung nutzen.
        Passe die Pauschalen oben an deine Region/Jahr an.
      </p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", ()=>{
  // Haushalt
  const haushaltSel = document.getElementById("bg_haushalt");
  const erwWeitInp = document.getElementById("bg_erw_weitere");
  const k05Inp = document.getElementById("bg_k_0_5");
  const k613Inp = document.getElementById("bg_k_6_13");
  const k1417Inp = document.getElementById("bg_k_14_17");
  const mehrAE = document.getElementById("bg_mehr_ae");

  // Regelsätze & Unterkunft
  const rsSingle = document.getElementById("bg_rs_single");
  const rsPartner = document.getElementById("bg_rs_partner");
  const rsErwW = document.getElementById("bg_rs_erw_weitere");
  const rs05 = document.getElementById("bg_rs_0_5");
  const rs613 = document.getElementById("bg_rs_6_13");
  const rs1417 = document.getElementById("bg_rs_14_17");

  const warmmiete = document.getElementById("bg_warmmiete");
  const mieteCap = document.getElementById("bg_miete_cap");

  // Einkommen & Freibeträge
  const eink = document.getElementById("bg_einkommen");
  const freiFix = document.getElementById("bg_freibetrag_fix");
  const freiPct = document.getElementById("bg_freibetrag_pct");
  const abzSonst = document.getElementById("bg_abzuege_sonstig");

  // Actions
  const btn = document.getElementById("bg_berechnen");
  const reset = document.getElementById("bg_reset");
  const out = document.getElementById("bg_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", ()=>{
    // sanfte Validierung
    const errors = [];
    if (n(rsSingle) <= 0 || n(rsPartner) <= 0) {
      errors.push("Bitte realistische Regelsätze für Erwachsene eintragen (> 0 €).");
    }
    if (n(warmmiete) < 0 || n(mieteCap) < 0) {
      errors.push("Warmmiete und Angemessenheitsgrenze dürfen nicht negativ sein.");
    }
    if (n(eink) < 0) errors.push("Einkommen darf nicht negativ sein.");
    if (n(freiPct) < 0 || n(freiPct) > 50) {
      errors.push("Prozentualer Freibetrag muss zwischen 0 % und 50 % liegen.");
    }
    if (errors.length) { out.innerHTML = errorBox(errors); out.scrollIntoView({behavior:"smooth"}); return; }

    const input = {
      haushalt: (haushaltSel && haushaltSel.value) || "paar",
      erwWeitere: Math.max(0, Math.floor(n(erwWeitInp))),

      k05: Math.max(0, Math.floor(n(k05Inp))),
      k613: Math.max(0, Math.floor(n(k613Inp))),
      k1417: Math.max(0, Math.floor(n(k1417Inp))),
      mehrAEpct: n(mehrAE),

      rsSingle: n(rsSingle),
      rsPartner: n(rsPartner),
      rsErwWeitere: n(rsErwW),
      rs05: n(rs05),
      rs613: n(rs613),
      rs1417: n(rs1417),

      warmmiete: n(warmmiete),
      mieteCap: n(mieteCap),

      einkommen: n(eink),
      freiFix: n(freiFix),
      freiPct: n(freiPct),
      abzuegeSonst: n(abzSonst)
    };

    const bedarfRes = berechneBedarf(input);
    const einkRes = berechneAnrechenbaresEinkommen({
      einkommen: input.einkommen,
      freiFix: input.freiFix,
      freiPct: input.freiPct,
      abzuegeSonst: input.abzuegeSonst
    });

    out.innerHTML = baueErgebnisHTML(input, bedarfRes, einkRes);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", ()=> {
      setTimeout(()=> { out.innerHTML = ""; }, 0);
    });
  }
});
