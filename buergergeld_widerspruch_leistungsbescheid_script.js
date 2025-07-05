// ====================================================================================
// HINWEIS: Die globalen Hilfsfunktionen und die generateBuergergeldWiderspruchPDF()-
// Funktion wurden entfernt und gehören jetzt in Ihre zentrale "pdf-generators.js"-Datei.
// ====================================================================================


// ====================================================================================
// START: DOMContentLoaded-Listener (für die Interaktivität der Seite)
// ====================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Alle Ihre bestehenden Elemente und Logik bleiben erhalten ---
    const form = document.getElementById('widerspruchBuergergeldForm');
    const saveBtn = document.getElementById('saveBtnBuergergeldWiderspruch');
    const loadBtn = document.getElementById('loadBtnBuergergeldWiderspruch');
    const storageKey = 'widerspruchBuergergeldFormData_v3';

    // =======================================================
    // START DER KORRIGIERTEN LOGIK ZUM EIN- UND AUSBLENDEN
    // =======================================================
    const hauptgrundRadioButtons = document.querySelectorAll('input[name="hauptgrundWiderspruch"]');
    
    // Eine Liste aller Detail-Sektionen, die wir steuern wollen
    const detailSections = {
        leistungshoehe: document.getElementById('detailsLeistungshoehe'),
        ablehnung: document.getElementById('detailsAblehnung'),
        formell: document.getElementById('detailsFormell')
    };

    function updateDetailSectionsVisibility() {
        // Finde den Wert des aktuell ausgewählten Radio-Buttons
        const selectedValue = document.querySelector('input[name="hauptgrundWiderspruch"]:checked')?.value;

        // 1. Zuerst alle Detail-Sektionen in unserer Liste verstecken
        for (const key in detailSections) {
            if (detailSections[key]) { // Prüfen, ob das Element existiert
                detailSections[key].style.display = 'none';
            }
        }
        
        // 2. Dann die eine passende Sektion anzeigen (falls es sie in unserer Liste gibt)
        if (selectedValue && detailSections[selectedValue]) {
            detailSections[selectedValue].style.display = 'block';
        }
    }

    // Füge den Event-Listener zu allen Radio-Buttons hinzu
    hauptgrundRadioButtons.forEach(radio => {
        radio.addEventListener('change', updateDetailSectionsVisibility);
    });

    // Führe die Funktion einmal beim Laden der Seite aus, um den korrekten Anfangszustand herzustellen
    updateDetailSectionsVisibility(); 
    
    // =======================================================
    // ENDE DER KORRIGIERTEN LOGIK
    // =======================================================


    // --- WICHTIG: Ihre getFormData() Funktion für diesen Generator bleibt exakt so wie sie ist! ---
    function getFormData() {
        const data = {};
        const formElementIds = ["bgBedarfsgemeinschaft", "bgVorname", "bgNachname", "anzahlPersonenWiderspruch", "bgStrasseNr", "bgPlz", "bgOrt", "bgTelefon", "bgEmail", "jcName", "jcStrasseNr", "jcPlz", "jcOrt", "bescheidDatum", "bescheidAktenzeichen", "bescheidBetreff", "begruendungRegelbedarf", "begruendungMehrbedarfe", "begruendungKdu", "begruendungEinkommen", "begruendungVermoegen", "begruendungAblehnung", "begruendungFormell", "ausfuehrlicheBegruendung", "antragImWiderspruch", "zusatzforderungText", "anlageSonstigesText"];
        formElementIds.forEach(id => {
            const element = document.getElementById(id);
            if(element) data[id] = element.value;
        });
        const checkboxIdsToSave = ["fehlerRegelbedarf", "fehlerMehrbedarfe", "fehlerKdu", "fehlerEinkommen", "fehlerVermoegen", "bitteUmAkteneinsicht"];
        checkboxIdsToSave.forEach(id => {
            const element = document.getElementById(id);
            if(element) data[id] = element.checked;
        });
        const hauptgrundRadios = document.querySelectorAll('input[name="hauptgrundWiderspruch"]');
        hauptgrundRadios.forEach(radio => {
            if (radio.checked) data.hauptgrundWiderspruch = radio.value;
        });
        const anlagenCheckboxName = "anlagen";
        data.anlagen = [];
        document.querySelectorAll(`input[name="${anlagenCheckboxName}"]:checked`).forEach(cb => data.anlagen.push(cb.value));
        return data;
    }

    // --- Ihre Speichern & Laden Logik bleibt unverändert ---
    function populateForm(data) {
        const formElementIds = ["bgBedarfsgemeinschaft", "bgVorname", "bgNachname", "anzahlPersonenWiderspruch", "bgStrasseNr", "bgPlz", "bgOrt", "bgTelefon", "bgEmail", "jcName", "jcStrasseNr", "jcPlz", "jcOrt", "bescheidDatum", "bescheidAktenzeichen", "bescheidBetreff", "begruendungRegelbedarf", "begruendungMehrbedarfe", "begruendungKdu", "begruendungEinkommen", "begruendungVermoegen", "begruendungAblehnung", "begruendungFormell", "ausfuehrlicheBegruendung", "antragImWiderspruch", "zusatzforderungText", "anlageSonstigesText"];
        formElementIds.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.value = data[id]; } });
        const checkboxIdsToSave = ["fehlerRegelbedarf", "fehlerMehrbedarfe", "fehlerKdu", "fehlerEinkommen", "fehlerVermoegen", "bitteUmAkteneinsicht"];
        checkboxIdsToSave.forEach(id => { const element = document.getElementById(id); if (element && data[id] !== undefined) { element.checked = data[id]; } });
        const hauptgrundRadios = document.querySelectorAll('input[name="hauptgrundWiderspruch"]');
        hauptgrundRadios.forEach(radio => { if (radio) { radio.checked = (data.hauptgrundWiderspruch && radio.value === data.hauptgrundWiderspruch); } });
        const anlagenCheckboxName = "anlagen";
        document.querySelectorAll(`input[name="${anlagenCheckboxName}"]:checked`).forEach(cb => { if (cb) cb.checked = !!(data.anlagen && data.anlagen.includes(cb.value)); });
        updateDetailSectionsVisibility();
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
    // START: PAYPAL-LOGIK
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
            localStorage.setItem('pendingPaymentData-buergergeld', JSON.stringify(formData));

            // 3. Zur Danke-Seite weiterleiten
            // WICHTIG: Den 'typ' an den Generator anpassen!
            window.location.href = "danke.html?typ=buergergeld";
        });
    }

});
