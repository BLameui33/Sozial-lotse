document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('kuendigungForm');
    const storageKey = 'kuendigungFormData_v1';

    // --- Logik für dynamische Felder ---
    const artRadios = document.querySelectorAll('input[name="kuendigungArt"]');
    const detailsDatum = document.getElementById('detailsDatum');
    const detailsSonder = document.getElementById('detailsSonder');
    const datumInput = document.getElementById('kuendigungZumDatum');
    const sonderGrundInput = document.getElementById('sonderkuendigungGrund');

    function toggleDetails() {
        const selected = document.querySelector('input[name="kuendigungArt"]:checked').value;
        detailsDatum.style.display = selected === 'datum' ? 'block' : 'none';
        datumInput.required = selected === 'datum';
        detailsSonder.style.display = selected === 'sonder' ? 'block' : 'none';
        sonderGrundInput.required = selected === 'sonder';
    }
    artRadios.forEach(radio => radio.addEventListener('change', toggleDetails));
    toggleDetails(); // Initialer Aufruf

    // --- Speichern & Laden ---
    function getFormData() {
        const data = {};
        const ids = ["personName", "personAdresse", "personPlzOrt", "anbieterName", "anbieterAdresse", "vertragsbezeichnung", "kundennummer", "kuendigungZumDatum", "sonderkuendigungGrund"];
        ids.forEach(id => data[id] = document.getElementById(id).value);
        
        data.kuendigungArt = document.querySelector('input[name="kuendigungArt"]:checked').value;
        data.widerrufEinzugsermaechtigung = document.getElementById('widerrufEinzugsermaechtigung').checked;
        data.keineWerbung = document.getElementById('keineWerbung').checked;
        return data;
    }

    function populateForm(data) {
        const ids = ["personName", "personAdresse", "personPlzOrt", "anbieterName", "anbieterAdresse", "vertragsbezeichnung", "kundennummer", "kuendigungZumDatum", "sonderkuendigungGrund"];
        ids.forEach(id => {
            if(document.getElementById(id) && data[id]) document.getElementById(id).value = data[id];
        });
        
        if (data.kuendigungArt) document.querySelector(`input[name="kuendigungArt"][value="${data.kuendigungArt}"]`).checked = true;
        if (data.widerrufEinzugsermaechtigung !== undefined) document.getElementById('widerrufEinzugsermaechtigung').checked = data.widerrufEinzugsermaechtigung;
        if (data.keineWerbung !== undefined) document.getElementById('keineWerbung').checked = data.keineWerbung;
        toggleDetails();
    }

    document.getElementById('saveBtnKuendigung').addEventListener('click', () => {
        localStorage.setItem(storageKey, JSON.stringify(getFormData()));
        alert('Ihre Eingaben wurden gespeichert!');
    });

    document.getElementById('loadBtnKuendigung').addEventListener('click', () => {
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
        localStorage.setItem('pendingPaymentData-kuendigung', JSON.stringify(getFormData()));
        window.location.href = "danke.html?typ=kuendigung";
    });
});