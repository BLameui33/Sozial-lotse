// wohngeld-vorcheck.js – Nutzerfreundlich & automatisiert

function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

function errorBox(msgs){
  if (!msgs.length) return "";
  return `
    <div class="pflegegrad-result-card" style="border-left: 4px solid #e53935; padding: 15px; background: #fff3f3; margin-top: 20px;">
      <h3 style="margin-top: 0; color: #d32f2f;">Bitte Angaben prüfen:</h3>
      <ul style="margin-bottom: 0;">${msgs.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
  `;
}

function badge(kind){
  const map = {
    pos: {label:"Wahrscheinlich", color:"#2e7d32", bg:"#e8f5e9"},
    warn:{label:"Grenzwertig", color:"#ed6c02", bg:"#fff3e0"},
    neg: {label:"Eher nicht", color:"#d32f2f", bg:"#ffebee"}
  };
  const b = map[kind] || map.warn;
  return `<span style="padding: 4px 10px; border-radius: 20px; font-weight: bold; color: ${b.color}; background-color: ${b.bg};">${b.label}</span>`;
}

// Interne Tabelle für die angemessenen Höchstbeträge (Kaltmieten-Cap)
// Reihen = Personen (1 bis 5), Spalten = Mietstufe I bis VII
// Hinweis: Dies sind Näherungswerte/Richtwerte für die Logik. 
function getCap(personen, stufe) {
  // Aktuelle Höchstbeträge für Miete und Belastung nach Anlage 1 WoGG
  // Gültig ab 01.01.2025 (aktueller Stand 2026)
  // Die Arrays entsprechen den Mietenstufen 1 bis 7 (I bis VII)
  const baseCaps = {
    1: [361, 408, 456, 511, 562, 615, 677],
    2: [437, 493, 551, 619, 680, 745, 820],
    3: [521, 587, 657, 737, 809, 887, 975],
    4: [608, 686, 766, 858, 946, 1035, 1139],
    5: [694, 782, 875, 982, 1080, 1183, 1302]
  };
  
  // Jeder weitere Kopf über 5 Personen
  const extraPersonCap = [80, 89, 98, 107, 116, 125, 134];
  
  let p = clamp(personen, 1, 5);
  let cap = baseCaps[p][stufe - 1]; // Array ist 0-indiziert, Stufe ist 1-7
  
  if (personen > 5) {
    cap += (personen - 5) * extraPersonCap[stufe - 1];
  }
  return cap;
}

// Kernformel (vereinfacht, technische Parameter versteckt)
function schaetzeWohngeld(kaltmiete, netto, personen, stufe) {
  const cap = getCap(personen, stufe);
  
  // Feste interne Parameter (vor dem Nutzer verborgen)
  const zumutbarPct = 30; // 30% des Netto-Einkommens als zumutbare Belastung
  const toleranz = 15;    // 15% Schwankungsbreite für die Spanne

  const gedeckelt = Math.min(Math.max(0, kaltmiete), cap);
  const zumutbar = Math.max(0, netto) * (zumutbarPct / 100);
  const punkt = Math.max(0, gedeckelt - zumutbar);

  const spanMin = Math.max(0, punkt * (1 - toleranz / 100));
  const spanMax = Math.max(0, punkt * (1 + toleranz / 100));

  return { gedeckelt, zumutbar, punkt, spanMin, spanMax, cap };
}

// Ampel-Logik
function einordnung(punkt, spanMax) {
  if (punkt <= 0 && spanMax < 10) return {label:"Eher nicht", kind:"neg"};
  if (spanMax < 60) return {label:"Grenzwertig", kind:"warn"};
  return {label:"Wahrscheinlich", kind:"pos"};
}

function buildResult(e, res){
  const ord = einordnung(res.punkt, res.spanMax);

  return `
    <div style="border: 2px solid #2196f3; border-radius: 8px; padding: 20px; margin-top: 30px; background: #fafafa;">
      <h2 style="margin-top: 0; color: #0d47a1;">Ergebnis deiner Schätzung</h2>
      
      <div style="margin-bottom: 20px; font-size: 1.1rem;">
        <strong>Chancen-Einordnung:</strong> ${badge(ord.kind)}
      </div>

      <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 style="margin-top: 0;">Mögliche Spanne deines Zuschusses</h3>
        <p style="font-size: 1.5rem; color: #2e7d32; font-weight: bold; margin: 10px 0;">
          ${euro(res.spanMin)} – ${euro(res.spanMax)} <span style="font-size: 1rem; color: #666; font-weight: normal;">pro Monat</span>
        </p>
        <p style="font-size: 0.9rem; color: #666; margin: 0;">
          (Durschnittlicher Schätzwert: ${euro(res.punkt)})
        </p>
      </div>

      <h3 style="font-size: 1rem;">Wie kommt diese Summe zustande?</h3>
      <ul style="font-size: 0.95rem; line-height: 1.6; color: #444;">
        <li>Deine Miete von ${euro(e.kaltmiete)} wird vom Amt auf die örtliche Höchstgrenze (Mietstufe ${e.stufe}) von <strong>${euro(res.cap)} gedeckelt</strong>.</li>
        <li>Das Amt geht davon aus, dass du etwa 30% deines Nettoeinkommens (ca. ${euro(res.zumutbar)}) selbst für Wohnen aufbringen kannst.</li>
        <li>Die Differenz aus der gedeckelten Miete und deinem Eigenanteil ergibt deinen groben Anspruch.</li>
      </ul>

      <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-top: 20px;">
        <h4 style="margin-top: 0; color: #0d47a1;">Nächste Schritte</h4>
        <ol style="margin-bottom: 0; padding-left: 20px;">
          <li>Trage deine genauen Daten in den <strong><a href="https://www.bmwsb.bund.de/DE/wohnen/wohngeld/wohngeldrechner/wohngeldrechner-2025_node.html" target="_blank">amtlichen Wohngeldrechner</a></strong> ein.</li>
          <li>Sammle deine Einkommens- und Mietnachweise.</li>
          <li>Reiche den Antrag zeitnah bei deiner Wohngeldbehörde ein (Geld gibt es nicht rückwirkend!).</li>
        </ol>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const pers = document.getElementById("wg_personen");
  const netto = document.getElementById("wg_netto");
  const kalt = document.getElementById("wg_kaltmiete");
  const mietstufe = document.getElementById("wg_mietstufe");

  const btn = document.getElementById("wg_berechnen");
  const reset = document.getElementById("wg_reset");
  const out = document.getElementById("wg_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const errors = [];
    if (!pers.value) errors.push("Bitte die Personenanzahl angeben.");
    if (!netto.value) errors.push("Bitte dein Nettoeinkommen angeben.");
    if (!kalt.value) errors.push("Bitte deine Bruttokaltmiete eintragen.");
    if (!mietstufe.value) errors.push("Bitte wähle eine Mietstufe (schätze zur Not).");

    if (errors.length){
      out.innerHTML = errorBox(errors);
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const eingabe = {
      personen: Math.max(1, Math.floor(n(pers))),
      netto: n(netto),
      kaltmiete: n(kalt),
      stufe: Math.floor(n(mietstufe))
    };

    const res = schaetzeWohngeld(eingabe.kaltmiete, eingabe.netto, eingabe.personen, eingabe.stufe);

    out.innerHTML = buildResult(eingabe, res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});