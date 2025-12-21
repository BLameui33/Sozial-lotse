document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('aufenthalt-form');
    const resultDiv = document.getElementById('check_ergebnis');
    const btnBerechnen = document.getElementById('btn_berechnen');
    
    // Tab-Umschaltung
    const tabs = document.querySelectorAll('input[name="check_modus"]');
    tabs.forEach(tab => {
        tab.addEventListener('change', function() {
            document.getElementById('group_reminder').style.display = (this.value === 'reminder') ? 'block' : 'none';
            document.getElementById('group_fiktion').style.display = (this.value === 'fiktion') ? 'block' : 'none';
            document.getElementById('group_kurs').style.display = (this.value === 'kurs') ? 'block' : 'none';
            resultDiv.innerHTML = ''; // Ergebnis löschen bei Tab-Wechsel
        });
    });

    btnBerechnen.addEventListener('click', function() {
        const modus = document.querySelector('input[name="check_modus"]:checked').value;
        let html = '';

        if (modus === 'reminder') {
            html = berechneReminder();
        } else if (modus === 'fiktion') {
            html = berechneFiktion();
        } else if (modus === 'kurs') {
            html = berechneKurs();
        }

        resultDiv.innerHTML = html;
        resultDiv.scrollIntoView({ behavior: 'smooth' });
    });

    function berechneReminder() {
        const art = document.getElementById('titel_art').value;
        const datumVal = document.getElementById('titel_datum').value;

        if (!datumVal) return '<p class="error">Bitte geben Sie ein Datum ein.</p>';

        const ablauf = new Date(datumVal);
        const heute = new Date();
        const diffZeit = ablauf - heute;
        const diffTage = Math.ceil(diffZeit / (1000 * 60 * 60 * 24));

        let statusClass = 'status-green';
        if (diffTage < 30) statusClass = 'status-red';
        else if (diffTage < 90) statusClass = 'status-yellow';

        let checkliste = `
            <ul class="checklist">
                <li>Gültigen Pass prüfen</li>
                <li>Aktuelles biometrisches Passfoto besorgen</li>
                <li>Termin bei der Ausländerbehörde buchen (online/Telefon)</li>
                <li>Aktuelle Einkommensnachweise (Lohnabrechnungen) bereitlegen</li>
            </ul>`;
        
        if (art === 'blauekarte') {
            checkliste += `<p><strong>Hinweis Blaue Karte:</strong> Prüfen Sie, ob ein Arbeitgeberwechsel stattgefunden hat (Meldepflicht!).</p>`;
        }
        if (art === 'duldung') {
            checkliste += `<p><strong>Hinweis Duldung:</strong> Achten Sie auf die Passbeschaffungspflicht, um Sanktionen zu vermeiden.</p>`;
        }

        return `
            <div class="result-card ${statusClass}">
                <h3>Ergebnis: Titel-Reminder</h3>
                <p>Ihr Titel läuft in <strong>${diffTage} Tagen</strong> ab.</p>
                <h4>Checkliste zur Vorbereitung:</h4>
                ${checkliste}
                <p><small>Empfehlung: Spätestens 8 Wochen vor Ablauf den Antrag stellen.</small></p>
            </div>`;
    }

    function berechneFiktion() {
        const antrag = document.getElementById('fiktion_antrag').value;
        const monate = parseInt(document.getElementById('fiktion_monate').value);

        if (antrag === 'ja') {
            return `
                <div class="result-card status-green">
                    <h3>Status: Fiktionswirkung wahrscheinlich</h3>
                    <p>Da der Antrag rechtzeitig gestellt wurde, gilt Ihr Aufenthalt im Regelfall als fortbestehend (§ 81 Abs. 4 AufenthG).</p>
                    <p><strong>Nächste Schritte:</strong></p>
                    <ul>
                        <li>Bestätigung der Antragstellung immer mitführen</li>
                        <li>Auf Post von der Behörde warten</li>
                        <li>Bei Auslandsreisen prüfen, ob eine "echte" Fiktionsbescheinigung (nach Abs. 4) vorliegt</li>
                    </ul>
                </div>`;
        } else {
            return `
                <div class="result-card status-red">
                    <h3>Status: Kritisch (Illegalität droht)</h3>
                    <p>Wenn der Antrag erst nach Ablauf gestellt wird, tritt die Fiktionswirkung nicht automatisch ein. Ihr Aufenthalt könnte aktuell unrechtmäßig sein.</p>
                    <p><strong>Dringende Schritte:</strong></p>
                    <ul>
                        <li>Sofort Kontakt zur Ausländerbehörde aufnehmen</li>
                        <li>Eine Migrationsberatungsstelle (MBE) oder einen Anwalt für Migrationsrecht aufsuchen</li>
                        <li>Antrag auf "Wiedereinsetzung in den vorigen Stand" prüfen lassen</li>
                    </ul>
                </div>`;
        }
    }

    function berechneKurs() {
        const status = document.getElementById('kurs_status').value;
        const leistungen = document.getElementById('kurs_leistungen').value;

        let claim = "Prüfung erforderlich";
        let text = "";

        if (status === 'neu') {
            claim = "Anspruch wahrscheinlich (Pflicht)";
            text = "Als Neuzuwanderer mit Aufenthaltserlaubnis haben Sie meist einen gesetzlichen Anspruch (oder die Verpflichtung).";
        } else if (leistungen === 'ja') {
            claim = "Kostenbefreiung möglich";
            text = "Wer Sozialleistungen bezieht, kann vom BAMF von den Kurskosten (2,29€/Stunde) befreit werden.";
        } else {
            claim = "Zulassung auf Antrag";
            text = "Sie können einen Antrag auf Zulassung beim BAMF stellen, sind aber evtl. Selbstzahler.";
        }

        return `
            <div class="result-card status-yellow">
                <h3>Orientierung: Integrationskurs</h3>
                <p><strong>Status: ${claim}</strong></p>
                <p>${text}</p>
                <p><strong>Nächste Schritte:</strong></p>
                <a href="https://www.bamf.de/DE/Service/ServiceCenter/Beratung/beratung-node.html" target="_blank" class="button">BAMF Beratungsstelle finden</a>
            </div>`;
    }
});