// kuendigungsfrist-rechner.js
// Logik basierend auf § 622 BGB (Bürgerliches Gesetzbuch)

document.addEventListener("DOMContentLoaded", () => {
    const inputs = {
        jahre: document.getElementById("kf_jahre"),
        probezeit: document.getElementById("kf_probezeit"),
        vertrag: document.getElementById("kf_vertrag"),
        customDiv: document.getElementById("div_custom_input"),
        customText: document.getElementById("kf_custom_text")
    };

    const btn = document.getElementById("kf_berechnen");
    const reset = document.getElementById("kf_reset");
    const out = document.getElementById("kf_ergebnis");

    if (!btn || !out) return;

    // Toggle für manuelles Textfeld
    if (inputs.vertrag && inputs.customDiv) {
        inputs.vertrag.addEventListener("change", () => {
            if (inputs.vertrag.value === "custom") {
                inputs.customDiv.style.display = "block";
            } else {
                inputs.customDiv.style.display = "none";
            }
        });
    }

    // --- LOGIK ---
    btn.addEventListener("click", () => {
        out.innerHTML = "";

        const rawYears = inputs.jahre ? inputs.jahre.value : "";
        const years = parseFloat(rawYears.replace(',', '.'));
        const isProbe = inputs.probezeit ? inputs.probezeit.checked : false;
        const contractType = inputs.vertrag ? inputs.vertrag.value : "bgb";
        const customVal = inputs.customText ? inputs.customText.value : "";

        // Validierung
        if (isNaN(years) && !isProbe) {
            out.innerHTML = `
                <div class="kf-result-card">
                    <div class="kf-warning-box">
                        <p><strong>Hinweis:</strong> Bitte gib die Dauer der Beschäftigung in Jahren an, um eine Berechnung durchzuführen.</p>
                    </div>
                </div>`;
            out.scrollIntoView({ behavior: "smooth", block: "nearest" });
            return;
        }

        let fristAN = "";
        let fristAG = "";
        let note = "";

        // 1. Fall: Probezeit
        if (isProbe) {
            const text = "2 Wochen (zu jedem beliebigen Tag)";
            fristAN = text;
            fristAG = text;
            note = "In der Probezeit (§ 622 Abs. 3 BGB) verkürzt sich die Frist auf 2 Wochen. Eine Kündigung ist hier nicht an den 15. oder Monatsende gebunden, sofern nicht anders vereinbart.";
        } 
        // 2. Fall: Manuelle Eingabe im Vertrag
        else if (contractType === "custom" && customVal.trim() !== "") {
            fristAN = customVal;
            fristAG = customVal;
            note = "Es gilt vorrangig die im Arbeitsvertrag vereinbarte Frist. Achtung: Die Frist für den Arbeitnehmer darf nicht länger sein als für den Arbeitgeber (§ 622 Abs. 6 BGB).";
        }
        // 3. Fall: Gesetzliche Regelung (§ 622 BGB)
        else {
            fristAN = "4 Wochen zum 15. oder zum Monatsende";

            if (years < 2) {
                fristAG = "4 Wochen zum 15. oder zum Monatsende";
            } else if (years < 5) {
                fristAG = "1 Monat zum Ende eines Kalendermonats";
            } else if (years < 8) {
                fristAG = "2 Monate zum Ende eines Kalendermonats";
            } else if (years < 10) {
                fristAG = "3 Monate zum Ende eines Kalendermonats";
            } else if (years < 12) {
                fristAG = "4 Monate zum Ende eines Kalendermonats";
            } else if (years < 15) {
                fristAG = "5 Monate zum Ende eines Kalendermonats";
            } else if (years < 20) {
                fristAG = "6 Monate zum Ende eines Kalendermonats";
            } else {
                fristAG = "7 Monate zum Ende eines Kalendermonats";
            }

            note = "Die verlängerten Fristen bei langer Betriebszugehörigkeit gelten laut Gesetz (§ 622 Abs. 2 BGB) nur, wenn der Arbeitgeber kündigt. Für dich als Arbeitnehmer bleibt es bei 4 Wochen, außer dein Vertrag besagt: 'Die verlängerten Kündigungsfristen gelten für beide Parteien'. Dies ist in der Praxis sehr häufig der Fall.";
        }

        // HTML Output
        const resultHtml = `
            <div class="kf-result-card">
                <h2 class="kf-result-title">Dein Ergebnis</h2>
                
                <table class="kf-result-table">
                    <thead>
                        <tr>
                            <th>Situation</th>
                            <th>Kündigungsfrist</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="kf-text-slate">Du kündigst (Arbeitnehmer)</td>
                            <td class="kf-text-blue">${fristAN}</td>
                        </tr>
                        <tr>
                            <td class="kf-text-slate">Arbeitgeber kündigt</td>
                            <td class="kf-text-blue">${fristAG}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="kf-info-box">
                    <p><strong>Hinweis:</strong> ${note}</p>
                </div>

                <div class="kf-warning-box">
                    <p><strong>Wichtig:</strong> Prüfe unbedingt deinen Arbeitsvertrag oder Tarifvertrag! Diese gehen der gesetzlichen Regelung vor, sofern sie für dich günstiger sind oder (in Tarifverträgen) auch kürzere Fristen erlauben.</p>
                </div>
            </div>
        `;

        out.innerHTML = resultHtml;
        out.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    // Reset Logik
    if (reset) {
        reset.addEventListener("click", () => {
            if (inputs.customDiv) inputs.customDiv.style.display = "none";
            setTimeout(() => { out.innerHTML = ""; }, 50);
        });
    }
});