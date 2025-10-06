document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('pKontoForm');
    const storageKey = 'pKontoFormData_v1';

    // --- Logik zum Einblenden der Details ---
    const schreibenTypRadios = document.querySelectorAll('input[name="schreibenTyp"]');
    const detailsBescheinigung = document.getElementById('detailsBescheinigung');
    const ausstellerInput = document.getElementById('ausstellerBescheinigung');

    function toggleBescheinigungDetails() {
        const selectedType = document.querySelector('input[name="schreibenTyp"]:checked')?.value;
        if (selectedType === 'bescheinigung' || selectedType === 'beides') {
            detailsBescheinigung.style.display = 'block';
            ausstellerInput.required = true;
        } else {
            detailsBescheinigung.style.display = 'none';
            ausstellerInput.required = false;
        }
    }
    schreibenTypRadios.forEach(radio => radio.addEventListener('change', toggleBescheinigungDetails));
    toggleBescheinigungDetails(); // Initialer Aufruf

    // --- Speichern & Laden ---
    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt", "geburtsdatum",
            "bankName", "bankAdresse", "iban", "ausstellerBescheinigung"
        ];
        formElementIds.forEach(id => data[id] = document.getElementById(id).value);
        data.schreibenTyp = document.querySelector('input[name="schreibenTyp"]:checked')?.value;
        return data;
    }

    function populateForm(data) {
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt", "geburtsdatum",
            "bankName", "bankAdresse", "iban", "ausstellerBescheinigung"
        ];
        formElementIds.forEach(id => {
            if(document.getElementById(id) && data[id]) {
                document.getElementById(id).value = data[id];
            }
        });
        if (data.schreibenTyp) {
            document.querySelector(`input[name="schreibenTyp"][value="${data.schreibenTyp}"]`).checked = true;
        }
        toggleBescheinigungDetails();
    }

    document.getElementById('saveBtnPKonto').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnPKonto').addEventListener('click', () => {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            populateForm(JSON.parse(savedData));
            alert('Gespeicherte Daten wurden geladen!');
        } else {
            alert('Keine Daten gefunden.');
        }
    });

    // --- PDF-Erstellung ---
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!form.checkValidity()) {
            alert("Bitte füllen Sie alle erforderlichen Felder aus.");
            form.reportValidity();
            return;
        }
        localStorage.setItem('pendingPaymentData-pkonto', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=pkonto";
    });
});