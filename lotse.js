// === DER KOMPLETTE HUB-ENTSCHEIDUNGSBAUM ===
const lotseBaum = {
    // SCHRITT 1: Die Haupt-Domains (Jetzt mit Icons!)
    start: {
        frage: "Wobei benötigen Sie heute Hilfe?",
        antworten: [
            { text: "Krankheit, Pflege & Rente", next: "hub_kassen", icon: "⚕️" },
            { text: "Bürgergeld, Soziales & Recht", next: "hub_sozial", icon: "§" },
            { text: "Miete & Wohnen", next: "hub_miete", icon: "🏠" }
        ]
    },

    // SCHRITT 2: KASSEN-LOTSE
    hub_kassen: {
        frage: "Um welches Thema geht es bei der Krankheits- oder Pflegekasse?",
        antworten: [
            { text: "Krankenkasse (Krankengeld, Zuzahlungen)", link: "https://kassen-lotse.de/krankenkasse.html" },
            { text: "Pflegekasse (Pflegegrad, Leistungen)", link: "https://kassen-lotse.de/pflegekasse.html" },
            { text: "Angehörige pflegen & Entlastung", link: "https://kassen-lotse.de/angehoerige-betreuung.html" },
            { text: "Rentenversicherung & Reha", link: "https://kassen-lotse.de/rentenversicherung.html" },
            { text: "Schwerbehinderung (Ausweis, GdB)", link: "https://kassen-lotse.de/schwerbehindertenrecht.html" },
            { text: "Arbeitsunfall & Unfallversicherung", link: "https://kassen-lotse.de/unfallversicherung.html" },
            { text: "Psychische Erkrankungen & Selbsthilfe", link: "https://kassen-lotse.de/psychische-erkrankungen.html" },
            { text: "Familie, Kinderkrankengeld & Mutterschutz", link: "https://kassen-lotse.de/familie-kind.html" }
        ]
    },

    // SCHRITT 2: SOZIAL-LOTSE
    hub_sozial: {
        frage: "Welches Thema im Sozial- oder Rechtsbereich betrifft Sie?",
        antworten: [
            { text: "Existenzsicherung (Bürgergeld, ALG 1, Sozialhilfe)", link: "https://sozialrecht-lotse.de/existenzsicherung.html" },
            { text: "Familie, Wohnen & Bildung (Kinderzuschlag, Wohngeld)", link: "https://sozialrecht-lotse.de/familie-wohnen-bildung.html" },
            { text: "Arbeit & Beruf (Kündigung, Lohn, Abmahnung)", link: "https://sozialrecht-lotse.de/arbeitsrecht.html" },
            { text: "Schulden & Finanzen (Inkasso, Mahnungen, P-Konto)", link: "https://sozialrecht-lotse.de/schulden-finanzen.html" },
            { text: "Verbraucherschutz & Betrug (Fakeshops, Widerruf)", link: "https://sozialrecht-lotse.de/verbraucherrecht-betrug.html" },
            { text: "Asyl & Aufenthalt", link: "https://sozialrecht-lotse.de/asyl.html" }
        ]
    },

    // SCHRITT 2: MIET-LOTSE
    hub_miete: {
        frage: "Wobei gibt es Ärger oder Fragen zur Wohnung?",
        antworten: [
            { text: "Mängel & Wohnalltag (Schimmel, Lärm, Mietminderung)", link: "https://mieter-lotse.de/maengel-wohnalltag.html" },
            { text: "Miete & Nebenkosten (Mieterhöhung, Kaution, Abrechnung)", link: "https://mieter-lotse.de/miete-nebenkosten.html" },
            { text: "Einzug, Auszug & Kündigung (Übergabe, Renovierung)", link: "https://mieter-lotse.de/einzug-auszug-kuendigung.html" },
            { text: "Erste Hilfe bei Mietschulden", link: "https://mieter-lotse.de/mietschulden-erste-hilfe.html" }
        ]
    }
};

// === DIE LOGIK ===
let verlauf = []; 
let aktuellerKnoten = 'start';

function zeigeLotsenSchritt(knotenId) {
    const knoten = lotseBaum[knotenId];
    if (!knoten) return;

    aktuellerKnoten = knotenId;
    
    const frageElement = document.getElementById('lotse-frage');
    const antwortenElement = document.getElementById('lotse-antworten');
    const zurueckButton = document.getElementById('lotse-zurueck');

    // Frage setzen
    frageElement.innerText = knoten.frage;
    antwortenElement.innerHTML = '';

    // Layout für Startseite anpassen (Grid-Klassen)
    if (knotenId === 'start') {
        antwortenElement.classList.add('is-start-grid');
    } else {
        antwortenElement.classList.remove('is-start-grid');
    }

    // Buttons generieren
    knoten.antworten.forEach(antwort => {
        const button = document.createElement('button');
        button.className = 'lotse-btn';
        
        // Wenn ein Icon definiert ist, fügen wir es ein
        if (antwort.icon) {
            button.innerHTML = `<span class="lotse-icon">${antwort.icon}</span> <span>${antwort.text}</span>`;
        } else {
            button.innerText = antwort.text;
        }
        
        button.onclick = function() {
            if (antwort.next) {
                verlauf.push(aktuellerKnoten);
                zeigeLotsenSchritt(antwort.next);
            } else if (antwort.link) {
                window.location.href = antwort.link;
            }
        };
        antwortenElement.appendChild(button);
    });

    // Zurück-Button anzeigen/verstecken
    if (verlauf.length > 0) {
        zurueckButton.style.display = 'inline-block';
    } else {
        zurueckButton.style.display = 'none';
    }
}

function lotseZurueck() {
    if (verlauf.length > 0) {
        const vorherigerKnoten = verlauf.pop();
        zeigeLotsenSchritt(vorherigerKnoten);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('lotse-container')) {
        zeigeLotsenSchritt('start');
    }
});