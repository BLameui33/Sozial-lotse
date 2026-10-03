document.addEventListener("DOMContentLoaded", () => {
    const btnBerechnen = document.getElementById("wbs_berechnen");
    const btnReset = document.getElementById("wbs_reset");
    const ergebnisContainer = document.getElementById("wbs_ergebnis");

    // Währung formatieren (z. B. 15.000,00 €)
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    };

    // ============================================================
    // WBS-Einkommensgrenzen – Stand 2026
    // Quellen: Landeswohnraumfördergesetze, Landesverordnungen,
    // Erlasse der Wohnungsbauministerien (zuletzt geprüft: 09/2026)
    //
    // Zusätzliche optionale Felder pro Land:
    //  bruttoBasis : true  -> Grenze gilt fürs Brutto-Haushaltseinkommen
    //                         (nur Baden-Württemberg), keine 30-%-Pauschale
    //  modell: "nrw"        -> NRW-Sonderlogik: ab 3. Person je extraPerson,
    //                         kein zusätzlicher Kinderzuschlag;
    //                         Alleinerziehend: extraChild (860) je Kind,
    //                         ab 2. Kind wie weitere Person
    //  freibetragSB         -> abweichender Schwerbehinderten-Freibetrag (NI: 4000)
    //  freibetragAZ         -> abweichender Alleinerziehenden-Freibetrag je Kind (NI: 1000)
    //  label                -> wird im Ergebnis angezeigt
    // ============================================================
    const wbsGrenzen = {
        // Baden-Württemberg – Erlass MLW v. 01.12.2025; Grenzen gelten fürs BRUTTOeinkommen!
        "BW": { base1: 60350, base2: 60350, extraPerson: 9000, extraChild: 500, bruttoBasis: true, label: "Baden-Württemberg (Brutto-Basis, Erlass 01.12.2025)" },

        // Bayern – Einkommensstufe I (Art. 11 BayWoFG)
        "BY": { base1: 22600, base2: 34500, extraPerson: 8500, extraChild: 2500, label: "Bayern (Einkommensstufe I)" },

        // Berlin – WBS 140 (§ 9 WoFG + 40 %); WBS 100 = Bundeswerte
        "BE": { base1: 16800, base2: 25200, extraPerson: 5740, extraChild: 700, label: "Berlin (WBS 140)" },

        // Brandenburg – seit 01.01.2024 (§ 22 BbgWoFG)
        "BB": { base1: 18500, base2: 26000, extraPerson: 5800, extraChild: 2000, label: "Brandenburg (seit 01.01.2024)" },

        // Bremen – Bundesgrenzen + 600 € je Kind
        "HB": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 600, label: "Bremen" },

        // Hamburg – Bundesgrenzen + 1.000 € je Kind
        "HH": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 1000, label: "Hamburg" },

        // Hessen – Aktualisiert 2026
        "HE": { base1: 20146, base2: 30565, extraPerson: 6948, extraChild: 924, label: "Hessen" },

        // Mecklenburg-Vorpommern – Aktualisiert 2026 (Kinder zählen als Haushaltsmitglieder, kein separater Kinderzuschlag)
        "MV": { base1: 25800, base2: 38700, extraPerson: 8800, extraChild: 0, label: "Mecklenburg-Vorpommern" },

        // Niedersachsen – seit 01.03.2025 (§ 3 NWoFG); Kinder zählen doppelt (Person + Kind)
        "NI": { base1: 21250, base2: 28750, extraPerson: 3750, extraChild: 3750, freibetragSB: 4000, freibetragAZ: 1000, label: "Niedersachsen (seit 01.03.2025)" },

        // Nordrhein-Westfalen – seit 01.01.2025; Sonderlogik (siehe modell)
        "NW": { base1: 23540, base2: 28350, extraPerson: 7390, extraChild: 860, modell: "nrw", label: "Nordrhein-Westfalen" },

        // Rheinland-Pfalz – Aktualisiert 2026
        "RP": { base1: 20000, base2: 28700, extraPerson: 6700, extraChild: 1400, label: "Rheinland-Pfalz" },

        // Saarland – Bundesgrenzen
        "SL": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 500, label: "Saarland" },

        // Sachsen – SächsEinkGrenzVO v. 02.12.2025, ab 01.01.2026 (+22,1 %)
        "SN": { base1: 20520, base2: 30780, extraPerson: 7011, extraChild: 855, label: "Sachsen (seit 01.01.2026)" },

        // Sachsen-Anhalt – Bundesgrenzen
        "ST": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 500, label: "Sachsen-Anhalt" },

        // Schleswig-Holstein – Aktualisiert 2026
        "SH": { base1: 14400, base2: 21600, extraPerson: 5000, extraChild: 600, label: "Schleswig-Holstein" },

        // Thüringen
        "TH": { base1: 14400, base2: 21600, extraPerson: 5000, extraChild: 1000, label: "Thüringen" },

        // Fallback = Bundes-WoFG § 9
        "DEFAULT": { base1: 12000, base2: 18000, extraPerson: 4100, extraChild: 500, label: "Bundesgrenze (§ 9 WoFG)" }
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
        const istVerheiratet = document.getElementById("wbs_verheiratet").checked;
        const arbeitnehmer = parseInt(document.getElementById("wbs_arbeitnehmer").value) || 0;
        const istSchwerbehindert = document.getElementById("wbs_schwerbehindert").checked;
        let werbungskostenEingabe = parseFloat(document.getElementById("wbs_werbungskosten").value) || 0;

        const landData = wbsGrenzen[bundesland] || wbsGrenzen["DEFAULT"];
        const gesamtPersonen = erwachsene + kinder;

        // 2. Berechnung des maßgeblichen Einkommens (§ 14 WoFG)
        //
        // A) Werbungskosten abziehen (mindestens Arbeitnehmerpauschbetrag 1.230 €)
        //    Ausnahme BW: dort wird das Brutto-Haushaltseinkommen herangezogen.
            const pauschaleWerbungskosten = arbeitnehmer * 1230;
            const werbungskosten = landData.bruttoBasis ? 0 : Math.max(pauschaleWerbungskosten, werbungskostenEingabe);
            let bereinigtesBrutto = Math.max(0, bruttoJahr - werbungskosten);

        // B) Pauschale Abzüge (jeweils 10 %, max. 30 %) – entfällt in BW (Brutto-Basis)
        let abzugProzent = 0;
        if (!landData.bruttoBasis) {
            if (abzugSteuer) abzugProzent += 0.10;
            if (abzugKV) abzugProzent += 0.10;
            if (abzugRV) abzugProzent += 0.10;
        }
        const pauschalerAbzugWert = bereinigtesBrutto * abzugProzent;
        let einkommenNachAbzuegen = bereinigtesBrutto - pauschalerAbzugWert;

        // C) Besondere Freibeträge (§ 24 WoFG, landesrechtliche Abweichungen möglich)
        //    Schwerbehinderung: 2.100 € standardmäßig; bei GdB 100 (o. GdB ≥ 80 mit
        //    häuslicher Pflegebedürftigkeit) sind 4.500 € abzugsfähig.
        //    NI: 4.000 € bei GdB ab 50/Pflegegrad 2. Alleinerziehend: je Kind
        //    (unter 12 J.) bei Erwerbstätigkeit; NI 1.000 €, sonst 600 €.
        const freibetragSB = landData.freibetragSB ?? 2100;
        const freibetragAZ = landData.freibetragAZ ?? 600;

        let freibetraegeSumme = 0;
        let hinweisFreibetraege = "";
        if (istSchwerbehindert) {
            freibetraegeSumme += freibetragSB;
            if (!landData.freibetragSB) {
                hinweisFreibetraege += "Bei GdB 100 bzw. GdB ab 80 mit Pflegebedürftigkeit sind ggf. 4.500 € statt 2.100 € abzugsfähig. ";
            }
        }
        if (istAlleinerziehend && kinder > 0) {
            freibetraegeSumme += freibetragAZ * kinder;
            hinweisFreibetraege += "Alleinerziehenden-Freibetrag gilt je Kind unter 12 Jahren bei Erwerbstätigkeit.";
        }
        if (istVerheiratet) {
    freibetraegeSumme += 4000;
    hinweisFreibetraege += "Ehepaar-Freibetrag: 4.000 € für verheiratete Paare oder eingetragene Lebenspartnerschaften. ";
}

        const massgeblichesEinkommen = Math.max(0, einkommenNachAbzuegen - freibetraegeSumme);

        // 3. WBS-Grenze für den Haushalt ermitteln
        //    Standardmodell (u. a. BB, SN, NI, BY, BE, Bundesgrenze):
        //    Kinder zählen als Haushaltsperson UND erhalten den Kind-Zuschlag.
        //    NRW-Sondermodell: ab 3. Person (inkl. Kind) nur extraPerson, kein
        //    zusätzlicher Kind-Zuschlag; Alleinerziehende: extraChild (860) je Kind.
        let einkommensGrenze = 0;

        if (landData.modell === "nrw") {
            if (gesamtPersonen === 1) {
                einkommensGrenze = landData.base1;
            } else if (erwachsene === 1) {
                // Alleinerziehend: 2-Personen-Basis + 860 € je Kind,
                // ab dem 2. Kind je weitere Person (Näherung)
                einkommensGrenze = landData.base2 + landData.extraChild + (kinder - 1) * landData.extraPerson;
            } else {
                einkommensGrenze = landData.base2 + (gesamtPersonen - 2) * landData.extraPerson;
            }
        } else {
            if (gesamtPersonen === 1) {
                einkommensGrenze = landData.base1;
            } else if (gesamtPersonen === 2) {
                // z. B. 1 Erw. + 1 Kind: Zweipersonenhaushalt + Kind-Zuschlag
                einkommensGrenze = landData.base2 + (kinder * landData.extraChild);
            } else {
                einkommensGrenze = landData.base2
                    + ((gesamtPersonen - 2) * landData.extraPerson)
                    + (kinder * landData.extraChild);
            }
        }

        const differenz = einkommensGrenze - massgeblichesEinkommen;

        // 4. Ergebnis-HTML generieren
        let ergebnisHTML = `<div style="margin-top: 30px; padding: 20px; border-radius: 8px; border: 1px solid #ddd; background-color: #fcfcfc;">`;
        ergebnisHTML += `<h2 style="margin-top: 0;">Ihre WBS-Auswertung</h2>`;
        ergebnisHTML += `<p style="font-size: 0.85em; color: #777; margin-top: -5px;">Grenzwerte: ${landData.label || "Bundesgrenze"} · Stand 2026 · unverbindliche Schätzung</p>`;

        // Berechnungsweg Tabelle (zeilenweise, damit BW-Bruttomodell sauber dargestellt wird)
        let zeilen = `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 0;">${landData.bruttoBasis ? "Brutto-Haushaltseinkommen (BW-Bruttomodell)" : "Bruttoeinkommen gesamt"}</td>
                <td style="padding: 6px 0; text-align: right;">${formatCurrency(bruttoJahr)}</td>
            </tr>`;
        if (!landData.bruttoBasis) {
            zeilen += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 0; color: #d32f2f;">- Werbungskosten (je 1.230 € pro Arbeitnehmer o. Eingabe)</td>
                <td style="padding: 6px 0; text-align: right; color: #d32f2f;">- ${formatCurrency(werbungskosten)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 0; color: #d32f2f;">- Pauschale Abzüge (${(abzugProzent * 100).toFixed(0)}%)</td>
                <td style="padding: 6px 0; text-align: right; color: #d32f2f;">- ${formatCurrency(pauschalerAbzugWert)}</td>
            </tr>`;
        }
        zeilen += `
            <tr style="border-bottom: 2px solid #ccc;">
                <td style="padding: 6px 0; color: #d32f2f;">- Zusätzliche Freibeträge</td>
                <td style="padding: 6px 0; text-align: right; color: #d32f2f;">- ${formatCurrency(freibetraegeSumme)}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; font-weight: bold; font-size: 1.1em;">Maßgebliches Einkommen</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; font-size: 1.1em;">${formatCurrency(massgeblichesEinkommen)}</td>
            </tr>`;

        ergebnisHTML += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; font-size: 0.95em;">${zeilen}</table>`;

        if (landData.bruttoBasis) {
            ergebnisHTML += `
                <div style="background-color: #fff8e1; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 0.85em;">
                    <strong>Hinweis Baden-Württemberg:</strong> Dort wird das <em>Brutto</em>-Haushaltseinkommen
                    herangezogen – Werbungskosten- und Sozialversicherungspauschalen werden nicht abgezogen.
                </div>`;
        }
        if (hinweisFreibetraege) {
            ergebnisHTML += `
                <div style="background-color: #fff8e1; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 0.85em;">
                    <strong>Hinweis Freibeträge:</strong> ${hinweisFreibetraege}
                </div>`;
        }

        // Gegenüberstellung mit Grenze
        ergebnisHTML += `
            <div style="background-color: #e3f2fd; padding: 12px; border-radius: 4px; margin-bottom: 20px; text-align: center;">
                <p style="margin: 0; font-size: 0.9em; color: #555;">Maximal erlaubtes Einkommen für Ihren Haushalt (${gesamtPersonen} Person${gesamtPersonen > 1 ? "en" : ""}):</p>
                <strong style="font-size: 1.2em; color: #1976d2;">${formatCurrency(einkommensGrenze)}</strong>
            </div>
        `;

        // Logik: Anspruch Ja oder Nein
        if (massgeblichesEinkommen <= einkommensGrenze) {
            ergebnisHTML += `
                <div style="background-color: #e8f5e9; padding: 15px; margin-bottom: 15px;">
                    <h3 style="color: #2e7d32; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#2e7d32"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        Gute Chancen auf einen WBS!
                    </h3>
                    <p style="margin-bottom: 0;">
                        Ihr maßgebliches Einkommen liegt <strong>unter</strong> der Einkommensgrenze.
                        Sie haben voraussichtlich Anspruch auf einen Wohnberechtigungsschein.
                        Reichen Sie den Antrag zeitnah bei Ihrem zuständigen Wohnungsamt ein.
                    </p>
                </div>
            `;
        } else {
            ergebnisHTML += `
                <div style="background-color: #ffebee;  padding: 15px; margin-bottom: 15px;">
                    <h3 style="color: #c62828; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#c62828"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                        Einkommensgrenze überschritten
                    </h3>
                    <p>
                        Ihr maßgebliches Einkommen überschreitet die Grenze um <strong>${formatCurrency(Math.abs(differenz))}</strong>.
                        Ein Anspruch auf den regulären Wohnberechtigungsschein besteht voraussichtlich <strong>nicht</strong>.
                    </p>
                </div>
                <div style="background-color: #fff; padding: 15px; font-size: 0.9em; margin-bottom: 15px;">
                    <strong>Tipp:</strong> Viele Länder vergeben Scheine für höhere Einkommen: Berlin (WBS 160/180/220),
                    NRW (Einkommensgruppe B), Brandenburg (WBSplus +40 %/+60 %), Niedersachsen (EK-Gruppe B),
                    Sachsen (zweite Einkommensgrenze, z. B. 23.640 € für 1 Person).
                    Fragen Sie trotzdem bei Ihrem Wohnungsamt nach!
                </div>
            `;
        }

        // Allgemeine Hinweise (Vermögensgrenze, Gültigkeit)
        ergebnisHTML += `
            <div style="font-size: 0.8em; color: #888; line-height: 1.5;">
                <strong>Bitte beachten:</strong> Zusätzlich zur Einkommensgrenze gilt eine Vermögensgrenze
                (60.000 € für die erste Person + 30.000 € je weitere Person). Der WBS ist in der Regel
                1 Jahr gültig. Dieser Rechner ersetzt keine verbindliche Prüfung durch das Wohnungsamt.
            </div>
        `;

        ergebnisHTML += `</div>`;

        ergebnisContainer.innerHTML = ergebnisHTML;
        ergebnisContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Events binden
    if (btnBerechnen) {
        btnBerechnen.addEventListener("click", berechneWBS);
    }

    if (btnReset) {
        btnReset.addEventListener("click", () => {
            ergebnisContainer.innerHTML = "";
        });
    }
});