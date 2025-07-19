document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formUntaetigkeit');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const getFormData = () => ({
                personName: document.getElementById('personName').value,
                geburtsdatum: document.getElementById('geburtsdatum').value,
                personAdresse: document.getElementById('personAdresse').value,
                antragDatum: document.getElementById('antragDatum').value,
                antragArt: document.getElementById('antragArt').value,
                antragAktenzeichen: document.getElementById('antragAktenzeichen').value,
                verklagteBehoerdeName: document.getElementById('verklagteBehoerdeName').value,
                verklagteBehoerdeAdresse: document.getElementById('verklagteBehoerdeAdresse').value,
                gerichtName: document.getElementById('gerichtName').value,
                gerichtAdresse: document.getElementById('gerichtAdresse').value,
            });

            const formData = getFormData();

            if (!formData.personName.trim() || !formData.antragDatum || !formData.antragArt.trim() || !formData.verklagteBehoerdeName.trim() || !formData.gerichtName.trim()) {
                alert('Bitte füllen Sie alle erforderlichen Felder sorgfältig aus.');
                return;
            }

            // Prüfung der 3-Monats-Frist
            const antragDate = new Date(formData.antragDatum);
            const dreiMonateSpaeter = new Date(antragDate.setMonth(antragDate.getMonth() + 3));
            const heute = new Date();

            if (heute < dreiMonateSpaeter) {
                if (!confirm('Achtung: Seit Ihrem Antrag sind noch keine drei Monate vergangen. Eine Untätigkeitsklage könnte zu früh sein und vom Gericht abgewiesen werden. Möchten Sie trotzdem fortfahren?')) {
                    return;
                }
            }

            localStorage.setItem('pendingPaymentData-untaetigkeitsklage', JSON.stringify(formData));
            window.location.href = "danke.html?typ=untaetigkeitsklage";
        });
    }
});