// schonvermoegen-kurzcheck.js

function n(el){ if(!el) return 0; const raw=(el.value||"").toString().replace(",","."); const v=Number(raw); return Number.isFinite(v)?v:0; }
function euro(v){ const x=Number.isFinite(v)?v:0; return x.toFixed(2).replace(".",",")+" €"; }
function clamp(v,min,max){ return Math.min(Math.max(v,min),max); }

function bewerteSchonvermoegen({ ersparnisse, kfzWert, personen, proKopf, kfzCap, knappPct }) {
  const haushalt = Math.max(1, Math.floor(personen || 1));

  // 1) Grund-Schutzbetrag
  const grundschutz = Math.max(0, proKopf) * haushalt;

  // 2) Kfz – geschützter Anteil & Überhang
  const kfzProtected = Math.min(Math.max(0, kfzWert), Math.max(0, kfzCap));
  const kfzUeberhang = Math.max(0, kfzWert - kfzProtected);

  // 3) Zu prüfendes Vermögen = Ersparnisse + Kfz-Überhang (der Teil über Cap)
  const pruefvermoegen = Math.max(0, ersparnisse) + kfzUeberhang;

  // 4) Grenze & Band für "knapp"
  const band = Math.max(0, knappPct) / 100;
  const untereGrenze = grundschutz * (1 - band);
  const obereGrenze  = grundschutz * (1 + band);

  let urteil = "Im Rahmen";
  if (pruefvermoegen > obereGrenze) urteil = "Drüber";
  else if (pruefvermoegen >= untereGrenze && pruefvermoegen <= obereGrenze) urteil = "Knapp";

  return {
    grundschutz,
    kfzProtected,
    kfzUeberhang,
    pruefvermoegen,
    bandPct: knappPct,
    urteil
  };
}

function buildOutputHTML(inp, res) {
  return `
    <h2>Ergebnis: Schonvermögen (Kurzcheck)</h2>

    <div class="pflegegrad-result-card">
      <h3>Zusammenfassung</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Größe</th><th>Betrag</th></tr></thead>
        <tbody>
          <tr><td>Grundschutz (pro Person × ${inp.personen})</td><td><strong>${euro(res.grundschutz)}</strong></td></tr>
          <tr><td>Geschützter Kfz-Anteil (bis Cap)</td><td>${euro(res.kfzProtected)}</td></tr>
          <tr><td>Kfz-Überhang (zählt als Vermögen)</td><td>${euro(res.kfzUeberhang)}</td></tr>
          <tr><td><strong>Zu prüfendes Vermögen</strong> (Ersparnisse + Kfz-Überhang)</td><td><strong>${euro(res.pruefvermoegen)}</strong></td></tr>
        </tbody>
      </table>

      <h3>Einordnung</h3>
      <table class="pflegegrad-tabelle">
        <thead><tr><th>Bewertung</th><th>Knapp-Zone</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>${res.urteil}</strong></td>
            <td>± ${res.bandPct.toFixed(0)} % um den Grundschutz</td>
          </tr>
        </tbody>
      </table>

      <h3>Wichtige Hinweise (Ausnahmen, häufig geschützt)</h3>
      <ul>
        <li><strong>Altersvorsorge</strong> (z. B. geförderte Verträge) kann geschützt sein – Nachweise bereithalten.</li>
        <li><strong>Zweckgebundene Gelder</strong> (z. B. Schadensersatz, Pflege-/Hilfsmittel-Zuschuss) oft privilegiert.</li>
        <li><strong>Angemessener Hausrat</strong>, <strong>beruflich notwendige Geräte</strong> und
            <strong>angemessener PKW</strong> gelten vielfach als geschützt (hier pauschal bis Cap berücksichtigt).</li>
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

  const proKopf = document.getElementById("sv_freibetrag_pro_person");
  const kfzCap = document.getElementById("sv_kfz_cap");
  const knapp = document.getElementById("sv_knapp_band");

  const btn = document.getElementById("sv_berechnen");
  const reset = document.getElementById("sv_reset");
  const out = document.getElementById("sv_ergebnis");

  if (!btn || !out) return;

  btn.addEventListener("click", () => {
    const input = {
      ersparnisse: n(ersp),
      kfzWert: n(kfz),
      personen: n(hh),

      proKopf: n(proKopf),
      kfzCap: n(kfzCap),
      knappPct: clamp(n(knapp), 0, 20)
    };

    const res = bewerteSchonvermoegen(input);
    out.innerHTML = buildOutputHTML(input, res);
    out.scrollIntoView({ behavior: "smooth" });
  });

  if (reset) {
    reset.addEventListener("click", () => {
      setTimeout(() => { out.innerHTML = ""; }, 0);
    });
  }
});
