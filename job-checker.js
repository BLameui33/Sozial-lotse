// job-checker.js
// Logik zur Erkennung von Geldwäsche-Fallen und unseriösen Jobangeboten

document.addEventListener("DOMContentLoaded", () => {
    const btnCheck = document.getElementById("btn_check_job");
    const btnReset = document.getElementById("btn_reset_job");
    const resultArea = document.getElementById("job_result_area");

    btnCheck.addEventListener("click", () => {
        // Eingaben sammeln
        const task = document.querySelector('input[name="task"]:checked')?.value;
        const account = document.querySelector('input[name="account"]:checked')?.value;
        const interview = document.querySelector('input[name="interview"]:checked')?.value;
        const ident = document.querySelector('input[name="ident"]:checked')?.value;
        const pay = document.querySelector('input[name="pay"]:checked')?.value;

        // Validierung: Alles ausgefüllt?
        if (!task || !account || !interview || !ident || !pay) {
            resultArea.innerHTML = `
                <div class="warning-box" style="background:#fff3cd; color:#856404; padding:15px; border-radius:4px; margin-top:20px;">
                    Bitte beantworten Sie alle 5 Fragen, damit eine Risiko-Einschätzung möglich ist.
                </div>
            `;
            return;
        }

        let riskLevel = "green"; // green, yellow, red
        let headline = "";
        let details = [];
        let advice = "";
        let bgColor = "";
        let textColor = "";

        // --- LOGIK PRÜFUNG ---

        // 1. KO-Kriterien für GELDWÄSCHE (Rot)
        if (task === "money" || task === "testing") {
            riskLevel = "red";
            details.push("<strong>Sehr hohes Risiko:</strong> Wenn Sie Geld empfangen/weiterleiten sollen oder „Bankkonten/App-Tests“ durchführen sollen, ist das ein typisches Muster von Betrugs- und Geldwäsche-Maschen. Das kann strafrechtliche Folgen haben (z.B. Geldwäsche).");
        }
        if (task === "packages") {
            riskLevel = "red";
            details.push("<strong>Warenagent / Paketweiterleitung:</strong> Pakete weiterzuleiten ist ein häufiges Betrugsmuster. Ihre Adresse kann als Empfänger auftauchen und Sie geraten dadurch leicht in Ermittlungen oder in Rückforderungsansprüche.");
        }
        if (account === "private" || account === "new") {
            riskLevel = "red";
            details.push("<strong>Konto-Warnsignal:</strong> Wenn Firmengelder über Ihr privates Konto laufen sollen oder Sie ein neues Konto auf Ihren Namen eröffnen sollen, ist das ein starkes Warnsignal für Missbrauch (z.B. Geldwäsche/Identitätsmissbrauch).");
        }
        if (ident === "yes_account") {
            riskLevel = "red";
            details.push("<strong>Identitäts-/Konto-Missbrauch:</strong> Wenn Video-Ident „zum Test“ verlangt wird, kann dahinter die Eröffnung echter Konten/Verträge auf Ihren Namen stecken. Behörden warnen vor solchen „App-Tester“-Maschen.");
        }

        // 2. Warnsignale (Gelb), falls noch nicht Rot
        if (riskLevel !== "red") {
            if (interview === "chat") {
                riskLevel = "yellow";
                details.push("<strong>Warnsignal (Kontakt nur per Chat):</strong> Reine WhatsApp/Telegram/E-Mail-Kommunikation ohne nachvollziehbaren Ansprechpartner ist häufig unseriös. Seriöse Arbeitgeber führen normalerweise ein echtes Gespräch (vor Ort oder Video-Call).");
            }
            if (pay === "high") {
                riskLevel = riskLevel === "yellow" ? "red" : "yellow"; // Wenn schon Gelb, dann Rot, sonst Gelb
                details.push("<strong>Warnsignal (unrealistisch hohe Bezahlung):</strong> Sehr hohe Vergütung für einfache Aufgaben ist ein typischer Köder. Zusammen mit anderen Auffälligkeiten steigt das Risiko deutlich.");
            }
        }

        // --- ERGEBNIS TEXTE ---

        if (riskLevel === "red") {
            headline = "Stopp: sehr hohes Risiko (Betrug / Geldwäsche-Verdacht)";
            bgColor = "#fadbd8";
            textColor = "#c0392b";
            advice = `
                <p style="font-weight:bold;">Jetzt konsequent handeln:</p>
                <ul>
                    <li>Kontakt sofort abbrechen und keine weiteren Daten senden.</li>
                    <li>Nichts unterschreiben, kein Geld weiterleiten, keine Pakete weiterleiten.</li>
                    <li>Beweise sichern (Chatverläufe, E-Mails, Anzeige, Zahlungsdaten, Namen/Nummern, Screenshots).</li>
                    <li>Wenn bereits Kontodaten/Video-Ident genutzt wurden oder Geld floss: umgehend Bank informieren und Anzeige bei der Polizei erstatten.</li>
                </ul>
                <p style="margin-top:10px; font-size:0.95em; color:#555;">
                    Hinweis: Diese Einschätzung ist automatisiert und ersetzt keine Rechtsberatung.
                </p>
            `;
        } else if (riskLevel === "yellow") {
            headline = "Vorsicht: Auffälligkeiten / mögliche Unseriosität";
            bgColor = "#fdebd0";
            textColor = "#d35400";
            advice = `
                <p>Es gibt Warnsignale. Prüfen Sie das Angebot gründlich, bevor Sie Daten oder Dokumente herausgeben.</p>
                <ul>
                    <li>Firma prüfen (Impressum/Website, Handelsregister, echte Adresse) und nur über offiziell auffindbare Kontaktdaten zurückrufen.</li>
                    <li>Keine Ausweiskopie/Video-Ident/IBAN herausgeben, solange die Seriosität nicht verifiziert ist.</li>
                    <li>Bei Druck („sofort zusagen“, „geheim halten“) lieber abbrechen.</li>
                </ul>
                <p style="margin-top:10px; font-size:0.95em; color:#555;">
                    Hinweis: Auch bei „Gelb“ kann Betrug vorliegen – im Zweifel lieber nicht mitmachen.
                </p>
            `;
        } else {
            headline = "Derzeit keine starken Warnsignale – trotzdem prüfen";
            bgColor = "#d5f5e3";
            textColor = "#27ae60";
            advice = `
                <p>Nach Ihren Angaben gibt es aktuell keine typischen Hochrisiko-Merkmale.</p>
                <p>Bleiben Sie dennoch aufmerksam: Sobald Sie aufgefordert werden, Geld/Transaktionen über Ihr Konto abzuwickeln, Konten „zu testen“ oder Pakete weiterzuleiten, sollten Sie abbrechen und das Angebot neu bewerten.</p>
                <p style="margin-top:10px; font-size:0.95em; color:#555;">
                    Hinweis: Diese Einschätzung ist eine Orientierungshilfe und keine Garantie.
                </p>
            `;
        }

        // HTML Output bauen
        const resultHTML = `
            <div class="result-card" style="margin-top:30px; border: 2px solid ${textColor}; border-radius: 8px; overflow: hidden; background: #fff;">
                <div style="background:${bgColor}; color:${textColor}; padding:20px; text-align:center;">
                    <div style="font-size:3rem;">${riskLevel === "red" ? "" : (riskLevel === "yellow" ? "⚠️" : "✅")}</div>
                    <h2 style="margin:10px 0 0 0; color:${textColor};">${headline}</h2>
                    <p style="margin:8px 0 0 0; font-size:0.95em; opacity:0.9;">
                        Automatisierte Risiko-Einschätzung anhand Ihrer Antworten (keine Garantie).
                    </p>
                </div>
                <div style="padding:20px;">
                    <ul style="margin-bottom:20px;">
                        ${details.length > 0 ? details.map(d => `<li style="margin-bottom:10px;">${d}</li>`).join('') : "<li>Die formalen Kriterien wirken anhand Ihrer Angaben unauffällig.</li>"}
                    </ul>
                    <div style="border-top:1px solid #eee; padding-top:15px;">
                        <h3>Empfehlung:</h3>
                        ${advice}
                    </div>
                </div>
            </div>
        `;

        resultArea.innerHTML = resultHTML;
        resultArea.scrollIntoView({ behavior: "smooth" });
    });

    btnReset.addEventListener("click", () => {
        resultArea.innerHTML = "";
    });
});
