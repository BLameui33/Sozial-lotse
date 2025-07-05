// ====================================================================================
// HINWEIS: Die globalen Hilfsfunktionen und die generateAlg1SperrzeitWiderspruchPDF()-
// Funktion wurden entfernt und gehören jetzt in Ihre zentrale "pdf-generators.js"-Datei.
// ====================================================================================


// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik bleiben erhalten ---
    const form = document.getElementById('widerspruchAlg1SperrzeitForm');
    const saveBtn = document.getElementById('saveBtnSperrzeit');
    const loadBtn = document.getElementById('loadBtnSperrzeit');
    const storageKey = 'widerspruchAlg1SperrzeitFormData_v1';

    // --- Steuerung der dynamischen Detail-Felder (bleibt unverändert) ---
    const widerspruchsgrundCheckboxes = document.querySelectorAll('input[name="widerspruchsgrundSperrzeit"]');
    function toggleDetailDiv(checkbox) {
        const detailDivId = `details${checkbox.value.charAt(0).toUpperCase() + checkbox.value.slice(1)}`;
        const detailsDiv = document.getElementById(detailDivId);
        if (detailsDiv) {
            detailsDiv.style.display = checkbox.checked ? 'block' : 'none';
        }
    }
    widerspruchsgrundCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => toggleDetailDiv(cb));
        toggleDetailDiv(cb);
    });

    // --- WICHTIG: Ihre getFormData() Funktion für diesen Generator bleibt exakt so wie sie ist! ---
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "kundenNummer", "anzahlPersonenSperrzeit",
            "personAdresse", "personPlz", "personOrt",
            "agenturName", "agenturAdresse",
            "bescheidDatum", "bescheidAktenzeichen", "sperrzeitGrund", "sperrzeitDauer",
            "textWichtigerGrund", "textSachverhaltFalsch", "textAnhaerungFehlte",
            "ergaenzendeArgumenteSperrzeit", "forderungSperrzeit"
        ];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if(element) data[id] = element.value;
        });
        data.widerspruchsgruende = [];
        document.querySelectorAll('input[name="widerspruchsgrundSperrzeit"]:checked').forEach(cb => data.widerspruchsgruende.push(cb.value));
        return data;
    }

    // --- Ihre Speichern & Laden Logik bleibt unverändert ---
    function populateForm(data) {
        const formElementIds = ["personName", "kundenNummer", "anzahlPersonenSperrzeit", "personAdresse", "personPlz", "personOrt", "agenturName", "agenturAdresse", "bescheidDatum", "bescheidAktenzeichen", "sperrzeitGrund", "sperrzeitDauer", "textWichtigerGrund", "textSachverhaltFalsch", "textAnhaerungFehlte", "ergaenzendeArgumenteSperrzeit", "forderungSperrzeit"];
        formElementIds.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.value = data[id]; } });
        document.querySelectorAll('input[name="widerspruchsgrundSperrzeit"]').forEach(cb => { if (cb) { cb.checked = !!(data.widerspruchsgruende && data.widerspruchsgruende.includes(cb.value)); toggleDetailDiv(cb); } });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            localStorage.setItem(storageKey, JSON.stringify(getFormData()));
            alert('Ihre Eingaben wurden im Browser gespeichert!');
        });
    }
    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
             const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                populateForm(JSON.parse(savedData));
                alert('Gespeicherte Eingaben wurden geladen!');
            } else {
                alert('Keine gespeicherten Daten gefunden.');
            }
        });
    }

    // ===========================================================================
    // START: NEUE PAYPAL-LOGIK (ersetzt den alten form.addEventListener)
    // ===========================================================================

 if (form) {
    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Verhindert, dass die Seite neu geladen wird

        // 1. Daten aus dem Formular holen und validieren
        const formData = getFormData();
        if (formData.widerspruchsgruende.length === 0 && document.getElementById("ergaenzendeArgumenteAlg1").value.trim() === "" ) {
            alert("Bitte wählen Sie mindestens einen Widerspruchsgrund aus oder füllen Sie die ergänzenden Argumente aus.");
            return;
        }
         if (document.getElementById("forderungAlg1").value.trim() === "") {
            alert("Bitte formulieren Sie Ihre Forderung an die Agentur für Arbeit.");
            return;
        }

        // 2. Die validierten Daten im Browser-Speicher ablegen
        localStorage.setItem('pendingPaymentData-alg1sperrzeit', JSON.stringify(formData));

        // 3. Den Nutzer zur Danke-Seite weiterleiten
        window.location.href = "danke.html?typ=alg1sperrzeit";
    });
}
