// offline-checker.js
// Analyse von Betrugsversuchen an Haustür, Telefon und per Nachricht

document.addEventListener("DOMContentLoaded", function() {
    var btnCheck = document.getElementById("btn_check_offline");
    var btnReset = document.getElementById("btn_reset_offline");
    var resultArea = document.getElementById("offline_result_area");

    // SVG-Icons (einzeilig, damit Linter sauber bleiben)
    var iconRed = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    var iconYellow = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    var iconGreen = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    var iconPhone = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>';

    var icons = {
        red: iconRed,
        yellow: iconYellow,
        green: iconGreen
    };

    btnCheck.addEventListener("click", function() {
        var placeEl = document.querySelector('input[name="place"]:checked');
        var whoEl = document.querySelector('input[name="who"]:checked');
        var actionEl = document.querySelector('input[name="action"]:checked');
        var pressureEl = document.querySelector('input[name="pressure"]:checked');
        var legitEl = document.querySelector('input[name="legit"]:checked');
        var initiatedEl = document.querySelector('input[name="initiated"]:checked');

        var place = placeEl ? placeEl.value : null;
        var who = whoEl ? whoEl.value : null;
        var action = actionEl ? actionEl.value : null;
        var pressure = pressureEl ? pressureEl.value : null;
        var legit = legitEl ? legitEl.value : null;
        var initiated = initiatedEl ? initiatedEl.value : null;

        // Validierung
        if (!place || !who || !action || !pressure || !legit || !initiated) {
            resultArea.innerHTML =
                '<div class="warning-box">' +
                    '<strong>Unvollstaendige Angaben:</strong> Bitte beantworten Sie alle 6 Fragen, damit eine Risiko-Einschaetzung moeglich ist.' +
                '</div>';
            resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        var riskLevel = "green";
        var headline = "";
        var scamType = "";
        var details = [];
        var advice = "";
        var showEmergency = false;

        // ====== HAUPTERKENNUNGSLOGIK ======

        // --- 1. ENKELTRICK / SCHOCKANRUF (Polizei, Unfall, Gefaengnis) ---
        if (place === "phone" && who === "family" && (action === "money_now" || action === "transfer") && (pressure === "panic" || pressure === "emotional")) {
            riskLevel = "red";
            scamType = "Enkeltrick / Schockanruf";
            details.push('<strong>Typisches Muster:</strong> Ein vermeintlicher Verwandter in Not fordert unter grossem emotionalem Druck Bargeld, Schmuck oder eine Ueberweisung.');
            details.push('<strong>Neue Variante:</strong> Oft wird per WhatsApp mit "neuer Nummer" kontaktiert ("Hallo Mama/Papa, mein Handy ist kaputt, das ist meine neue Nummer").');
            details.push('<strong>Polizei warnt:</strong> Niemals Geld an unbekannte Boten uebergeben. Die Polizei holt niemals Bargeld oder Wertsachen ab.');
            showEmergency = true;

        // --- 2. FALSCHE POLIZEI / STAATSANWALTSCHAFT ---
        } else if (who === "authority" && (action === "money_now" || action === "transfer" || action === "data") && (pressure === "panic" || pressure === "secret")) {
            riskLevel = "red";
            scamType = "Falsche Polizeibeamte / Behoerde";
            details.push('<strong>Typisches Muster:</strong> Anrufer geben sich als Polizisten, Staatsanwaelte oder Bankmitarbeiter aus. Oft wird behauptet, das eigene Konto sei kompromittiert oder Angehoerige seien in einen Unfall verwickelt.');
            details.push('<strong>Call-ID-Spoofing:</strong> Auch wenn im Display "110" oder die lokale Polizeinummer steht, ist der Anruf fast immer gefaelscht. Die echte Polizei ruft nie unter 110 an.');
            details.push('<strong>Warnsignal:</strong> Forderungen nach Uebergabe von Bargeld, Gold oder Gutscheinkarten sind ein sicheres Betrugsmuster.');
            showEmergency = true;

        // --- 3. HAUSTUER-HANDWERKER / DACHHAIE ---
        } else if (place === "door" && who === "craftsman" && initiated === "cold" && (action === "money_now" || action === "contract") && pressure !== "normal") {
            riskLevel = "red";
            scamType = "Unserioese Handwerker / Dachhaie";
            details.push('<strong>Typisches Muster:</strong> Unangekuendigte "Sofort-Angebote" an der Haustuer, oft mit angeblich guenstigen Restposten oder dringenden Schaeden (Dach, Terrasse, Steinreinigung).');
            details.push('<strong>Warnsignal:</strong> Drang zur schnellen Unterschrift, sofortige Barzahlung oder ueberhoehte Rechnungen nach Arbeitsbeginn.');
            details.push('<strong>Vorsicht:</strong> Manche Banden arbeiten aggressiv und setzen Betroffene unter Druck. Im Zweifel immer 110 waehlen.');
            showEmergency = true;

        // --- 4. EINSCHLEICHDIEBSTAHL / FALSCHE WASSERWERKER ---
        } else if (place === "door" && action === "entrance" && initiated === "cold") {
            riskLevel = "red";
            scamType = "Verdacht auf Einschleichdiebstahl";
            details.push('<strong>Typisches Muster:</strong> Vorwaende wie "Rohrbruch", "Wasserdruck pruefen", "Zaehler ablesen" oder "Einbruchschutz" werden genutzt, um Zutritt zur Wohnung zu erhalten.');
            details.push('<strong>Hauefige Taktik:</strong> Oft arbeiten zwei Personen zusammen - eine lenkt ab, waehrend die andere Wertsachen stiehlt.');
            details.push('<strong>Wichtig:</strong> Echte Versorger kuendigen sich vorher schriftlich an und zeigen einen gut sichtbaren Dienstausweis.');

        // --- 5. GEWINNSPIEL-BETRUG ---
        } else if (who === "win" && (action === "transfer" || action === "money_now" || action === "data")) {
            riskLevel = "red";
            scamType = "Gewinnspiel-Betrug";
            details.push('<strong>Typisches Muster:</strong> Angebliche Gewinne, die erst nach Zahlung einer "Gebuehr", "Steuer" oder "Freischaltung" ausgezahlt werden sollen.');
            details.push('<strong>Klassischer Koder:</strong> Forderungen nach Gutscheinkarten (Amazon, Google Play, Paysafe, Steam, iTunes) sind ein sicheres Betrugsmuster - echte Gewinne werden nie so abgewickelt.');
            details.push('<strong>Grundregel:</strong> Wer etwas gewinnt, muss nie vorab zahlen.');

        // --- 6. HAUSTUERGESCHAEFTE / ZEITSCHRIFTEN / KAFFEEFAHRTEN ---
        } else if (place === "door" && who === "charity" && action === "contract" && pressure !== "normal") {
            riskLevel = "yellow";
            scamType = "Ueberfallartiges Haustuergeschaeft";
            details.push('<strong>Typisches Muster:</strong> Unerwartete Verkaeufe an der Haustuer - Zeitschriftenabos, Spenden, Stromvertraege oder "gute Zwecke".');
            details.push('<strong>Warnsignal:</strong> Wenn Sie unter Druck gesetzt werden, sofort zu unterschreiben, oder die Person nicht gehen will.');
            details.push('<strong>Rechtlicher Hinweis:</strong> Bei Haustuergeschaefen gibt es grundsaetzlich ein 14-taegiges Widerrufsrecht - aber unterschreiben Sie trotzdem nichts ungeprueft.');

        // --- 7. PHISHING / NACHRICHT MIT LINK ---
        } else if (place === "message" && (action === "data" || action === "transfer")) {
            riskLevel = "red";
            scamType = "Phishing / Smishing";
            details.push('<strong>Typisches Muster:</strong> SMS, WhatsApp oder E-Mail mit einem Link, der angeblich von der Bank, Post, DHL oder einem Paketdienst stammt.');
            details.push('<strong>Warnsignal:</strong> Dringende Aufforderungen, Daten einzugeben oder Zahlungen zu taetigen - oft mit Drohungen ("Konto gesperrt", "Paket nicht zustellbar").');
            details.push('<strong>Regel:</strong> Niemals auf Links in unerwarteten Nachrichten klicken. Bank-Apps oder offizielle Websites direkt oeffnen.');

        // --- 8. GENERELLE DRUCK-SITUATIONEN (Catch-all) ---
        } else if (pressure === "panic" || pressure === "secret" || pressure === "emotional") {
            riskLevel = "yellow";
            scamType = "Verdacht auf Manipulation";
            details.push('<strong>Warnsignal:</strong> Zeitdruck ("sofort"), Geheimhaltung ("niemandem sagen") oder emotionale Appelle sind klassische Manipulationstaktiken.');
            details.push('<strong>Faustregel:</strong> Serioese Stellen geben Ihnen immer Zeit zur Pruefung. Wer Druck aufbaut, hat meist etwas zu verbergen.');
            details.push('<strong>Empfehlung:</strong> Gespraech unterbrechen, Vertrauensperson hinzuziehen und erst spaeter ueber eine selbst recherchierte Nummer zurueckrufen.');

        // --- 9. SPOOFED NUMBER (Zusaetzliches Warnsignal) ---
        } else if (legit === "spoofed" && place === "phone") {
            riskLevel = "yellow";
            scamType = "Verdacht auf Rufnummern-Spoofing";
            details.push('<strong>Warnsignal:</strong> Auch wenn die "110" oder eine offizielle Nummer im Display steht, kann der Anruf gefaelscht sein (Call-ID-Spoofing).');
            details.push('<strong>Wichtig:</strong> Die echte Polizei ruft nie unter der 110 an. Legen Sie auf und waehlen Sie selbst die 110 oder eine bekannte Durchwahl.');

        // --- 10. UNBEKANNTE NUMMER ZUM RUECKRUF ---
        } else if (legit === "callback") {
            riskLevel = "yellow";
            scamType = "Verdacht auf falsche Legitimation";
            details.push('<strong>Warnsignal:</strong> Die Person gibt eine Nummer zum Rueckruf vor, statt dass Sie die Nummer selbst recherchieren.');
            details.push('<strong>Empfehlung:</strong> Legen Sie auf und rufen Sie ueber eine selbst gesuchte Nummer aus dem Telefonbuch oder von der offiziellen Website zurueck.');

        // --- 11. GELB: Allgemeine Unsicherheiten ---
        } else if (initiated === "cold" && (action === "money_now" || action === "transfer" || action === "data" || action === "contract")) {
            riskLevel = "yellow";
            scamType = "Unerwarteter Kontakt mit Forderung";
            details.push('<strong>Warnsignal:</strong> Ein unerwarteter Kontakt fordert Geld, Daten oder eine Unterschrift. Das ist immer ein Grund zur Vorsicht.');
            details.push('<strong>Empfehlung:</strong> Nichts ueberstuertzen. Kontakt abbrechen und die Situation mit einer Vertrauensperson besprechen.');

        // --- 12. GRUEN: Kein klares Muster ---
        } else {
            riskLevel = "green";
            scamType = "Kein klares Betrugsmuster";
            details.push('Anhand Ihrer Angaben ist derzeit kein typisches Betrugsmuster erkennbar.');
            details.push('Dennoch bleiben Sie wachsam: Serioese Stellen akzeptieren ein "Nein" und haben kein Problem damit, wenn Sie spaeter ueber eine offizielle Nummer zurueckrufen.');
        }

        // ====== ERGEBNIS-TEXTE ======

        if (riskLevel === "red") {
            headline = "Hohes Risiko - starke Warnsignale";
            advice =
                '<div class="advice_block">' +
                    '<h3>Jetzt konsequent handeln</h3>' +
                    '<ul>' +
                        '<li>Kontakt sofort abbrechen (auflegen, Tuer schliessen, Nachricht ignorieren).</li>' +
                        '<li>Niemals Geld uebergeben, nichts unterschreiben, keine Daten herausgeben.</li>' +
                        '<li>Bei bereits erfolgter Uebergabe/Zahlung: umgehend Polizei (110) und Bank informieren.</li>' +
                        '<li>Rufnummer, Namen und Zeitpunkt des Kontakts notieren.</li>' +
                        '<li>Angehoerige und Vertrauenspersonen informieren - Taeter arbeiten oft gezielt mit Aelteren.</li>' +
                    '</ul>' +
                    '<p class="result_disclaimer">Diese Einschaetzung ist automatisiert und ersetzt keine Beratung. Im Zweifel immer die Polizei kontaktieren.</p>' +
                '</div>';

        } else if (riskLevel === "yellow") {
            headline = "Vorsicht - Auffaelligkeiten erkannt";
            advice =
                '<div class="advice_block">' +
                    '<h3>Bevor Sie Entscheidungen treffen</h3>' +
                    '<ul>' +
                        '<li>Kontakt unterbrechen - Sie muessen sich nicht erklaeren oder rechtfertigen.</li>' +
                        '<li>Vertrauensperson (Familie, Nachbarn) hinzuziehen oder anrufen.</li>' +
                        '<li>Nur ueber selbst recherchierte Nummern zurueckrufen (Telefonbuch, offizielle Website).</li>' +
                        '<li>Nichts an der Haustuer unterschreiben und keine fremden Personen in die Wohnung lassen.</li>' +
                        '<li>Bei anhaltendem Druck oder Bedrohung: 110 waehlen.</li>' +
                    '</ul>' +
                    '<p class="result_disclaimer">Auch bei dieser Einstufung kann Betrug vorliegen. Im Zweifel lieber einmal zu oft nachfragen.</p>' +
                '</div>';

        } else {
            headline = "Kein klares Betrugsmuster erkennbar";
            advice =
                '<div class="advice_block">' +
                    '<h3>Trotzdem aufmerksam bleiben</h3>' +
                    '<ul>' +
                        '<li>Keine Fremden ohne Termin und Pruefung in die Wohnung lassen.</li>' +
                        '<li>Am Telefon keine sensiblen Daten und keine Infos zu Geld oder Wertsachen preisgeben.</li>' +
                        '<li>Nichts an der Haustuer unterschreiben - immer Bedenkzeit verlangen.</li>' +
                        '<li>Bei unerwarteten Anrufen grundsaetzlich skeptisch sein und bei Zweifeln auflegen.</li>' +
                    '</ul>' +
                    '<p><strong>Faustregel:</strong> Serioese Stellen haben kein Problem damit, wenn Sie sich Zeit nehmen und spaeter ueber eine offizielle Nummer zurueckrufen.</p>' +
                    '<p class="result_disclaimer">Diese Einschaetzung ist eine Orientierungshilfe und keine Garantie.</p>' +
                '</div>';
        }

        // ====== HTML AUFBAUEN ======

        var detailsHTML = '';
        for (var i = 0; i < details.length; i++) {
            detailsHTML += '<li>' + details[i] + '</li>';
        }

        var emergencyHTML = '';
        if (showEmergency || riskLevel === "red") {
            emergencyHTML =
                '<div style="text-align:center; margin-top:24px; padding-top:20px; border-top:1px solid #e8ecf0;">' +
                    '<a href="tel:110" class="emergency_link">' +
                        iconPhone +
                        '<span>Im Notfall: Polizei 110 waehlen</span>' +
                    '</a>' +
                '</div>';
        }

        var scamTypeLine = '';
        if (scamType && riskLevel !== "green") {
            scamTypeLine = '<p class="result_subtitle"><strong>Verdacht auf:</strong> ' + scamType + '</p>';
        } else {
            scamTypeLine = '<p class="result_subtitle">Automatisierte Risiko-Einschaetzung anhand Ihrer Angaben</p>';
        }

        var resultHTML =
            '<article class="result_card risk_' + riskLevel + '">' +
                '<header class="result_header">' +
                    icons[riskLevel] +
                    '<h2>' + headline + '</h2>' +
                    scamTypeLine +
                '</header>' +
                '<div class="result_body">' +
                    '<h3>Analyse Ihrer Angaben</h3>' +
                    '<ul>' + detailsHTML + '</ul>' +
                    advice +
                    emergencyHTML +
                '</div>' +
            '</article>';

        resultArea.innerHTML = resultHTML;
        resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    btnReset.addEventListener("click", function() {
        resultArea.innerHTML = "";
    });
});