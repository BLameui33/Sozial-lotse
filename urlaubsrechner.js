// urlaubsrechner.js
// Berechnung nach Bundesurlaubsgesetz (BUrlG)
// Logik: Zwölftelung (§ 5 Abs. 1), Rundung (§ 5 Abs. 2) und Mindesturlaub.

/* --- Hilfsfunktionen --- */
function n(el) { 
    if (!el) return 0; 
    const v = Number((el.value || "").toString().replace(",", ".")); 
    return Number.isFinite(v) ? v : 0; 
}

function formatDate(d) {
    if(!d || isNaN(d.getTime())) return "–";
    const dd = ("0"+d.getDate()).slice(-2);
    const mm = ("0"+(d.getMonth()+1)).slice(-2);
    return `${dd}.${mm}.${d.getFullYear()}`;
}

// Prüft, ob ein Jahr ein Schaltjahr ist (für exakte Monatsenden)
function isLeap(year) {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}

// Gibt letzten Tag des Monats zurück
function getLastDayOfMonth(year, month) {
    // month 0 = Jan
    const days = [31, isLeap(year)?29:28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[month];
}

document.addEventListener("DOMContentLoaded", () => {
    // Setze Default Datum auf aktuelles Jahr (01.01. bis 31.12.)
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const inpStart = document.getElementById("ur_eintritt");
    const inpEnd = document.getElementById("ur_austritt");

    if (inpStart) inpStart.value = `${currentYear}-01-01`;
    if (inpEnd) inpEnd.value = `${currentYear}-12-31`;


    const inputs = {
        total: document.getElementById("ur_jahresurlaub"),
        daysPerWeek: document.getElementById("ur_wochentage"),
        start: inpStart,
        end: inpEnd,
        taken: document.getElementById("ur_genommen")
    };

    const btn = document.getElementById("ur_berechnen");
    const reset = document.getElementById("ur_reset");
    const out = document.getElementById("ur_ergebnis");

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = ""; 

        // 1. Werte holen
        const annualLeave = n(inputs.total);
        const workDays = parseInt(inputs.daysPerWeek.value);
        const takenDays = n(inputs.taken);
        
        const dStart = new Date(inputs.start.value);
        const dEnd = new Date(inputs.end.value);

        // Validierung
        if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || annualLeave <= 0) {
             out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Bitte gib den Jahresurlaub und gültige Datumsangaben an.</div>`;
             return;
        }
        if (dEnd < dStart) {
             out.innerHTML = `<div class="warning-box" style="background:#fff3cd; color:#856404;">Das Austrittsdatum liegt vor dem Eintrittsdatum.</div>`;
             return;
        }

        // 2. Volle Monate berechnen
        // § 5 BUrlG: Anspruch besteht für jeden VOLLEN Monat.
        // Ein Monat ist voll, wenn das Arbeitsverhältnis vom 1. bis zum Letzten bestand,
        // ODER wenn es z.B. vom 15.01. bis 14.02. geht (juristisch umstritten, meist wird Kalendermonat genommen).
        // Wir nutzen hier die sichere Variante: Kalendermonate.
        
        let fullMonths = 0;
        let loopDate = new Date(dStart);
        
        // Wir iterieren durch die Monate des Zeitraums
        // Wenn Start <= 1. des Monats UND Ende >= Letzter des Monats -> Voller Monat
        
        // Hilfsvariable für Jahr/Monat
        let currY = dStart.getFullYear();
        let currM = dStart.getMonth(); // 0-11
        
        // Wir prüfen maximal 12 Monate (oder bis dEnd)
        while (new Date(currY, currM, 1) <= dEnd) {
            const firstOfM = new Date(currY, currM, 1);
            const lastOfM = new Date(currY, currM, getLastDayOfMonth(currY, currM));
            
            // Check ob der Monat komplett im Intervall [dStart, dEnd] liegt
            // Startdatum muss <= 1. des Monats sein
            // Enddatum muss >= Letzter des Monats sein
            if (dStart <= firstOfM && dEnd >= lastOfM) {
                fullMonths++;
            }
            
            // Nächster Monat
            currM++;
            if(currM > 11) { currM = 0; currY++; }
        }

        // 3. Berechnung Anspruch
        // Formel: (Jahresurlaub / 12) * volle Monate
        const exactClaim = (annualLeave / 12) * fullMonths;
        
        // Rundung: § 5 Abs. 2 BUrlG: Bruchteile, die mind. 0,5 betragen, sind aufzurunden.
        // Darunter: Keine Rundungsvorschrift (also bleiben Kommastellen oft stehen oder werden abgerundet, wir lassen sie stehen).
        const fraction = exactClaim % 1;
        let finalClaim = exactClaim;
        
        let roundingInfo = "";
        if (fraction >= 0.5) {
            finalClaim = Math.ceil(exactClaim);
            roundingInfo = "(aufgerundet gemäß § 5 Abs. 2 BUrlG)";
        } else if (fraction > 0) {
            // Kaufmännisch oft abrunden oder exakt lassen. BUrlG kennt kein Abrunden. 
            // Wir zeigen 2 Dezimalstellen an, wenn < 0.5
            finalClaim = Math.floor(exactClaim * 100) / 100; // 2 Stellen
        }

        // 4. Sonderfall: 2. Jahreshälfte (§ 5 Abs. 1 c BUrlG Umkehrschluss)
        // Wer NACH Wartezeit (6 Monate) in der 2. Jahreshälfte (nach 30.06.) ausscheidet, hat Anspruch auf den VOLLEN gesetzlichen Mindesturlaub,
        // oft sogar auf den vollen vertraglichen Urlaub (wenn keine pro rata temporis Klausel).
        
        let specialNote = "";
        let isSecondHalfRule = false;
        
        // Wartezeit erfüllt? (Einfachheitshalber: Zeitraum > 6 Monate)
        const diffTime = Math.abs(dEnd - dStart);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const passedWait = diffDays > 182; // ca 6 Monate

        // Austritt in 2. Jahreshälfte? (Monat > 5, also Juli=6 bis Dez=11)
        const exitInSecondHalf = dEnd.getMonth() >= 6; // Juli ist Index 6

        if (passedWait && exitInSecondHalf && fullMonths < 12) {
             isSecondHalfRule = true;
             specialNote = `
                <div class="warning-box" style="margin-top:15px; border-left: 5px solid #c0392b;">
                    <strong>Wichtiger Sonderfall (2. Jahreshälfte):</strong><br>
                    Du bist nach erfüllter Wartezeit (6 Monate) in der zweiten Jahreshälfte ausgeschieden. 
                    Laut Bundesurlaubsgesetz steht dir dann oft nicht nur der anteilige, sondern der <strong>volle gesetzliche Mindesturlaub</strong> zu (bei 5-Tage-Woche: 20 Tage).<br>
                    Prüfe deinen Arbeitsvertrag: Enthält er keine "pro rata temporis"-Klausel, steht dir sogar der <strong>volle Jahresurlaub (${annualLeave} Tage)</strong> zu!
                </div>
             `;
        }

        // Resturlaub
        const remaining = finalClaim - takenDays;

        // HTML Output
        const resultHtml = `
            <h2>Dein Ergebnis</h2>
            <div id="ur_result_card" class="pflegegrad-result-card">
                
                <h3>Berechnungsgrundlage</h3>
                <table class="pflegegrad-tabelle">
                    <tr>
                        <td>Zeitraum</td>
                        <td>${formatDate(dStart)} – ${formatDate(dEnd)}</td>
                    </tr>
                    <tr>
                        <td>Volle Monate</td>
                        <td><strong>${fullMonths} Monate</strong></td>
                    </tr>
                    <tr>
                        <td>Jahresurlaub (Vertrag)</td>
                        <td>${annualLeave} Tage</td>
                    </tr>
                </table>

                <h3>Anteiliger Anspruch</h3>
                <div style="background-color:#f0f8ff; padding:15px; border-radius:8px; text-align:center; margin:15px 0;">
                    <span style="font-size:0.9rem; color:#666;">Rechnung: ${annualLeave} ÷ 12 × ${fullMonths}</span><br>
                    <span style="font-size:2rem; font-weight:bold; color:#2c3e50;">${finalClaim.toLocaleString('de-DE')} Tage</span><br>
                    <span style="font-size:0.8rem; color:#666;">${roundingInfo}</span>
                </div>

                <table class="pflegegrad-tabelle">
                    <tr>
                        <td>Gesamtanspruch (anteilig)</td>
                        <td>${finalClaim.toLocaleString('de-DE')} Tage</td>
                    </tr>
                    <tr>
                        <td>Bereits genommen</td>
                        <td>- ${takenDays.toLocaleString('de-DE')} Tage</td>
                    </tr>
                    <tr style="border-top:2px solid #2c3e50; font-weight:bold; background:#eafaf1;">
                        <td>Resturlaub</td>
                        <td>${remaining.toLocaleString('de-DE')} Tage</td>
                    </tr>
                </table>

                ${specialNote}

                <div class="highlight-box" style="margin-top:20px; font-size:0.9em;">
                    <p><strong>Hinweis:</strong> Resturlaub muss bei Beendigung des Arbeitsverhältnisses ausgezahlt werden (Urlaubsabgeltung), wenn er nicht mehr genommen werden kann.</p>
                </div>

                <div class="button-container" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    <button id="ur_pdf_btn" class="button">📄 Berechnung als PDF</button>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth" });

        // --- PDF EXPORT (STABILE KLON-METHODE) ---
        setTimeout(() => {
            const pdfBtn = document.getElementById("ur_pdf_btn");
            const elementToPrint = document.getElementById("ur_result_card");

            if(pdfBtn && elementToPrint) {
                pdfBtn.addEventListener("click", () => {
                    const originalText = pdfBtn.innerText;
                    pdfBtn.innerText = "⏳ Wird erstellt...";
                    
                    // Klonen & Isolieren
                    const clonedElement = elementToPrint.cloneNode(true);
                    const btnContainer = clonedElement.querySelector('.button-container');
                    if(btnContainer) btnContainer.style.display = 'none';

                    clonedElement.style.position = 'fixed';
                    clonedElement.style.top = '0';
                    clonedElement.style.left = '-9999px';
                    clonedElement.style.width = '800px'; 
                    clonedElement.style.backgroundColor = '#ffffff';
                    document.body.appendChild(clonedElement);

                    const opt = {
                        margin:       [0.5, 0.5],
                        filename:     'urlaubsanspruch-berechnung.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, logging: false },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
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