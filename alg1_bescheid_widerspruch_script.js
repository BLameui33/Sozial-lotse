// ====================================================================================
// HINWEIS: Die globalen Hilfsfunktionen und die generateAlg1BescheidWiderspruchPDF()-
// Funktion wurden entfernt und gehören jetzt in Ihre zentrale "pdf-generators.js"-Datei.
// ====================================================================================


// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik bleiben erhalten ---
    const form = document.getElementById('widerspruchAlg1BescheidForm');
    const saveBtn = document.getElementById('saveBtnAlg1');
    const loadBtn = document.getElementById('loadBtnAlg1');
    const storageKey = 'widerspruchAlg1BescheidFormData_v1';

    // --- Steuerung der dynamischen Detail-Felder (bleibt unverändert) ---
    const widerspruchsgrundCheckboxes = document.querySelectorAll('input[name="widerspruchsgrundAlg1"]');
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
            "personName", "kundenNummer", "anzahlPersonenAlg1",
            "personAdresse", "personPlz", "personOrt",
            "agenturName", "agenturAdresse",
            "bescheidDatum", "bescheidAktenzeichen",
            "textHoehe", "textDauer",
            "ergaenzendeArgumenteAlg1", "forderungAlg1"
        ];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if(element) data[id] = element.value;
        });
        data.widerspruchsgruende = [];
        document.querySelectorAll('input[name="widerspruchsgrundAlg1"]:checked').forEach(cb => data.widerspruchsgruende.push(cb.value));
        return data;
    }

    // --- Ihre Speichern & Laden Logik bleibt unverändert ---
    function populateForm(data) {
        const formElementIds = ["personName", "kundenNummer", "anzahlPersonenAlg1", "personAdresse", "personPlz", "personOrt", "agenturName", "agenturAdresse", "bescheidDatum", "bescheidAktenzeichen", "textHoehe", "textDauer", "ergaenzendeArgumenteAlg1", "forderungAlg1"];
        formElementIds.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.value = data[id]; } });
        document.querySelectorAll('input[name="widerspruchsgrundAlg1"]').forEach(cb => { if (cb) { cb.checked = !!(data.widerspruchsgruende && data.widerspruchsgruende.includes(cb.value)); toggleDetailDiv(cb); } });
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
            event.preventDefault();

            // 1. Validierung für das Sperrzeit-Formular
            const formData = getFormData();
            // Führe hier deine Validierungs-Checks durch
            // z.B. if (!formData.bescheidDatum) { alert(...); return; }

            // 2. Daten im localStorage speichern
            // WICHTIG: Den Schlüssel an den Generator anpassen!
            localStorage.setItem('pendingPaymentData-alg1bescheid', JSON.stringify(formData));

            // 3. Zur Danke-Seite weiterleiten
            // WICHTIG: Den 'typ' an den Generator anpassen!
            window.location.href = "danke.html?typ=alg1bescheid";
        });
    }

});
