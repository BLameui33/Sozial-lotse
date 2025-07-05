// ====================================================================================
// START: Globale Hilfsfunktionen (für das gesamte Skript verfügbar)
// ====================================================================================

// Diese Funktionen bleiben unverändert, da sie weiterhin benötigt werden.
function getElementValue(id, defaultValue = "") {
    const element = document.getElementById(id);
    if (element && typeof element.value !== 'undefined' && element.value !== null) {
        return String(element.value);
    }
    return defaultValue;
}

// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik bleiben erhalten ---
    const form = document.getElementById('widerspruchKizForm');
    const saveBtn = document.getElementById('saveBtnKiz');
    const loadBtn = document.getElementById('loadBtnKiz');
    const storageKey = 'widerspruchKizFormData_v1';

    // --- Steuerung der dynamischen Detail-Felder für Widerspruchsgründe ---
    // Diese Logik bleibt unverändert.
    const widerspruchsgrundCheckboxes = document.querySelectorAll('input[name="widerspruchsgrundKiz"]');
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

    // --- WICHTIG: Ihre getFormData() Funktion bleibt exakt so wie sie ist! ---
    // Sie wird jetzt von der PayPal-Logik wiederverwendet.
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "kindergeldnummer", "anzahlPersonenKiz",
            "personAdresse", "personPlz", "personOrt",
            "familienkasseName", "familienkasseAdresse",
            "bescheidDatum", "bescheidAktenzeichen", "bescheidInhalt",
            "textAblehnung", "textEinkommen", "textVermoegen", "textWohnkosten",
            "ergaenzendeArgumenteKiz", "forderungKiz"
        ];
        formElementIds.forEach(id => {
            data[id] = getElementValue(id);
        });
        data.widerspruchsgruende = [];
        document.querySelectorAll('input[name="widerspruchsgrundKiz"]:checked').forEach(cb => data.widerspruchsgruende.push(cb.value));
        // ... weitere Logik zum Sammeln von Daten ...
        return data;
    }

    // --- Ihre Speichern & Laden Logik bleibt unverändert ---
    function populateForm(data) {
        // Ihr Code zum Befüllen des Formulars... unverändert
        const formElementIds = [ "personName", "kindergeldnummer", "anzahlPersonenKiz", "personAdresse", "personPlz", "personOrt", "familienkasseName", "familienkasseAdresse", "bescheidDatum", "bescheidAktenzeichen", "bescheidInhalt", "textAblehnung", "textEinkommen", "textVermoegen", "textWohnkosten", "ergaenzendeArgumenteKiz", "forderungKiz"];
        formElementIds.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.value = data[id]; } });
        document.querySelectorAll('input[name="widerspruchsgrundKiz"]').forEach(cb => { if (cb) { cb.checked = !!(data.widerspruchsgruende && data.widerspruchsgruende.includes(cb.value)); toggleDetailDiv(cb); } });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            // ... Ihre Speicher-Logik bleibt unverändert ...
            localStorage.setItem(storageKey, JSON.stringify(getFormData()));
            alert('Ihre Eingaben wurden im Browser gespeichert!');
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', function() {
            // ... Ihre Laden-Logik bleibt unverändert ...
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
            localStorage.setItem('pendingPaymentData-kiz', JSON.stringify(formData));

            // 3. Zur Danke-Seite weiterleiten
            // WICHTIG: Den 'typ' an den Generator anpassen!
            window.location.href = "danke.html?typ=kiz";
        });
    }

});

