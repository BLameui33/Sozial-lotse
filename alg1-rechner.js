// alg1-rechner.js
// Logik: § 147 SGB III (Anspruchsdauer) & Leistungsentgelt (Schätzung)

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

function euro(v) { 
    const x = Number.isFinite(v) ? v : 0; 
    return x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; 
}

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        alter: document.getElementById("alg_alter"),
        kinder: document.getElementById("alg_kinder"),
        monate: document.getElementById("alg_monate"),
        brutto: document.getElementById("alg_brutto"),
        sk: document.getElementById("alg_steuerklasse")
    };

    const btn = document.getElementById("alg_berechnen");
    const reset = document.getElementById("alg_reset");
    const out = document.getElementById("alg_ergebnis");

    // --- BERECHNUNG ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Eingaben validieren
        const age = n(inputs.alter);
        const months = n(inputs.monate);
        const gross = n(inputs.brutto);
        const hasKids = inputs.kinder.value === "ja";
        const taxClass = inputs.sk.value;

        if (age < 15 || months < 0 || gross <= 0) {
            out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte fülle alle Felder korrekt aus (Alter, Monate, Brutto).</div>`;
            return;
        }

        // 2. Anspruchsprüfung (Anwartschaftszeit)
        // Mindestens 12 Monate in den letzten 30 Monaten
        const hasClaim = months >= 12;

        if (!hasClaim) {
            out.innerHTML = `
                <div class="pflegegrad-result-card" style="border-left: 5px solid #d9534f;">
                    <h3>Ergebnis: Kein Anspruch</h3>
                    <p>Du hast angegeben, dass du in den letzten 30 Monaten nur <strong>${months} Monate</strong> versicherungspflichtig beschäftigt warst.</p>
                    <p>Für ALG I benötigst du in der Regel mindestens <strong>12 Monate</strong> (Anwartschaftszeit).</p>
                    <p class="hinweis">Tipp: Prüfe, ob du Anspruch auf Grundsicherungsgeld hast oder ob Sonderregelungen (z.B. kurze befristete Jobs) greifen.</p>
                </div>
            `;
            return;
        }

        // 3. Bezugsdauer berechnen (§ 147 SGB III)
        // Basisstaffel
        let duration = 0;
        if (months >= 12) duration = 6;
        if (months >= 16) duration = 8;
        if (months >= 20) duration = 10;
        if (months >= 24) duration = 12;

        // Altersstaffel (erweitert die Dauer, wenn Bedingungen erfüllt)
        if (age >= 50 && months >= 30) duration = 15;
        if (age >= 55 && months >= 36) duration = 18;
        if (age >= 58 && months >= 48) duration = 24;

        // 4. Finanzielle Schätzung
        // Die exakte Steuerberechnung ist komplex. Wir nutzen Faktoren für das "Leistungsentgelt".
        // Faktor repräsentiert das Verhältnis ALG1 zu Brutto.
        // Grobe Richtwerte 2025:
        // SK 1/4 (Standard): ~36-38% vom Brutto (bei 60%), ~40-42% (bei 67%)
        // SK 3 (Günstig):    ~43% vom Brutto (bei 60%), ~48% (bei 67%)
        // SK 5/6 (Teuer):    ~30% vom Brutto (bei 60%), ~34% (bei 67%)

        let factor = 0.37; // Basis SK 1 ohne Kind

        if (taxClass === "standard") {
            factor = hasKids ? 0.41 : 0.37;
        } else if (taxClass === "guenstig") {
            factor = hasKids ? 0.48 : 0.43;
        } else if (taxClass === "teuer") {
            factor = hasKids ? 0.34 : 0.30;
        }

        // Deckelung durch Beitragsbemessungsgrenze (BBG West 2025 ca. 7550€)
        // Das ALG wird nur bis zur BBG berechnet.
        const bbg = 7550; 
        const calcGross = Math.min(gross, bbg);
        
        const algMonth = calcGross * factor;
        const totalSum = algMonth * duration;

        // 5. HTML Output
        const resultHtml = `
            <h2>Dein ALG-I Check</h2>
            <div id="alg_result_card" class="pflegegrad-result-card">
                <div style="background:#d4edda; color:#155724; padding:10px; border-radius:4px; margin-bottom:15px; font-weight:bold; text-align:center;">
                    ✅ Anspruch wahrscheinlich vorhanden
                </div>

                <h3>Bezugsdauer</h3>
                <table class="pflegegrad-tabelle">
                    <tr>
                        <td>Versicherte Monate</td>
                        <td>${months} Monate</td>
                    </tr>
                    <tr>
                        <td>Dein Alter</td>
                        <td>${age} Jahre</td>
                    </tr>
                    <tr style="background-color:#f0f8ff;">
                        <td><strong>Anspruchsdauer</strong></td>
                        <td><strong>${duration} Monate</strong></td>
                    </tr>
                </table>

                <h3>Höhe der Zahlung (Schätzung)</h3>
                <table class="pflegegrad-tabelle">
                    <tr>
                        <td>Berechnungsbasis (Brutto)</td>
                        <td>${euro(gross)} ${gross > bbg ? '(gedeckelt auf BBG)' : ''}</td>
                    </tr>
                    <tr>
                        <td>Leistungssatz</td>
                        <td>${hasKids ? '67% (erhöhter Satz)' : '60% (Basissatz)'}</td>
                    </tr>
                    <tr style="border-top:2px solid #ccc;">
                        <td><strong>Monatliche Auszahlung (Netto)</strong></td>
                        <td><strong>ca. ${euro(algMonth)}</strong></td>
                    </tr>
                    <tr>
                        <td>Gesamtbetrag (über ${duration} Monate)</td>
                        <td>ca. ${euro(totalSum)}</td>
                    </tr>
                </table>

                <div class="warning-box">
                   <p><strong>Wichtig:</strong> Dies ist eine Orientierungshilfe. Die exakte Höhe berechnet die Agentur für Arbeit unter Berücksichtigung genauer Steuerabzüge und Sozialpauschalen.</p>
                   <p style="margin-top:5px;">Achtung: Bei eigener Kündigung ohne wichtigen Grund droht eine <strong>Sperrzeit</strong> (oft 12 Wochen)!</p>
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="alg_pdf_btn" class="button">📄 Ergebnis als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("alg_pdf_btn");
            const elementToPrint = document.getElementById("alg_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    const clonedElement = elementToPrint.cloneNode(true);
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    // Styling für den Klon
                    clonedElement.style.position = 'fixed';
                    clonedElement.style.top = '0';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '800px'; // Feste Breite für Stabilität
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                margin:       [10, 10, 10, 10], // Ränder: Oben, Rechts, Unten, Links
                filename:     "kinderkrankengeld-berechnung.pdf",
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2,           // Bessere Qualität
                    useCORS: true,      // Erlaubt externe Bilder/Fonts
                    logging: true,      // Zeigt Rendering-Prozess in Konsole
                    scrollY: 0,         // WICHTIG: Ignoriert Scroll-Position
                    windowWidth: document.documentElement.offsetWidth // Stellt sicher, dass Layout passt
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

                    html2pdf().from(clonedElement).set(opt).save().then(() => {
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = originalText;
                    }).catch(err => {
                        console.error(err);
                        document.body.removeChild(clonedElement);
                        pdfBtn.innerText = "Fehler!";
                    });
                });
            }
        }, 500);
    });

    if (reset) {
        reset.addEventListener("click", () => {
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});