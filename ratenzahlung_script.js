document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('ratenzahlungForm');
    const saveBtn = document.getElementById('saveBtnRatenzahlung');
    const loadBtn = document.getElementById('loadBtnRatenzahlung');
    const storageKey = 'ratenzahlungFormData_v1';
    
    // --- Logik für Angebots-Typ (Ratenzahlung vs. Vergleich) ---
    const angebotRadioButtons = document.querySelectorAll('input[name="angebotTyp"]');
    const detailsRatenzahlung = document.getElementById('detailsRatenzahlung');
    const detailsVergleich = document.getElementById('detailsVergleich');

    function toggleAngebotDetails() {
        const selectedType = document.querySelector('input[name="angebotTyp"]:checked')?.value;
        detailsRatenzahlung.style.display = selectedType === 'ratenzahlung' ? 'block' : 'none';
        detailsVergleich.style.display = selectedType === 'vergleich' ? 'block' : 'none';
    }
    angebotRadioButtons.forEach(radio => radio.addEventListener('change', toggleAngebotDetails));
    toggleAngebotDetails(); // Initialer Aufruf

    // --- Logik für Haushaltsrechner ---
    const calculateBtn = document.getElementById('calculateBtn');
    const ergebnisContainer = document.getElementById('ergebnis-container');
    const verfuegbarerBetragSpan = document.getElementById('verfuegbarerBetrag');
    
    calculateBtn.addEventListener('click', () => {
        let einnahmen = 0;
        document.querySelectorAll('.einnahme').forEach(input => {
            einnahmen += parseFloat(input.value) || 0;
        });
        
        let ausgaben = 0;
        document.querySelectorAll('.ausgabe').forEach(input => {
            ausgaben += parseFloat(input.value) || 0;
        });

        const verfuegbar = einnahmen - ausgaben;
        verfuegbarerBetragSpan.textContent = verfuegbar.toFixed(2);
        ergebnisContainer.style.display = 'block';
    });


    // --- Formular-Daten sammeln, speichern & laden ---
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "personAdresse", "personPlz", "personOrt",
            "empfaengerName", "empfaengerAdresse", "aktenzeichen", "forderungshoehe",
            "einkommenNetto", "einkommenZusatz", "miete", "strom", "versicherungen",
            "lebenshaltung", "weitereKredite", "wunschrate", "vergleichsbetrag"
        ];
        formElementIds.forEach(id => data[id] = document.getElementById(id).value);
        data.angebotTyp = document.querySelector('input[name="angebotTyp"]:checked')?.value;
        return data;
    }

    function populateForm(data) {
        const formElementIds = [
            "personName", "personAdresse", "personPlz", "personOrt",
            "empfaengerName", "empfaengerAdresse", "aktenzeichen", "forderungshoehe",
            "einkommenNetto", "einkommenZusatz", "miete", "strom", "versicherungen",
            "lebenshaltung", "weitereKredite", "wunschrate", "vergleichsbetrag"
        ];
        formElementIds.forEach(id => {
            if(document.getElementById(id) && data[id]) document.getElementById(id).value = data[id];
        });
        if (data.angebotTyp) {
            document.querySelector(`input[name="angebotTyp"][value="${data.angebotTyp}"]`).checked = true;
        }
        toggleAngebotDetails();
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            localStorage.setItem(storageKey, JSON.stringify(getFormData()));
            alert('Ihre Eingaben wurden gespeichert!');
        });
    }

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                populateForm(JSON.parse(savedData));
                alert('Gespeicherte Daten wurden geladen!');
            } else {
                alert('Keine Daten gefunden.');
            }
        });
    }

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            if (!form.checkValidity()) {
                alert("Bitte füllen Sie alle erforderlichen Felder aus.");
                form.reportValidity();
                return;
            }
            localStorage.setItem('pendingPaymentData-ratenzahlung', JSON.stringify(getFormData()));
            window.location.href = "danke.html?typ=ratenzahlung";
        });
    }
});