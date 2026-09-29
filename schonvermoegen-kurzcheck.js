// schonvermoegen-kurzcheck.js

function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

function bewerteSchonvermoegen({ ersparnisse, kfzWert, personen, freibetrage, kfzGrenze, knappPct }) {
  const haushalt = Math.max(1, Math.floor(personen || 1));

  // 1) Grund-Schutzbetrag (Summe aller Freibeträge)
  const grundschutz = freibetrage.reduce((sum, fb) => sum + Math.max(0, fb), 0);

  // 2) Kfz – geschützter Anteil & Überhang
  const kfzProtected = Math.min(Math.max(0, kfzWert), Math.max(0, kfzGrenze));
  const kfzUeberhang = Math.max(0, kfzWert - kfzProtected);

  // 3) Zu prüfendes Vermögen = Ersparnisse + Kfz-Überhang (der Teil über der Grenze)
  const pruefvermoegen = Math.max(0, ersparnisse) + kfzUeberhang;

  // 4) Grenze & Band für "knapp"
  const band = Math.max(0, knappPct) / 100;
  const untereGrenze = grundschutz * (1 - band);
  const obereGrenze  = grundschutz * (1 + band);

  let urteil = "Im Rahmen";
  let statusKlasse = "status-ok";
  if (pruefvermoegen > obereGrenze) {
    urteil = "Drüber";
    statusKlasse = "status-warnung";
  } else if (pruefvermoegen >= untereGrenze && pruefvermoegen <= obereGrenze) {
    urteil = "Knapp";
    statusKlasse = "status-vorsicht";
  }

  return {
    grundschutz,
    kfzProtected,
    kfzUeberhang,
    pruefvermoegen,
    bandPct: knappPct,
    urteil,
    statusKlasse
  };
}

function getStatusInfo(res) {
  const infos = {
    "status-ok": {
      titel: "Alles im grünen Bereich",
      text: "Dein Vermögen liegt unter dem Freibetrag. Das Jobcenter muss dein Erspartes in der Regel nicht anrechnen.",
      farbe: "#2e7d32",
      hintergrund: "#e8f5e9",
      rahmen: "#4caf50"
    },
    "status-vorsicht": {
      titel: "Knapp an der Grenze",
      text: "Dein Vermögen liegt sehr nah am Freibetrag. Hier lohnt sich eine genaue Prüfung – eventuell gibt es weitere Freibeträge (z. B. Altersvorsorge), die das Ergebnis verbessern.",
      farbe: "#ef6c00",
      hintergrund: "#fff8e1",
      rahmen: "#ff9800"
    },
    "status-warnung": {
      titel: "Über dem Freibetrag",
      text: "Dein Vermögen liegt über dem Freibetrag. Der überschüssige Teil wird voraussichtlich auf das Grundsicherungsgeld angerechnet. Prüfe, ob du geschützte Vermögensanteile (Altersvorsorge, Wohneigentum) nicht mitgerechnet hast.",
      farbe: "#c62828",
      hintergrund: "#ffebee",
      rahmen: "#e53935"
    }
  };
  return infos[res.statusKlasse];
}

function updateAltersFelder() {
  const container = document.getElementById("sv_alter_container");
  const haushaltInput = document.getElementById("sv_haushalt");
  
  if (!container || !haushaltInput) return;
  
  const personen = Math.max(1, Math.min(10, Math.floor(n(haushaltInput))));
  
  // Aktuelle Werte sammeln
  const aktuelleWerte = [];
  for (let i = 1; i <= 10; i++) {
    const select = document.getElementById(`sv_alter_${i}`);
    if (select) aktuelleWerte.push(select.value);
  }
  
  // Container leeren
  container.innerHTML = '';
  
  // Neue Felder erstellen
  for (let i = 0; i < personen; i++) {
    const label = document.createElement('label');
    label.className = 'pflegegrad-label';
    label.setAttribute('for', `sv_alter_${i + 1}`);
    
    const currentValue = aktuelleWerte[i] || '20000'; // Standard: über 50 Jahre
    
    label.innerHTML = `
      Alter Person ${i + 1}
      <select id="sv_alter_${i + 1}">
        <option value="5000" ${currentValue === '5000' ? 'selected' : ''}>Bis 30 Jahre (5.000 € Freibetrag)</option>
        <option value="10000" ${currentValue === '10000' ? 'selected' : ''}>31-40 Jahre (10.000 € Freibetrag)</option>
        <option value="12500" ${currentValue === '12500' ? 'selected' : ''}>41-50 Jahre (12.500 € Freibetrag)</option>
        <option value="20000" ${currentValue === '20000' ? 'selected' : ''}>Über 50 Jahre (20.000 € Freibetrag)</option>
      </select>
    `;
    
    container.appendChild(label);
  }
}

