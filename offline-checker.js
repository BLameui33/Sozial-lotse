// offline-checker.js
// Analyse von Betrugsversuchen an Haustür und Telefon

document.addEventListener("DOMContentLoaded", () => {
    const btnCheck = document.getElementById("btn_check_offline");
    const btnReset = document.getElementById("btn_reset_offline");
    const resultArea = document.getElementById("offline_result_area");

    btnCheck.addEventListener("click", () => {
        // Werte auslesen
        const place = document.querySelector('input[name="place"]:checked')?.value;
        const who = document.querySelector('input[name="who"]:checked')?.value;
        const action = document.querySelector('input[name="action"]:checked')?.value;
        const pressure = document.querySelector('input[name="pressure"]:checked')?.value;

        // Validierung
        if (!place || !who || !action || !pressure) {
            resultArea.innerHTML = `
                <div class="warning-box" style="background:#fff3cd; color:#856404; padding:15px; border-radius:4px; margin-top:20px;">
                    Bitte beantworten Sie alle 4 Fragen, damit eine grobe Risiko-Einschätzung möglich ist.
                </div>
            `;
            return;
        }

        let isScam = false;
        let scamType = "";
        let specificWarning = "";
        let instructions = [];

        // --- LOGIK DER BETRUGSMASCHEN ---

        // 1. Enkeltrick / Schockanruf
        if (place === "phone" && (who === "family" || who === "authority") && (action === "money_now" || action === "transfer")) {
            isScam = true;
            scamType = "Enkeltrick / Schockanruf";
            specificWarning = "Das ist ein starkes Warnsignal: Bei solchen Anrufen wird häufig mit Druck/Notlagen gearbeitet, um Geld oder Wertsachen zu bekommen.";
            instructions = [
                "Beenden Sie das Gespräch sofort (auflegen).",
                "Rufen Sie den Angehörigen oder die angebliche Stelle über eine Ihnen bekannte/selbst recherchierte Nummer zurück (nicht über die Rückruftaste).",
                "Übergeben Sie niemals Geld oder Wertsachen an unbekannte Personen/Boten."
            ];
        }

        // 2. Dachhaie / Falsche Handwerker
        else if (place === "door" && who === "craftsman" && (action === "money_now" || action === "contract")) {
            isScam = true;
            scamType = "Unseriöse Handwerker (Dach/Steinreinigung)";
            specificWarning = "Das wirkt riskant: Unangekündigte „Sofort-Angebote“ und Druck zur schnellen Unterschrift/Barzahlung sind typische Warnsignale.";
            instructions = [
                "Lassen Sie niemanden in die Wohnung / ins Haus.",
                "Unterschreiben Sie nichts an der Haustür und zahlen Sie nichts sofort in bar.",
                "Wenn Personen nicht gehen oder Sie sich bedrängt fühlen: Polizei über 110 rufen."
            ];
        }

        // 3. Falsche Wasserwerker / Diebe
        else if (place === "door" && (who === "craftsman" || who === "authority") && action === "entrance") {
            isScam = true;
            scamType = "Verdacht: Einschleichdiebstahl / falscher Amtsträger";
            specificWarning = "Vorsicht: Vorwände wie „Rohrbruch“, „Kontrolle“ oder „Einbruchschutz“ werden teils genutzt, um Zutritt zu bekommen und Wertsachen zu stehlen.";
            instructions = [
                "Öffnen Sie nicht vollständig (Sperrbügel/Türspalt nutzen) und lassen Sie niemanden ohne Prüfung hinein.",
                "Prüfen Sie den Besuch über eine selbst recherchierte Nummer (Hausverwaltung/Versorger/Polizei) – nicht über Nummern, die die Person nennt.",
                "Lassen Sie niemanden unbeaufsichtigt und halten Sie Wertsachen außer Sicht."
            ];
        }

        // 4. Gewinnspielversprechen
        else if (who === "win" && (action === "transfer" || action === "money_now")) {
            isScam = true;
            scamType = "Gewinnspiel-Betrug";
            specificWarning = "Achtung: Forderungen nach Gebühren, „Freischaltung“ oder Gutscheinkarten sind ein typisches Betrugsmerkmal.";
            instructions = [
                "Zahlen Sie nichts und geben Sie keine Bank-/Kartendaten heraus.",
                "Kaufen Sie keine Gutscheinkarten (z.B. Amazon/Paysafe/Google).",
                "Beenden Sie den Kontakt (auflegen/blockieren) und sichern Sie ggf. Beweise (Nummer, SMS, Gesprächszeit)."
            ];
        }
        
        // 5. Genereller Druck (Catch-all)
        else if (pressure === "high" || pressure === "secret") {
            isScam = true;
            scamType = "Verdacht auf Betrug (Druck/Geheimhaltung)";
            specificWarning = "Zeitdruck („sofort“) oder Geheimhaltung („niemandem sagen“) sind typische Manipulationssignale. Nehmen Sie sich bewusst Zeit zum Prüfen.";
            instructions = [
                "Stoppen Sie die Situation: nichts unterschreiben, nichts zahlen, keine Daten herausgeben.",
                "Holen Sie eine Vertrauensperson dazu oder rufen Sie später über eine offizielle Nummer zurück.",
                "Wenn Sie sich unsicher oder bedroht fühlen: Kontakt abbrechen und im Zweifel 110 wählen."
            ];
        }

        // --- ERGEBNIS ANZEIGEN ---

        let html = "";
        
        if (isScam) {
            // ROTES ERGEBNIS
            html = `
                <div class="result-card" style="margin-top:30px; border: 2px solid #c0392b; border-radius: 8px; overflow: hidden; background: #fff;">
                    <div style="background:#fadbd8; color:#c0392b; padding:20px; text-align:center;">
                        <div style="font-size:3rem;">🚨</div>
                        <h2 style="margin:10px 0 0 0; color:#c0392b;">ACHTUNG: Hohes Risiko / starke Warnsignale</h2>
                        <p style="font-weight:bold; font-size:1.2em;">Verdacht auf: ${scamType}</p>
                        <p style="margin:8px 0 0 0; font-size:0.95em; opacity:0.9;">
                            Hinweis: Das ist eine automatisierte Einschätzung anhand Ihrer Angaben – keine Garantie.
                        </p>
                    </div>
                    <div style="padding:20px;">
                        <p class="highlight-box" style="border-color:#c0392b; background:#fff;">${specificWarning}</p>
                        <h3>Was Sie jetzt tun sollten:</h3>
                        <ul>
                            ${instructions.map(i => `<li style="font-size:1.1em; margin-bottom:8px;">${i}</li>`).join('')}
                        </ul>
                        <div style="margin-top:20px; text-align:center;">
                            <a href="tel:110" class="button" style="background:#c0392b; color:white;">Im Notfall: Polizei (110) wählen</a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // GRÜNES/GELBES ERGEBNIS (Entwarnung, aber Vorsicht)
            html = `
                <div class="result-card" style="margin-top:30px; border: 2px solid #f39c12; border-radius: 8px; overflow: hidden; background: #fff;">
                    <div style="background:#fdebd0; color:#d35400; padding:20px; text-align:center;">
                        <div style="font-size:3rem;">✋</div>
                        <h2 style="margin:10px 0 0 0; color:#d35400;">Aktuell kein klares Muster – bitte trotzdem vorsichtig</h2>
                        <p style="margin:8px 0 0 0; font-size:0.95em; opacity:0.9;">
                            Hinweis: Das ist eine grobe Einschätzung. Im Zweifel immer verifizieren und nichts überstürzen.
                        </p>
                    </div>
                    <div style="padding:20px;">
                        <p>Auch ohne eindeutiges Muster helfen diese Sicherheitsregeln fast immer:</p>
                        <ul>
                            <li>Lassen Sie keine Fremden ohne Termin und ohne Prüfung in die Wohnung.</li>
                            <li>Geben Sie am Telefon keine sensiblen Daten und keine Infos zu Geld/Wertsachen preis.</li>
                            <li>Unterschreiben Sie nichts an der Haustür und zahlen Sie nicht unter Druck.</li>
                        </ul>
                        <p><strong>Faustregel:</strong> Seriöse Stellen akzeptieren ein „Nein“ und haben kein Problem damit, wenn Sie später über eine offizielle Nummer zurückrufen.</p>
                    </div>
                </div>
            `;
        }

        resultArea.innerHTML = html;
        resultArea.scrollIntoView({ behavior: "smooth" });
    });

    btnReset.addEventListener("click", () => {
        resultArea.innerHTML = "";
    });
});
