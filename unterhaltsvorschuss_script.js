document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('unterhaltsvorschussForm');
    const storageKey = 'unterhaltsvorschussFormData_v1';

    // --- Logik für dynamische Felder ---
    const adresseRadios = document.querySelectorAll('input[name="adresseBekannt"]');
    const detailsAdresse = document.getElementById('detailsAdresse');
    const adresseTextarea = document.getElementById('andererElternteilAdresse');

    function toggleAdresseDetails() {
        const selected = document.querySelector('input[name="adresseBekannt"]:checked')?.value;
        if (selected === 'ja') {
            detailsAdresse.style.display = 'block';
            adresseTextarea.required = true;
        } else {
            detailsAdresse.style.display = 'none';
            adresseTextarea.required = false;
        }
    }
    adresseRadios.forEach(radio => radio.addEventListener('change', toggleAdresseDetails));
    toggleAdresseDetails();

    // --- Speichern & Laden ---
    function getFormData() {
        const data = {};
        const ids = [
            "personName", "personAdresse", "personPlzOrt", "geburtsdatum",
            "kind1Name", "kind1Geburtsdatum", "kind2Name", "kind2Geburtsdatum",
            "andererElternteilName", "andererElternteilAdresse",
            "behoerdeName", "behoerdeAdresse"
        ];
        ids.forEach(id => data[id] = document.getElementById(id).value);
        data.adresseBekannt = document.querySelector('input[name="adresseBekannt"]:checked')?.value;
        return data;
    }

    function populateForm(data) {
        const ids = [
            "personName", "personAdresse", "personPlzOrt", "geburtsdatum",
            "kind1Name", "kind1Geburtsdatum", "kind2Name", "kind2Geburtsdatum",
            "andererElternteilName", "andererElternteilAdresse",
            "behoerdeName", "behoerdeAdresse"
        ];
        ids.forEach(id => {
            if(document.getElementById(id) && data[id]) document.getElementById(id).value = data[id];
        });
        if (data.adresseBekannt) {
            document.querySelector(`input[name="adresseBekannt"][value="${data.adresseBekannt}"]`).checked = true;
        }
        toggleAdresseDetails();
    }

    document.getElementById('saveBtnUHV').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnUHV').addEventListener('click', () => {
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
        localStorage.setItem('pendingPaymentData-unterhaltsvorschuss', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=unterhaltsvorschuss";
    });
});