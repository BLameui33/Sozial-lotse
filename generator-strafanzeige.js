// generator-strafanzeige.js
// Erstellt einen strukturierten Sachverhaltstext für Online-Wachen

document.addEventListener("DOMContentLoaded", () => {
    const btnGenerate = document.getElementById("btnGenerate");
    const resultBox = document.getElementById("resultBox");
    const finalText = document.getElementById("finalText");
    const btnCopy = document.getElementById("btnCopy");

    btnGenerate.addEventListener("click", () => {
        // Daten sammeln
        const delikt = document.getElementById("deliktArt").value;
        const datum = document.getElementById("datumTat").value;
        const plattform = document.getElementById("plattform").value || "unbekannt";
        const url = document.getElementById("url").value;
        
        const taeterName = document.getElementById("taeterName").value || "unbekannt";
        const taeterKontakt = document.getElementById("taeterKontakt").value;
        const bankDaten = document.getElementById("bankDaten").value;
        
        const schaden = document.getElementById("schadenshoehe").value;
        const beschreibung = document.getElementById("beschreibung").value;

        // Datum schön formatieren
        let datumFormatted = "einem unbekannten Zeitpunkt";
        if (datum) {
            const d = new Date(datum);
            datumFormatted = d.toLocaleDateString("de-DE") + " um " + d.toLocaleTimeString("de-DE", {hour: '2-digit', minute:'2-digit'});
        }

        // Text zusammenbauen (Der "Polizei-Stil")
        let text = `Hiermit erstatte ich Strafanzeige gegen ${taeterName === "unbekannt" ? "Unbekannt" : taeterName} wegen ${delikt} und aller weiterer in Betracht kommender Delikte.\n\n`;
        
        text += `SACHVERHALT:\n`;
        text += `Am ${datumFormatted} kam es über ${plattform} zu folgendem Vorfall:\n\n`;
        
        if (url) text += `Betroffene Internetadresse/URL: ${url}\n`;
        
        text += `${beschreibung}\n\n`;

        if (schaden) {
            text += `Es ist mir ein finanzieller Schaden in Höhe von ${schaden} Euro entstanden.\n\n`;
        }

        text += `INFORMATIONEN ZUM TÄTER / ZAHLUNGSWEG:\n`;
        text += `Name/Nutzername: ${taeterName}\n`;
        if (taeterKontakt) text += `Kontakt (Tel/Mail): ${taeterKontakt}\n`;
        if (bankDaten) text += `Geldempfänger / IBAN / PayPal: ${bankDaten}\n`;
        
        text += `\nBEWEISMITTEL:\n`;
        text += `Als Beweise liegen mir Screenshots, Chatverläufe und Zahlungsbelege vor. Diese kann ich auf Nachfrage zur Verfügung stellen oder (falls technisch möglich) direkt hier hochladen.\n\n`;
        
        text += `Ich stelle Strafantrag wegen aller in Betracht kommenden Delikte.`;

        // Ergebnis anzeigen
        finalText.value = text;
        resultBox.style.display = "block";
        
        // Zum Ergebnis scrollen
        resultBox.scrollIntoView({ behavior: "smooth" });
    });

    // Kopier-Funktion
    btnCopy.addEventListener("click", () => {
        finalText.select();
        finalText.setSelectionRange(0, 99999); // Für Mobile
        
        navigator.clipboard.writeText(finalText.value).then(() => {
            const originalText = btnCopy.innerText;
            btnCopy.innerText = "Kopiert! ✅";
            btnCopy.style.backgroundColor = "#2ecc71";
            
            setTimeout(() => {
                btnCopy.innerText = originalText;
                btnCopy.style.backgroundColor = "#27ae60";
            }, 2000);
        });
    });
});