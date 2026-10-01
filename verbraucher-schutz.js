// aus-vertrag-rauskommen.js - Master-Tool mit logischer Formular-Struktur

document.addEventListener("DOMContentLoaded", () => {
    const out = document.getElementById("vs_ergebnis");

    // Dynamisches Ein-/Ausblenden der Detail-Bereiche
    const aboSelect = document.getElementById("abo_ja_nein");
    const ratenSelect = document.getElementById("raten_ja_nein");
    const aboDetails = document.getElementById("abo_details");
    const ratenDetails = document.getElementById("raten_details");

    aboSelect.addEventListener("change", () => {
        aboDetails.style.display = aboSelect.value === "ja" ? "block" : "none";
    });

    ratenSelect.addEventListener("change", () => {
        ratenDetails.style.display = ratenSelect.value === "ja" ? "block" : "none";
    });

    // Hauptfunktion: Prüft ALLE Auswege gleichzeitig
    document.getElementById("vs_calc").addEventListener("click", () => {
        out.innerHTML = "";

        const art = document.getElementById("wd_art").value;
        const datumVal = document.getElementById("wd_datum").value;

        if (!datumVal) {
            return showWarn("Bitte Datum des Vertragsschlusses wählen.");
        }

        const start = new Date(datumVal);
        const heute = new Date();
        heute.setHours(0, 0, 0, 0);

        let ergebnisse = [];

        // === 1. WIDERRUFSRECHT PRÜFEN ===
        if (art === "laden") {
            ergebnisse.push({
                typ: "widerruf",
                status: "nicht_moeglich",
                text: "Bei Kauf im Laden gibt es kein gesetzliches Rückgaberecht. Ein Widerruf ist hier nicht möglich.",
                tipp: "Viele Händler bieten Kulanz. Fragen Sie direkt im Geschäft nach Umtauschmöglichkeiten.",
                icon: "store"
            });
        } else {
            const fristEnde = new Date(start);
            fristEnde.setDate(start.getDate() + 14);
            const nochMoeglich = heute <= fristEnde;

            if (nochMoeglich) {
                ergebnisse.push({
                    typ: "widerruf",
                    status: "moeglich",
                    text: `Dein Widerrufsrecht läuft noch bis zum ${fristEnde.toLocaleDateString('de-DE')}.`,
                    tipp: `Widerrufe schriftlich (E-Mail reicht) und fordere eine Bestätigung. Nutze unseren Widerrufsgenerator für ein rechtssicheres Schreiben.`,
                    icon: "check"
                });
            } else {
                ergebnisse.push({
                    typ: "widerruf",
                    status: "frist_abgelaufen",
                    text: `Die 14-Tage-Frist ist am ${fristEnde.toLocaleDateString('de-DE')} abgelaufen.`,
                    tipp: "Prüfe, ob der Anbieter dich ordnungsgemäß über dein Widerrufsrecht belehrt hat. Bei Fehlern verlängert sich das Widerrufsrecht auf bis zu 1 Jahr und 14 Tage. Auch das Abo-Gesetz 2022 kann dir einen Ausweg bieten.",
                    icon: "clock"
                });
            }
        }

        // === 2. ABO-GESETZ 2022 PRÜFEN ===
        const aboJa = document.getElementById("abo_ja_nein").value === "ja";
        if (aboJa) {
            const aboStart = document.getElementById("abo_start").value;
            const aboLaufzeit = parseInt(document.getElementById("abo_laufzeit").value);
            const aboArt = document.getElementById("abo_art").value;

            const aboStartDate = aboStart ? new Date(aboStart) : start;
            let endeMindestlaufzeit = new Date(aboStartDate);
            endeMindestlaufzeit.setMonth(aboStartDate.getMonth() + aboLaufzeit);

            if (heute < endeMindestlaufzeit) {
                ergebnisse.push({
                    typ: "abo",
                    status: "laufzeit",
                    text: `Die Mindestlaufzeit deines Abos endet am ${endeMindestlaufzeit.toLocaleDateString('de-DE')}.`,
                    tipp: aboArt === "monatlich" 
                        ? "Gute Nachricht: Nach Ablauf der Mindestlaufzeit kannst du jederzeit mit 1-Monats-Frist kündigen (Gesetz 2022)."
                        : "Bei Altverträgen verlängert sich das Abo oft um ein Jahr. Prüfe, ob dir trotzdem ein monatliches Kündigungsrecht zusteht.",
                    icon: "calendar"
                });
            } else {
                if (aboArt === "monatlich") {
                    ergebnisse.push({
                        typ: "abo",
                        status: "kuendbar",
                        text: "Die Mindestlaufzeit ist vorbei. Du kannst jetzt jederzeit mit einer Frist von maximal einem Monat kündigen!",
                        tipp: "Nutze unseren Kündigungsgenerator für ein rechtssicheres Schreiben.",
                        icon: "check"
                    });
                } else {
                    ergebnisse.push({
                        typ: "abo",
                        status: "altvertrag",
                        text: "Bei Altverträgen verlängert sich das Abo oft automatisch um ein Jahr.",
                        tipp: "Prüfe, ob dir nach dem Gesetz 2022 trotzdem ein monatliches Kündigungsrecht zusteht oder ob ein Sonderkündigungsrecht (Preiserhöhung, Umzug) greift.",
                        icon: "alert"
                    });
                }
            }
        }

        // === 3. RATENKAUF-KOSTEN PRÜFEN ===
        const ratenJa = document.getElementById("raten_ja_nein").value === "ja";
        if (ratenJa) {
            const rate = parseFloat(document.getElementById("rk_rate").value);
            const monate = parseInt(document.getElementById("rk_monate").value);
            const zins = parseFloat(document.getElementById("rk_zins").value);

            if (rate && monate) {
                const gesamt = rate * monate;
                const jahre = Math.round(monate / 12 * 10) / 10;

                ergebnisse.push({
                    typ: "raten",
                    status: "belastung",
                    text: `Gesamtkosten deines Ratenkaufs: ${gesamt.toLocaleString('de-DE', {minimumFractionDigits: 2})} Euro über ${monate} Monate (${jahre} Jahre).`,
                    tipp: "Innerhalb von 14 Tagen nach Vertragsschluss kannst du den Ratenkauf widerrufen. Ist die Frist vorbei, prüfe den effektiven Jahreszins: Wurden versteckte Gebühren nicht transparent ausgewiesen, kann der Vertrag angreifbar sein.",
                    icon: "euro"
                });
            }
        }

        // === ERGEBNIS ANZEIGEN ===
        let html = '<div class="result-container" style="margin-top: 40px;">';
        
        // Header
        html += `
            <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h2 style="margin: 0 0 10px 0; font-size: 2em; font-weight: 600;">Deine Auswege aus dem Vertrag</h2>
                <p style="margin: 0; font-size: 1.1em; opacity: 0.95;">Wir haben ${ergebnisse.length} mögliche Lösungswege für dich gefunden</p>
            </div>
        `;

        // Ergebnisse
        html += '<div style="background: white; padding: 40px 30px; border: 2px solid #e3f2fd; border-top: none;">';
        
        ergebnisse.forEach((erg, index) => {
            const iconSvg = getIconSvg(erg.icon);
            const statusFarbe = erg.status === "moeglich" || erg.status === "kuendbar" ? "#27ae60" : "#1976d2";
            
            html += `
                <div style="margin-bottom: ${index < ergebnisse.length - 1 ? '40px' : '0'}; padding: 30px; background: #f8f9fa; border-radius: 8px;">
                    <div style="display: flex; align-items: flex-start; gap: 20px;">
                        <div style="flex-shrink: 0; width: 50px; height: 50px; background: ${statusFarbe}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            ${iconSvg}
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 15px 0; font-size: 1.4em; color: #1976d2; font-weight: 600;">
                                ${getTypName(erg.typ)}
                            </h3>
                            <p style="margin: 0 0 20px 0; font-size: 1.1em; line-height: 1.6; color: #333; font-weight: 500;">
                                ${erg.text}
                            </p>
                            <div style="padding: 20px; background: white; border-radius: 6px; border: 1px solid #e0e0e0;">
                                <p style="margin: 0; font-size: 1em; line-height: 1.7; color: #555;">
                                    <strong style="color: #1976d2;">Empfehlung:</strong> ${erg.tipp}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        // Hinweis
        html += `
            <div style="margin-top: 40px; padding: 25px; background: #fff3cd; border-radius: 8px;">
                <p style="margin: 0; font-size: 0.95em; line-height: 1.6; color: #856404;">
                    <strong>Wichtiger Hinweis:</strong> Diese Einschätzung basiert auf einer automatisierten Plausibilitätsprüfung und ersetzt keine individuelle Rechtsberatung. Bei strittigen Forderungen oder Inkasso-Drohungen wende dich bitte an eine Verbraucherzentrale oder einen Fachanwalt.
                </p>
            </div>
        `;

        html += '</div>';
        html += '</div>';

        out.innerHTML = html;
        out.scrollIntoView({ behavior: "smooth" });
    });

    function getTypName(typ) {
        switch(typ) {
            case "widerruf": return "Widerrufsrecht";
            case "abo": return "Abo-Kündigung";
            case "raten": return "Ratenkauf-Kosten";
            default: return typ;
        }
    }

    function getIconSvg(icon) {
        const svgs = {
            check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
            clock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
            calendar: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>',
            store: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>',
            euro: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H4v2h2.15c-.05.33-.08.66-.08 1s.03.67.08 1H4v2h2.52c1.24 3.49 4.56 6 8.48 6 2.31 0 4.41-.87 6-2.3l-1.78-1.77c-1.13.98-2.6 1.57-4.22 1.57z"/></svg>',
            alert: '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'
        };
        return svgs[icon] || '';
    }

    function showWarn(msg) {
        out.innerHTML = `
            <div style="margin-top: 40px; padding: 30px; background: #fff3cd; border-radius: 8px;">
                <p style="margin: 0; font-size: 1.1em; color: #856404; font-weight: 500;">${msg}</p>
            </div>
        `;
    }
});