document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formKlageAsyl');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const getFormData = () => ({
                personName: document.getElementById('personName').value,
                geburtsdatum: document.getElementById('geburtsdatum').value,
                staatsangehoerigkeit: document.getElementById('staatsangehoerigkeit').value,
                personAdresse: document.getElementById('personAdresse').value,
                bescheidDatum: document.getElementById('bescheidDatum').value,
                bamfAktenzeichen: document.getElementById('bamfAktenzeichen').value,
                gerichtName: document.getElementById('gerichtName').value,
                gerichtAdresse: document.getElementById('gerichtAdresse').value,
            });

            const formData = getFormData();

            if (!formData.personName.trim() || !formData.geburtsdatum || !formData.personAdresse.trim() || !formData.bescheidDatum || !formData.bamfAktenzeichen.trim() || !formData.gerichtName.trim() || !formData.gerichtAdresse.trim()) {
                alert('Bitte füllen Sie alle Felder sorgfältig aus.');
                return;
            }

            localStorage.setItem('pendingPaymentData-klage-asyl', JSON.stringify(formData));
            window.location.href = "danke.html?typ=klage-asyl";
        });
    }
});