function buildOutputHTML(inp, res) {
  const info = getStatusInfo(res);
  const diff = res.pruefvermoegen - res.grundschutz;
  const diffText = diff > 0 
    ? `Du liegst <strong>${euro(diff)}</strong> über dem Freibetrag.`
    : diff < 0 
      ? `Du hast noch <strong>${euro(Math.abs(diff))}</strong> Luft bis zum Freibetrag.`
      : `Du liegst genau am Freibetrag.`;

  return `
    <style>
      .sv-status-box {
        padding: 20px;
        border-radius: 10px;
        border-left: 6px solid;
        margin-bottom: 20px;
      }
      .sv-status-box h3 {
        margin-top: 0;
        font-size: 1.4em;
        margin-bottom: 10px;
      }
      .sv-status-box p {
        margin: 0;
        line-height: 1.5;
      }
      .sv-diff-info {
        background-color: #f5f5f5;
        padding: 12px 15px;
        border-radius: 6px;
        margin: 15px 0;
        font-size: 1.05em;
        text-align: center;
      }
      .sv-handlung {
        margin-top: 15px;
        padding: 12px 15px;
        background-color: rgba(255,255,255,0.5);
        border-radius: 6px;
      }
      .sv-handlung strong {
        display: block;
        margin-bottom: 4px;
      }
    </style>

    <h2>Ergebnis: Schonvermögen (Kurzcheck)</h2>

    <div class="pflegegrad-result-card">

      <div class="sv-status-box" style="background-color: ${info.hintergrund}; border-left-color: ${info.rahmen}; color: ${info.farbe};">
        <h3 style="color: ${info.farbe};">${info.titel}</h3>
        <p>${info.text}</p>
      </div>

      <div class="sv-diff-info">
        ${diffText}
      </div>

      <h3>Zusammenfassung deiner Zahlen</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Gesamter Freibetrag (alle ${inp.personen} Personen)</td><td><strong>${euro(res.grundschutz)}</strong></td></tr>
          <tr><td>Geschützter Kfz-Anteil (bis zur Grenze)</td><td>${euro(res.kfzProtected)}</td></tr>
          <tr><td>Kfz-Überhang (zählt als Vermögen)</td><td>${euro(res.kfzUeberhang)}</td></tr>
          <tr><td><strong>Zu prüfendes Vermögen</strong> (Ersparnisse + Kfz-Überhang)</td><td><strong>${euro(res.pruefvermoegen)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Deine Bewertung im Detail</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Status</th><th>Bedeutung</th></tr></thead>
        <tbody>
          <tr>
            <td><strong style="color: ${info.farbe}; font-size: 1.1em;">${res.urteil}</strong></td>
            <td>Warnbereich: ± ${res.bandPct.toFixed(0)} % um den Freibetrag (${euro(res.grundschutz)})</td>
          </tr>
        </tbody>
      </table>

      <div class="sv-handlung">
        <strong>Das kannst du jetzt tun:</strong>
        ${res.statusKlasse === 'status-ok' 
          ? 'Sammle deine Kontoauszüge als Nachweis. Du kannst deinen Antrag mit gutem Gefühl stellen.'
          : res.statusKlasse === 'status-vorsicht' 
            ? 'Prüfe, ob du weitere Freibeträge hast (Altersvorsorge, Bausparverträge mit Sperrfrist). Bei Unsicherheit: Beratungsgespräch vor dem Antrag.'
            : 'Rechne genau nach, ob alle geschützten Vermögensarten berücksichtigt wurden. Ggf. solltest du vor dem Antrag eine Sozialberatung aufsuchen.'}
      </div>

      <h3>Wichtige Hinweise (Ausnahmen, häufig geschützt)</h3>
      <ul>
        <li><strong>Altersvorsorge</strong> (z. B. geförderte Verträge) kann geschützt sein – Nachweise bereithalten.</li>
        <li><strong>Zweckgebundene Gelder</strong> (z. B. Schadensersatz, Pflege-/Hilfsmittel-Zuschuss) oft privilegiert.</li>
        <li><strong>Angemessener Hausrat</strong>, <strong>beruflich notwendige Geräte</strong> und
            <strong>angemessener PKW</strong> gelten vielfach als geschützt (hier pauschal bis zur Grenze berücksichtigt).</li>
        <li><strong>Selbstgenutztes, angemessenes Wohneigentum</strong> kann geschützt sein (Sonderprüfung).</li>
        <li><strong>Karenz-/Übergangsregeln</strong> und regionale Vorgaben beachten – bitte Bescheid/Behörde prüfen.</li>
      </ul>

      <p class="hinweis">
        Dieser Kurzcheck ersetzt keine verbindliche Prüfung. Für deinen Fall bitte Unterlagen sammeln (Kontoauszüge,
        Vertragsnachweise) und <strong>Beratung</strong> bzw. <strong>Jobcenter</strong> kontaktieren.
      </p>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const ersp = document.getElementById("sv_ersparnisse");
  const kfz = document.getElementById("sv_kfz_wert");
  const hh = document.getElementById("sv_haushalt");

  const kfzGrenze = document.getElementById("sv_kfz_grenze");
  const knapp = document.getElementById("sv_knapp_bereich");

  const btn = document.getElementById("sv_berechnen");
  const reset = document.getElementById("sv_reset");
  const out = document.getElementById("sv_ergebnis");

  if (!btn || !out || !hh) return;

  // Initialisiere Altersfelder
  updateAltersFelder();
  
  // Event-Listener für Haushaltsgrößen-Änderung
  hh.addEventListener("change", updateAltersFelder);
  hh.addEventListener("input", updateAltersFelder);

  btn.addEventListener("click", () => {
    const personen = Math.max(1, Math.floor(n(hh)));
    
    // Sammle alle Freibeträge basierend auf Alter
    const freibetrage = [];
    for (let i = 1; i <= personen; i++) {
      const select = document.getElementById(`sv_alter_${i}`);
      if (select) {
        freibetrage.push(n(select));
      }
    }

    const input = {
      ersparnisse: n(ersp),
      kfzWert: n(kfz),
      personen: personen,
      freibetrage: freibetrage,
      kfzGrenze: n(kfzGrenze),
      knappPct: clamp(n(knapp), 0, 20)
    };

    const res = bewerteSchonvermoegen(input);
    out.innerHTML = buildOutputHTML(input, res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { 
        out.innerHTML = ""; 
        updateAltersFelder();
      }, 0);
    });
  }
});