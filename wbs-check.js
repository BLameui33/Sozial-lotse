document.addEventListener("DOMContentLoaded", () => {
    const btnBerechnen = document.getElementById("wbs_berechnen");
    const btnReset = document.getElementById("wbs_reset");
    const ergebnisContainer = document.getElementById("wbs_ergebnis");

    // Währung formatieren (z. B. 15.000,00 €)
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    };

   
    const wbsGrenzen = {
    // Baden-Württemberg (Hohe Grenzen durch Landesförderung)
    "BW": { base1: 52700, base2: 52700, extraPerson: 9000, extraChild: 0 }, 
    
    // Bayern (Einkommensstufe I)
    "BY": { base1: 22600, base2: 34500, extraPerson: 8500, extraChild: 2500 }, 
    
    // Berlin (WBS 100 - die Grundgrenze)
    "BE": { base1: 16800, base2: 25200, extraPerson: 5740, extraChild: 700 }, 
    
    // Brandenburg 
    "BB": { base1: 18500, base2: 26000, extraPerson: 5800, extraChild: 2000 },
    
    // Bremen (Orientierung an Bundesgesetz / Basiswerten)
    "HB": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 600 },
    
    // Hamburg 
    "HH": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 1000 },
    
    // Hessen 
    "HE": { base1: 16351, base2: 24807, extraPerson: 5639, extraChild: 650 },
    
    // Mecklenburg-Vorpommern
    "MV": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 500 },
    
    // Niedersachsen
    "NI": { base1: 17000, base2: 23000, extraPerson: 3000, extraChild: 3000 },
    
    // Nordrhein-Westfalen (Angepasste Basiswerte)
    "NW": { base1: 20420, base2: 24600, extraPerson: 6530, extraChild: 740 },
    
    // Rheinland-Pfalz
    "RP": { base1: 16100, base2: 23000, extraPerson: 5431, extraChild: 1068 },
    
    // Saarland
    "SL": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 500 },
    
    // Sachsen (Ab 1. Januar 2026 wurden die Grenzen deutlich angehoben)
    "SN": { base1: 20520, base2: 30780, extraPerson: 7011, extraChild: 855 },
    
    // Sachsen-Anhalt
    "ST": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 500 },
    
    // Schleswig-Holstein
    "SH": { base1: 14400, base2: 21600, extraPerson: 5000, extraChild: 600 },
    
    // Thüringen
    "TH": { base1: 14400, base2: 21600, extraPerson: 5000, extraChild: 1000 },

    // Fallback für alle anderen Bundesländer (orientiert am Bundes-WoFG §9)
    "DEFAULT": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 500 }
};

    const berechneWBS = () => {
        // 1. Werte auslesen & Validierung
        const bundesland = document.getElementById("wbs_bundesland").value;
        if (!bundesland) {
            alert("Bitte wählen Sie ein Bundesland aus.");
            document.getElementById("wbs_bundesland").focus();
            return;
        }

        const erwachsene = parseInt(document.getElementById("wbs_erwachsene").value) || 1;
        const kinder = parseInt(document.getElementById("wbs_kinder").value) || 0;
        const bruttoJahr = parseFloat(document.getElementById("wbs_brutto_jahr").value) || 0;

        if (bruttoJahr <= 0) {
            alert("Bitte geben Sie ein gültiges Jahresbruttoeinkommen ein.");
            return;
        }

        // Abzüge (Checkboxen)
        const abzugSteuer = document.getElementById("wbs_abzug_steuer").checked;
        const abzugKV = document.getElementById("wbs_abzug_kv").checked;
        const abzugRV = document.getElementById("wbs_abzug_rv").checked;

        // Freibeträge & Werbungskosten
        const istAlleinerziehend = document.getElementById("wbs_alleinerziehend").checked;
        const istSchwerbehindert = document.getElementById("wbs_schwerbehindert").checked;
        let werbungskostenEingabe = parseFloat(document.getElementById("wbs_werbungskosten").value) || 0;

        // 2. Berechnung des maßgeblichen Einkommens (§ 14 WoFG)
        
        // A) Werbungskosten abziehen (mindestens Arbeitnehmerpauschbetrag von 1.230 €)
        const werbungskosten = Math.max(1230, werbungskostenEingabe);
        let bereinigtesBrutto = Math.max(0, bruttoJahr - werbungskosten);

        // B) Pauschale Abzüge (jeweils 10%)
        let abzugProzent = 0;
        if (abzugSteuer) abzugProzent += 0.10;
        if (abzugKV) abzugProzent += 0.10;
        if (abzugRV) abzugProzent += 0.10;

        const pauschalerAbzugWert = bereinigtesBrutto * abzugProzent;
        let einkommenNachAbzuegen = bereinigtesBrutto - pauschalerAbzugWert;

        // C) Besondere Freibeträge abziehen (Typische Pauschalen zur Veranschaulichung)
        let freibetraegeSumme = 0;
        if (istSchwerbehindert) freibetraegeSumme += 4500; // Freibetrag Schwerbehinderung (bspw. ab GdB 50 / Pflegegrad)
        if (istAlleinerziehend && kinder > 0) freibetraegeSumme += 600; // Alleinerziehendenfreibetrag (Basiswert)

        const massgeblichesEinkommen = Math.max(0, einkommenNachAbzuegen - freibetraegeSumme);

        // 3. WBS-Grenze für den Haushalt ermitteln
        const landData = wbsGrenzen[bundesland] || wbsGrenzen["DEFAULT"];
        const gesamtPersonen = erwachsene + kinder;
        
        let einkommensGrenze = 0;
        if (gesamtPersonen === 1) {
            einkommensGrenze = landData.base1;
        } else if (gesamtPersonen === 2) {
            einkommensGrenze = landData.base2 + (kinder * landData.extraChild); 
        } else {
            // Ab 3 Personen: Basis 2-Personen + Aufschlag für jede weitere Person
            const weitereErwachsene = erwachsene > 2 ? erwachsene - 2 : 0;
            // Wenn 1 Erwachsener + 2 Kinder = 3 Personen. Basis für 2 Pers + 1 weiteres Kind.
            const weiterePersonenInsgesamt = gesamtPersonen - 2;
            
            // Vereinfachte Formel für den Rechner (2er-Basis + X weitere Personen)
            einkommensGrenze = landData.base2 + (weiterePersonenInsgesamt * landData.extraPerson);
            // Kinder-Zusatzfreibeträge je nach Bundesland addieren
            einkommensGrenze += (kinder * landData.extraChild);
        }

        const differenz = einkommensGrenze - massgeblichesEinkommen;

        // 4. Ergebnis-HTML generieren
        let ergebnisHTML = `<div style="margin-top: 30px; padding: 20px; border-radius: 8px; border: 1px solid #ddd; background-color: #fcfcfc;">`;
        ergebnisHTML += `<h2 style="margin-top: 0;">Ihre WBS-Auswertung</h2>`;

        // Berechnungsweg Tabelle
        ergebnisHTML += `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; font-size: 0.95em;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 0;">Bruttoeinkommen gesamt</td>
                    <td style="padding: 6px 0; text-align: right;">${formatCurrency(bruttoJahr)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 0; color: #d32f2f;">- Werbungskosten (Pauschale o. Eingabe)</td>
                    <td style="padding: 6px 0; text-align: right; color: #d32f2f;">- ${formatCurrency(werbungskosten)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 6px 0; color: #d32f2f;">- Pauschale Abzüge (${(abzugProzent * 100).toFixed(0)}%)</td>
                    <td style="padding: 6px 0; text-align: right; color: #d32f2f;">- ${formatCurrency(pauschalerAbzugWert)}</td>
                </tr>
                <tr style="border-bottom: 2px solid #ccc;">
                    <td style="padding: 6px 0; color: #d32f2f;">- Zusätzliche Freibeträge</td>
                    <td style="padding: 6px 0; text-align: right; color: #d32f2f;">- ${formatCurrency(freibetraegeSumme)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: bold; font-size: 1.1em;">Maßgebliches Einkommen</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 1.1em;">${formatCurrency(massgeblichesEinkommen)}</td>
                </tr>
            </table>
        `;

        // Gegenüberstellung mit Grenze
        ergebnisHTML += `
            <div style="background-color: #e3f2fd; padding: 12px; border-radius: 4px; margin-bottom: 20px; text-align: center;">
                <p style="margin: 0; font-size: 0.9em; color: #555;">Maximal erlaubtes Einkommen für Ihren Haushalt in diesem Bundesland:</p>
                <strong style="font-size: 1.2em; color: #1976d2;">${formatCurrency(einkommensGrenze)}</strong>
            </div>
        `;

        // Logik: Anspruch Ja oder Nein
        if (massgeblichesEinkommen <= einkommensGrenze) {
            // ANSPRUCH VORHANDEN
            ergebnisHTML += `
                <div style="background-color: #e8f5e9; border-left: 5px solid #4caf50; padding: 15px; margin-bottom: 15px;">
                    <h3 style="color: #2e7d32; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#2e7d32"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        Gute Chancen auf einen WBS!
                    </h3>
                    <p style="margin-bottom: 0;">
                        Ihr maßgebliches Einkommen liegt <strong>unter</strong> der gesetzlichen Einkommensgrenze. 
                        Sie haben voraussichtlich Anspruch auf einen Wohnberechtigungsschein. 
                        Reichen Sie den Antrag zeitnah bei Ihrem zuständigen Wohnungsamt ein.
                    </p>
                </div>
            `;
        } else {
            // KEIN ANSPRUCH
            ergebnisHTML += `
                <div style="background-color: #ffebee; border-left: 5px solid #f44336; padding: 15px; margin-bottom: 15px;">
                    <h3 style="color: #c62828; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#c62828"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                        Einkommensgrenze überschritten
                    </h3>
                    <p>
                        Ihr maßgebliches Einkommen überschreitet die Grenze um <strong>${formatCurrency(Math.abs(differenz))}</strong>. 
                        Ein Anspruch auf den regulären (Typ A) Wohnberechtigungsschein besteht voraussichtlich <strong>nicht</strong>.
                    </p>
                </div>
                <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; font-size: 0.9em;">
                    <strong>Tipp:</strong> Einige Kommunen vergeben Sonder-WBS (oft "Typ B" genannt) für mittlere Einkommen, 
                    die die reguläre Grenze um bis zu 40% überschreiten. Fragen Sie trotzdem bei Ihrem Wohnungsamt nach!
                </div>
            `;
        }

        ergebnisHTML += `</div>`;

        // Ergebnis ins DOM einfügen
        ergebnisContainer.innerHTML = ergebnisHTML;

        // Zum Ergebnis scrollen
        ergebnisContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Events binden
    if (btnBerechnen) {
        btnBerechnen.addEventListener("click", berechneWBS);
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            ergebnisContainer.innerHTML = "";
            // Formular wird automatisch zurückgesetzt durch type="reset"
        });
    }
});