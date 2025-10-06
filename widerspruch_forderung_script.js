document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('widerspruchForderungForm');
    const saveBtn = document.getElementById('saveBtnForderung');
    const loadBtn = document.getElementById('loadBtnForderung');
    const storageKey = 'widerspruchForderungFormData_v1';

    function getFormData() {
        const data = {};
        // Text- und Datumsfelder
        const formElementIds = [
            "personName", "personAdresse", "personPlz", "personOrt",
            "empfaengerName", "empfaengerAdresse", "schreibenDatum",
            "aktenzeichen", "originalglaeubigerName", "textBestehtNicht"
        ];
        formElementIds.forEach(id => data[id] = document.getElementById(id).value);

        // Radio-Button für Empfängertyp
        data.empfaengerTyp = document.querySelector('input[name="empfaengerTyp"]:checked').value;

        // Checkboxen für Widerspruchsgründe
        data.widerspruchsgruende = [];
        document.querySelectorAll('input[name="widerspruchsgrund"]:checked').forEach(cb => {
            data.widerspruchsgruende.push(cb.value);
        });
        
        // Checkboxen für Zusatzforderungen
        data.zusatzforderungen = [];
        document.querySelectorAll('input[name="zusatzforderung"]:checked').forEach(cb => {
            data.zusatzforderungen.push(cb.value);
        });

        return data;
    }

    function populateForm(data) {
        // Text- und Datumsfelder
        const formElementIds = [
            "personName", "personAdresse", "personPlz", "personOrt",
            "empfaengerName", "empfaengerAdresse", "schreibenDatum",
            "aktenzeichen", "originalglaeubigerName", "textBestehtNicht"
        ];
        formElementIds.forEach(id => {
            if(document.getElementById(id) && data[id]) document.getElementById(id).value = data[id];
        });

        // Radio-Button
        if (data.empfaengerTyp) {
            document.querySelector(`input[name="empfaengerTyp"][value="${data.empfaengerTyp}"]`).checked = true;
        }

        // Checkboxen
        if (data.widerspruchsgruende) {
            document.querySelectorAll('input[name="widerspruchsgrund"]').forEach(cb => {
                cb.checked = data.widerspruchsgruende.includes(cb.value);
            });
        }
        if (data.zusatzforderungen) {
            document.querySelectorAll('input[name="zusatzforderung"]').forEach(cb => {
                cb.checked = data.zusatzforderungen.includes(cb.value);
            });
        }
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
            const formData = getFormData();
            if (formData.widerspruchsgruende.length === 0) {
                alert("Bitte wählen Sie mindestens einen Grund für Ihren Widerspruch aus.");
                return;
            }
            localStorage.setItem('pendingPaymentData-forderung', JSON.stringify(formData));
            window.location.href = "danke.html?typ=forderung";
        });
    }
});