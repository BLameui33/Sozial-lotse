// phishing-radar.js
// Clientseitige Analyse von Texten auf typische Phishing-Merkmale.

document.addEventListener("DOMContentLoaded", () => {
    const textField = document.getElementById("mail_text");
    const checkLink = document.getElementById("check_link");
    const checkSender = document.getElementById("check_sender");
    const checkAttachment = document.getElementById("check_attachment");
    const btnAnalyze = document.getElementById("btn_analyze");
    const btnReset = document.getElementById("btn_reset");
    const resultArea = document.getElementById("result_area");

    // Datenbank der Signalwörter (Trigger)
    // Wir gruppieren sie nach Kategorien für detailliertes Feedback
    const patterns = {
        urgency: {
            label: "Druck & Panikmache",
            words: ["sofort", "dringend", "gesperrt", "eingeschränkt", "letzte warnung", "innerhalb von 24 stunden", "sicherheitsmaßnahme", "unautorisierter zugriff", "identität bestätigen", "konto deaktiviert", "verifizieren sie", "handlungsbedarf"]
        },
        money: {
            label: "Geld & Gewinne",
            words: ["gewonnen", "erbschaft", "millionen", "lotterie", "auszahlung", "überweisen", "bitcoin", "krypto", "schnell geld", "investition", "guthaben", "rückerstattung", "fällige zahlung"]
        },
        action: {
            label: "Aufforderung zum Klick/Daten",
            words: ["hier klicken", "link folgen", "anhang öffnen", "daten aktualisieren", "passwort ändern", "tan eingeben", "pin", "login bestätigen", "formular ausfüllen"]
        },
        salutation: {
            label: "Unpersönliche Ansprache",
            words: ["lieber kunde", "sehr geehrter kunde", "lieber nutzer", "hallo freund", "sehr geehrte damen und herren", "werte kunden"]
        }
    };

    btnAnalyze.addEventListener("click", () => {
        resultArea.innerHTML = "";
        
        const text = textField.value.toLowerCase();
        
        // Einfache Validierung
        if (text.length < 10 && !checkLink.checked && !checkSender.checked && !checkAttachment.checked) {
            resultArea.innerHTML = `
                <div class="warning-box" style="background:#fff3cd; color:#856404; padding:15px; border-radius:4px; margin-top:20px;">
                    <strong>Bitte geben Sie etwas Text ein</strong> oder wählen Sie mindestens ein Merkmal (Checkboxen) aus, damit eine Risiko-Einschätzung möglich ist.
                </div>
            `;
            return;
        }

        let score = 0;
        let findings = [];
        let foundKeywords = [];

        // 1. Textanalyse
        for (const [category, data] of Object.entries(patterns)) {
            let catMatches = [];
            data.words.forEach(word => {
                if (text.includes(word)) {
                    catMatches.push(word);
                    foundKeywords.push(word);
                }
            });

            if (catMatches.length > 0) {
                score += catMatches.length * 15; // Jedes Wort gibt Punkte
                findings.push(`<li><strong>${data.label}:</strong> Gefunden wurden z.B. <em>"${catMatches.join('", "')}"</em>. Solche Formulierungen werden bei Phishing häufig genutzt, um Druck aufzubauen oder zu schnellen Handlungen zu bewegen.</li>`);
            }
        }

        // 2. Checkboxen Analyse (Wiegen schwer!)
        if (checkLink.checked) {
            score += 40;
            findings.push("<li><strong>Verdächtiger Link:</strong> Wenn ein Link verkürzt, kryptisch oder domain-fremd wirkt, ist das ein starkes Warnsignal. Klicken Sie nicht, sondern prüfen Sie den Anbieter über die offizielle Website/App.</li>");
        }
        if (checkSender.checked) {
            score += 35;
            findings.push("<li><strong>Unplausibler Absender:</strong> Wenn die Absenderadresse nicht zur offiziellen Domain passt, ist das ein sehr häufiges Betrugsmerkmal. Zur Sicherheit: niemals über „Antworten“ reagieren, sondern den Anbieter selbst kontaktieren.</li>");
        }
        if (checkAttachment.checked) {
            score += 30;
            findings.push("<li><strong>Unerwarteter Anhang:</strong> Unerwartete Anhänge können Schadsoftware enthalten. Öffnen Sie den Anhang nicht und prüfen Sie den Vorgang über einen sicheren, offiziellen Weg.</li>");
        }

        // 3. Ergebnisberechnung
        let resultTitle = "";
        let resultColor = "";
        let resultIcon = "";
        let resultText = "";
        let bgColor = "";

        if (score >= 40) {
            // Rotes Ergebnis (Hohes Risiko)
            resultTitle = "Achtung: hohes Phishing-Risiko";
            resultColor = "#c0392b";
            bgColor = "#fadbd8";
            resultIcon = "🚨";
            resultText = "Diese Nachricht enthält mehrere starke Warnsignale. Klicken Sie nicht auf Links, öffnen Sie keine Anhänge und geben Sie keine Zugangsdaten (z.B. PIN/TAN/Passwort) ein.";
        } else if (score >= 15) {
            // Gelbes Ergebnis (Verdacht)
            resultTitle = "Vorsicht: auffällige Merkmale";
            resultColor = "#d35400";
            bgColor = "#fdebd0";
            resultIcon = "⚠️";
            resultText = "Es wurden einige Warnsignale gefunden. Prüfen Sie den Vorgang über die offizielle Website/App (selbst eintippen) und nicht über Links in der Nachricht.";
        } else {
            // Grünes Ergebnis (Entwarnung, aber Vorsicht)
            resultTitle = "Keine eindeutigen Warnsignale gefunden";
            resultColor = "#27ae60";
            bgColor = "#d5f5e3";
            resultIcon = "✅";
            resultText = "Im Text wurden keine typischen Signalwörter erkannt. <strong>Wichtig:</strong> Das ist keine Garantie. Wenn Absender/Link/Anhang trotzdem komisch wirkt, lieber nicht reagieren und den Anbieter über offizielle Wege prüfen.";
        }

        // HTML zusammenbauen
        let keywordsHtml = foundKeywords.length > 0 
            ? `<div style="margin-top:10px;"><strong>Gefundene Signalwörter:</strong><br>${foundKeywords.map(k => `<span class="keyword-tag">${k}</span>`).join(' ')}</div>` 
            : "";

        const html = `
            <div class="result-card" style="margin-top:30px; border: 2px solid ${resultColor}; border-radius: 8px; overflow: hidden; background: #fff;">
                <div style="background:${bgColor}; color:${resultColor}; padding:20px; text-align:center;">
                    <div style="font-size:3rem;">${resultIcon}</div>
                    <h2 style="margin:10px 0 0 0; color:${resultColor};">${resultTitle}</h2>
                    <p style="margin:8px 0 0 0; font-size:0.95em; opacity:0.9;">
                        Hinweis: Automatisierte Risiko-Einschätzung anhand von Textmerkmalen (keine Garantie).
                    </p>
                </div>
                <div style="padding:20px;">
                    <p class="lead" style="font-weight:bold;">${resultText}</p>
                    
                    ${findings.length > 0 ? `<h3>Analyse-Details:</h3><ul>${findings.join('')}</ul>` : ""}
                    
                    ${keywordsHtml}
                    
                    <div style="margin-top:25px; padding-top:15px; border-top:1px solid #eee; font-size:0.9em; color:#666;">
                        <strong>Sicherer nächster Schritt:</strong> Öffnen Sie die Website/App des Anbieters selbst (Adresse eintippen) oder rufen Sie über eine offizielle, selbst recherchierte Nummer an – niemals über Kontakte aus der Nachricht.
                    </div>
                </div>
            </div>
        `;

        resultArea.innerHTML = html;
        resultArea.scrollIntoView({ behavior: "smooth" });
    });

    btnReset.addEventListener("click", () => {
        textField.value = "";
        checkLink.checked = false;
        checkSender.checked = false;
        checkAttachment.checked = false;
        resultArea.innerHTML = "";
    });
});
