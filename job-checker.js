// job-checker.js
// Logik zur Erkennung von Geldwäsche-Fallen und unseriösen Jobangeboten

document.addEventListener("DOMContentLoaded", function() {
    const btnCheck = document.getElementById("btn_check_job");
    const btnReset = document.getElementById("btn_reset_job");
    const resultArea = document.getElementById("job_result_area");

    // SVG-Icons als einfache einzeilige Strings
    const iconRed = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    const iconYellow = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    const iconGreen = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';

    const icons = {
        red: iconRed,
        yellow: iconYellow,
        green: iconGreen
    };

    btnCheck.addEventListener("click", function() {
        // Eingaben sammeln (ohne Optional Chaining, funktioniert in allen Umgebungen)
        var taskEl = document.querySelector('input[name="task"]:checked');
        var accountEl = document.querySelector('input[name="account"]:checked');
        var interviewEl = document.querySelector('input[name="interview"]:checked');
        var identEl = document.querySelector('input[name="ident"]:checked');
        var payEl = document.querySelector('input[name="pay"]:checked');

        var task = taskEl ? taskEl.value : null;
        var account = accountEl ? accountEl.value : null;
        var interview = interviewEl ? interviewEl.value : null;
        var ident = identEl ? identEl.value : null;
        var pay = payEl ? payEl.value : null;

        // Validierung
        if (!task || !account || !interview || !ident || !pay) {
            resultArea.innerHTML =
                '<div class="warning-box">' +
                    '<strong>Unvollständige Angaben:</strong> Bitte beantworten Sie alle 5 Fragen, damit eine Risiko-Einschätzung möglich ist.' +
                '</div>';
            resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        var riskLevel = "green";
        var headline = "";
        var details = [];
        var advice = "";

        // --- KO-Kriterien fuer GELDWAESCHE (Rot) ---
        if (task === "money" || task === "testing") {
            riskLevel = "red";
            details.push(
                '<strong>Sehr hohes Risiko:</strong> Wenn Sie Geld empfangen und weiterleiten sollen ' +
                'oder Bankkonten/App-Tests durchfuehren, ist das ein typisches Muster von Betrugs- ' +
                'und Geldwaesche-Maschen. Das kann strafrechtliche Folgen haben.'
            );
        }

        if (task === "packages") {
            riskLevel = "red";
            details.push(
                '<strong>Warenagent / Paketweiterleitung:</strong> Pakete weiterzuleiten ist ein ' +
                'haeufiges Betrugsmuster. Ihre Adresse kann als Empfaenger auftauchen und Sie geraten ' +
                'dadurch leicht in Ermittlungen oder Rueckforderungsansprueche.'
            );
        }

        if (account === "private" || account === "new") {
            riskLevel = "red";
            details.push(
                '<strong>Konto-Warnsignal:</strong> Wenn Firmengelder ueber Ihr privates Konto laufen ' +
                'sollen oder Sie ein neues Konto auf Ihren Namen eroeffnen sollen, ist das ein starkes ' +
                'Warnsignal fuer Missbrauch.'
            );
        }

        if (ident === "yes_account") {
            riskLevel = "red";
            details.push(
                '<strong>Identitaets-/Konto-Missbrauch:</strong> Wenn Video-Ident zum Test verlangt ' +
                'wird, kann dahinter die Eroeffnung echter Konten oder Vertraege auf Ihren Namen ' +
                'stecken. Behoerden warnen vor solchen App-Tester-Maschen.'
            );
        }

        // --- Warnsignale (Gelb) ---
        if (riskLevel !== "red") {
            if (interview === "chat") {
                riskLevel = "yellow";
                details.push(
                    '<strong>Kontakt nur per Chat:</strong> Reine WhatsApp/Telegram/E-Mail-Kommunikation ' +
                    'ohne nachvollziehbaren Ansprechpartner ist haeufig unserioes. Serioese Arbeitgeber ' +
                    'fuehren normalerweise ein echtes Gespraech - vor Ort oder per Video-Call.'
                );
            }

            if (pay === "high") {
                if (riskLevel === "yellow") {
                    riskLevel = "red";
                } else {
                    riskLevel = "yellow";
                }
                details.push(
                    '<strong>Unrealistisch hohe Bezahlung:</strong> Sehr hohe Verguetung fuer einfache ' +
                    'Aufgaben ist ein typischer Koeder. Zusammen mit anderen Auffaelligkeiten steigt ' +
                    'das Risiko deutlich.'
                );
            }
        }

        // --- Ergebnis-Texte ---
        if (riskLevel === "red") {
            headline = "Stopp - sehr hohes Risiko";
            advice =
                '<div class="advice_block">' +
                    '<h3>Jetzt konsequent handeln</h3>' +
                    '<ul>' +
                        '<li>Kontakt sofort abbrechen und keine weiteren Daten senden.</li>' +
                        '<li>Nichts unterschreiben, kein Geld und keine Pakete weiterleiten.</li>' +
                        '<li>Beweise sichern: Chatverlaeufe, E-Mails, Zahlungsdaten, Namen, Screenshots.</li>' +
                        '<li>Bei bereits genutzten Kontodaten oder Video-Ident: umgehend Bank informieren und Anzeige bei der Polizei erstatten.</li>' +
                    '</ul>' +
                    '<p class="result_disclaimer">Diese Einschaetzung ist automatisiert und ersetzt keine Rechtsberatung.</p>' +
                '</div>';

        } else if (riskLevel === "yellow") {
            headline = "Vorsicht - Auffaelligkeiten erkannt";
            advice =
                '<div class="advice_block">' +
                    '<h3>Bevor Sie Daten herausgeben</h3>' +
                    '<ul>' +
                        '<li>Firma pruefen: Impressum, Website, Handelsregister, echte Adresse. Nur ueber offiziell auffindbare Kontaktdaten zurueckrufen.</li>' +
                        '<li>Keine Ausweiskopie, kein Video-Ident und keine IBAN herausgeben, solange die Seriositaet nicht verifiziert ist.</li>' +
                        '<li>Bei Druck (sofort zusagen, geheim halten) lieber abbrechen.</li>' +
                    '</ul>' +
                    '<p class="result_disclaimer">Auch bei dieser Einstufung kann Betrug vorliegen - im Zweifel lieber nicht mitmachen.</p>' +
                '</div>';

        } else {
            headline = "Keine starken Warnsignale";
            advice =
                '<div class="advice_block">' +
                    '<h3>Trotzdem aufmerksam bleiben</h3>' +
                    '<p>Nach Ihren Angaben gibt es aktuell keine typischen Hochrisiko-Merkmale. Bleiben Sie dennoch aufmerksam.</p>' +
                    '<p>Sobald Sie aufgefordert werden, Geld ueber Ihr Konto abzuwickeln, Konten zu testen oder Pakete weiterzuleiten, sollten Sie abbrechen und das Angebot neu bewerten.</p>' +
                    '<p class="result_disclaimer">Diese Einschaetzung ist eine Orientierungshilfe und keine Garantie.</p>' +
                '</div>';
        }

        // Details-Liste aufbauen
        var detailsHTML = '';
        if (details.length > 0) {
            for (var i = 0; i < details.length; i++) {
                detailsHTML += '<li>' + details[i] + '</li>';
            }
        } else {
            detailsHTML = '<li>Die formalen Kriterien wirken anhand Ihrer Angaben unauffaellig.</li>';
        }

        // Ergebnis-HTML zusammenbauen
        var resultHTML =
            '<article class="result_card risk_' + riskLevel + '">' +
                '<header class="result_header">' +
                    icons[riskLevel] +
                    '<h2>' + headline + '</h2>' +
                    '<p class="result_subtitle">Automatisierte Risiko-Einschaetzung anhand Ihrer Antworten</p>' +
                '</header>' +
                '<div class="result_body">' +
                    '<h3>Auffaelligkeiten in Ihren Angaben</h3>' +
                    '<ul>' + detailsHTML + '</ul>' +
                    advice +
                '</div>' +
            '</article>';

        resultArea.innerHTML = resultHTML;
        resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    btnReset.addEventListener("click", function() {
        resultArea.innerHTML = "";
    });
});