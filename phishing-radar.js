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

    // Datenbank der Signalwörter
    const patterns = {
        urgency: {
            label: "Druck & Panikmache",
            words: [
                "sofort", "dringend", "umgehend", "unverzüglich",
                "gesperrt", "eingeschränkt", "blockiert",
                "letzte warnung", "letzte erinnerung",
                "innerhalb von 24 stunden", "innerhalb von 48 stunden",
                "frist abgelaufen", "frist läuft ab",
                "sicherheitsmaßnahme", "sicherheitsüberprüfung",
                "unautorisierter zugriff", "verdächtige aktivität",
                "identität bestätigen", "konto deaktiviert",
                "handlungsbedarf", "aktion erforderlich",
                "reaktion erforderlich"
            ]
        },
        money: {
            label: "Geld & Finanzen",
            words: [
                "gewonnen", "gewinnbenachrichtigung",
                "erbschaft", "millionen", "lotterie",
                "auszahlung", "überweisen", "überweisung",
                "bitcoin", "krypto", "wallet",
                "schnell geld", "investition",
                "guthaben", "kontostand",
                "rückerstattung", "steuererstattung",
                "fällige zahlung", "offene rechnung",
                "zahlung fehlgeschlagen",
                "abbuchung", "belastung",
                "mahnung"
            ]
        },
        action: {
            label: "Aufforderung zum Klick / zur Dateneingabe",
            words: [
                "hier klicken", "jetzt klicken",
                "link folgen", "weiter zum login",
                "anhang öffnen", "rechnung öffnen",
                "daten aktualisieren", "daten überprüfen",
                "passwort ändern", "zugang erneuern",
                "tan eingeben", "pin eingeben",
                "login bestätigen", "anmeldung bestätigen",
                "formular ausfüllen",
                "verifizierung abschließen",
                "konto wiederherstellen"
            ]
        },
        impersonation: {
            label: "Vorgeblicher bekannter Anbieter",
            words: [
                "paypal", "amazon", "ebay",
                "dhl", "hermes", "ups",
                "post", "paket", "sendung",
                "sparkasse", "volksbank",
                "ing", "comdirect",
                "apple", "icloud", "microsoft",
                "netflix", "spotify"
            ]
        },
        technical: {
            label: "Formale Auffälligkeiten",
            words: [
                "klicken sie auf den untenstehenden link",
                "umgehend ausführen",
                "aus sicherheitsgründen",
                "wir konnten ihre daten nicht verifizieren",
                "ihr konto wurde eingeschränkt",
                "bitte antworten sie nicht auf diese e-mail"
            ]
        },
        psychology: {
            label: "Psychologischer Druck",
            words: [
                "zu ihrem schutz",
                "um schäden zu vermeiden",
                "um betrug zu verhindern",
                "wir sind besorgt",
                "verdächtiges verhalten festgestellt",
                "zu ihrer sicherheit"
            ]
        },
        salutation: {
            label: "Unpersönliche Ansprache",
            words: [
                "lieber kunde", "sehr geehrter kunde",
                "lieber nutzer", "sehr geehrter nutzer",
                "sehr geehrte damen und herren",
                "werte kunden",
                "hallo lieber kunde",
                "guten tag"
            ]
        }
    };

    btnAnalyze.addEventListener("click", () => {
        resultArea.innerHTML = "";
        const text = textField.value.toLowerCase();

        if (text.length < 10 && !checkLink.checked && !checkSender.checked && !checkAttachment.checked) {
            resultArea.innerHTML = `
                <div class="warning-box" style="background:#fff3cd; color:#856404; padding:15px; border-radius:4px; margin-top:20px;">
                    <strong>Bitte geben Sie etwas Text ein</strong> oder wählen Sie mindestens ein Merkmal (Checkboxen) aus.
                </div>`;
            return;
        }

        let score = 0;
        let findings = [];
        let foundKeywords = [];

        // 1. Textanalyse
        for (const data of Object.values(patterns)) {
            let catMatches = [];
            data.words.forEach(word => {
                if (text.includes(word)) {
                    catMatches.push(word);
                    foundKeywords.push(word);
                }
            });

            if (catMatches.length > 0) {
                score += catMatches.length * 15;
                findings.push(
                    `<li><strong>${data.label}:</strong> Gefunden wurden z.B. <em>"${catMatches.join('", "')}"</em>.</li>`
                );
            }
        }

        // 1b. Kombinationslogik (NEU)
        const hasUrgency = foundKeywords.some(w =>
            ["sofort", "dringend", "umgehend", "letzte warnung"].includes(w)
        );

        const hasAction = foundKeywords.some(w =>
            ["hier klicken", "jetzt klicken", "link folgen", "login bestätigen"].includes(w)
        );

        const hasBrand = foundKeywords.some(w =>
            ["paypal", "amazon", "dhl", "sparkasse", "netflix", "apple"].includes(w)
        );

        const hasMoney = foundKeywords.some(w =>
            ["zahlung", "rechnung", "guthaben", "kontostand"].includes(w)
        );

        const hasPsychology = foundKeywords.some(w =>
            ["zu ihrer sicherheit", "zu ihrem schutz", "wir sind besorgt"].includes(w)
        );

        if (hasUrgency && hasAction) {
            score += 20;
            findings.push("<li><strong>Kritische Kombination:</strong> Zeitdruck + Klickaufforderung.</li>");
        }

        if (hasBrand && hasAction) {
            score += 25;
            findings.push("<li><strong>Vortäuschung eines bekannten Anbieters:</strong> In Kombination mit Klickaufforderung.</li>");
        }

        if (hasMoney && checkAttachment.checked) {
            score += 25;
            findings.push("<li><strong>Finanzthema + Anhang:</strong> Häufige Malware-Taktik.</li>");
        }

        if (hasPsychology && hasUrgency) {
            score += 15;
            findings.push("<li><strong>Emotionaler Sicherheitsdruck:</strong> Manipulatives Social Engineering.</li>");
        }

        // Score begrenzen (optional, aber sinnvoll)
        score = Math.min(score, 100);

        // 2. Checkboxen
        if (checkLink.checked) score += 40;
        if (checkSender.checked) score += 35;
        if (checkAttachment.checked) score += 30;

        // 3. Ergebnis
        let resultTitle, resultColor, bgColor, resultIcon, resultText;

        if (score >= 40) {
            resultTitle = "Achtung: hohes Phishing-Risiko";
            resultColor = "#c0392b";
            bgColor = "#fadbd8";
            resultIcon = "";
            resultText = "Mehrere starke Warnsignale erkannt. Nicht reagieren!";
        } else if (score >= 15) {
            resultTitle = "Vorsicht: auffällige Merkmale";
            resultColor = "#d35400";
            bgColor = "#fdebd0";
            resultIcon = "⚠️";
            resultText = "Einige Warnsignale erkannt. Vorgang separat prüfen.";
        } else {
            resultTitle = "Keine eindeutigen Warnsignale gefunden";
            resultColor = "#27ae60";
            bgColor = "#d5f5e3";
            resultIcon = "✅";
            resultText = "Keine typischen Phishing-Muster erkannt (keine Garantie).";
        }

        let keywordsHtml = foundKeywords.length
            ? `<div style="margin-top:10px;"><strong>Gefundene Signalwörter:</strong><br>${foundKeywords.map(k => `<span class="keyword-tag">${k}</span>`).join(" ")}</div>`
            : "";

        resultArea.innerHTML = `
            <div class="result-card" style="margin-top:30px; border:2px solid ${resultColor}; border-radius:8px;">
                <div style="background:${bgColor}; padding:20px; text-align:center;">
                    <div style="font-size:3rem;">${resultIcon}</div>
                    <h2 style="color:${resultColor};">${resultTitle}</h2>
                </div>
                <div style="padding:20px;">
                    <p><strong>${resultText}</strong></p>
                    ${findings.length ? `<ul>${findings.join("")}</ul>` : ""}
                    ${keywordsHtml}
                </div>
            </div>`;
    });

    btnReset.addEventListener("click", () => {
        textField.value = "";
        checkLink.checked = false;
        checkSender.checked = false;
        checkAttachment.checked = false;
        resultArea.innerHTML = "";
    });
});
