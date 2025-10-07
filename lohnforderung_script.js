document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('lohnforderungForm');
    const storageKey = 'lohnforderungFormData_v1';

    // Kontoinhaber automatisch mit Namen vorbefüllen
    const personNameInput = document.getElementById('personName');
    const kontoinhaberInput = document.getElementById('kontoinhaber');
    personNameInput.addEventListener('input', () => {
        kontoinhaberInput.value = personNameInput.value;
    });

    function getFormData() {
        const data = {};
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt", "personalnummer",
            "arbeitgeberName", "arbeitgeberAdresse", "zeitraum", "offenerBetrag",
            "zahlungsfrist", "kontoinhaber", "iban", "bic"
        ];
        formElementIds.forEach(id => data[id] = document.getElementById(id).value);
        return data;
    }

    function populateForm(data) {
        const formElementIds = [
            "personName", "personAdresse", "personPlzOrt", "personalnummer",
            "arbeitgeberName", "arbeitgeberAdresse", "zeitraum", "offenerBetrag",
            "zahlungsfrist", "kontoinhaber", "iban", "bic"
        ];
        formElementIds.forEach(id => {
            if(document.getElementById(id) && data[id]) {
                document.getElementById(id).value = data[id];
            }
        });
    }

    document.getElementById('saveBtnLohn').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnLohn').addEventListener('click', () => {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            populateForm(JSON.parse(savedData));
            alert('Gespeicherte Daten wurden geladen!');
        } else {
            alert('Keine Daten gefunden.');
        }
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        if (!form.checkValidity()) {
            alert("Bitte füllen Sie alle erforderlichen Felder aus.");
            form.reportValidity();
            return;
        }
        localStorage.setItem('pendingPaymentData-lohnforderung', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=lohnforderung";
    });
});