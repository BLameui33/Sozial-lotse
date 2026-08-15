/**
 * Dokumenten-Schwärzer Script (Sozial-Lotse / Mieter-Lotse / Kassen-Lotse)
 * Autor: Lotse-Redaktion
 * Funktion: Lädt Bilder/PDFs in ein Canvas, lässt Nutzer schwarze Balken zeichnen und exportiert ein flaches (sicheres) PDF.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Initialisierung & Variablen ---
    const fileUploader = document.getElementById('fileUploader');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    
    const workspace = document.getElementById('workspace');
    const placeholderText = document.getElementById('placeholderText');
    const canvas = document.getElementById('redactionCanvas');
    const ctx = canvas.getContext('2d');

    // PDF.js Worker konfigurieren (Wichtig für das Laden von PDFs)
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    let baseImage = null; // Speichert das hochgeladene Originalbild
    let rectangles = []; // Speichert alle gezeichneten schwarzen Balken
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let currentRect = null;

    // --- 2. Datei-Upload verarbeiten (Bild oder PDF) ---
    fileUploader.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        rectangles = []; // Balken zurücksetzen
        updateButtons();
        placeholderText.style.display = 'none';
        canvas.style.display = 'block';

        if (file.type === 'application/pdf') {
            await loadPdf(file);
        } else if (file.type.startsWith('image/')) {
            loadImage(file);
        } else {
            alert('Bitte nur Bilder (JPG, PNG) oder PDF-Dateien hochladen.');
            resetWorkspace();
        }
    });

    // Hilfsfunktion: Bild laden
    function loadImage(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                initCanvasWithImage(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Hilfsfunktion: PDF laden (Wir laden hier für das Tool die erste Seite)
    async function loadPdf(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            if (pdf.numPages > 1) {
                alert("Hinweis: Ihr PDF hat mehrere Seiten. Das Tool verarbeitet zur Sicherheit aktuell die erste Seite. Bitte laden Sie Seiten bei Bedarf einzeln hoch.");
            }

            const page = await pdf.getPage(1);
            
            // Hohe Auflösung für gutes Lesen/Exportieren
            const scale = 2.0; 
            const viewport = page.getViewport({ scale: scale });

            // Temporäres Canvas für das PDF-Rendering
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;

            const renderContext = {
                canvasContext: tempCtx,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Das PDF als Bild (DataURL) an die Canvas übergeben
            const img = new Image();
            img.onload = function() {
                initCanvasWithImage(img);
            };
            img.src = tempCanvas.toDataURL('image/jpeg', 0.95);

        } catch (error) {
            console.error("Fehler beim PDF-Laden:", error);
            alert("Das PDF konnte nicht geladen werden. Möglicherweise ist es passwortgeschützt.");
            resetWorkspace();
        }
    }

    // Canvas-Größe anpassen und Originalbild zeichnen
    function initCanvasWithImage(img) {
        baseImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Export-Button aktivieren
        exportPdfBtn.disabled = false;
        
        redrawCanvas();
    }

    // Setzt das Tool zurück
    function resetWorkspace() {
        placeholderText.style.display = 'block';
        canvas.style.display = 'none';
        fileUploader.value = '';
        exportPdfBtn.disabled = true;
    }


    // --- 3. Zeichen-Logik (Schwärzen) ---

    // Maus-Position relativ zur tatsächlichen (skalierten) Canvas-Größe berechnen
    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = evt.clientX;
        let clientY = evt.clientY;

        // Touch-Support
        if (evt.touches && evt.touches.length > 0) {
            clientX = evt.touches[0].clientX;
            clientY = evt.touches[0].clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e) {
        if (!baseImage) return;
        e.preventDefault(); // Verhindert Scrollen beim Wischen auf Touchscreens
        isDrawing = true;
        const pos = getMousePos(e);
        startX = pos.x;
        startY = pos.y;
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getMousePos(e);
        
        currentRect = {
            x: startX,
            y: startY,
            w: pos.x - startX,
            h: pos.y - startY
        };
        
        redrawCanvas();
    }

    function stopDrawing(e) {
        if (!isDrawing) return;
        e.preventDefault();
        isDrawing = false;
        
        if (currentRect && Math.abs(currentRect.w) > 5 && Math.abs(currentRect.h) > 5) {
            rectangles.push(currentRect);
        }
        currentRect = null;
        redrawCanvas();
        updateButtons();
    }

    // Event-Listener für Maus
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    // Event-Listener für Touch (Smartphones)
    canvas.addEventListener('touchstart', startDrawing, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    window.addEventListener('touchend', stopDrawing);


    // --- 4. Canvas Neuzeichnen & UI Updates ---

    function redrawCanvas() {
        if (!baseImage) return;

        // 1. Originalbild zeichnen
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

        // 2. Alle gespeicherten Balken zeichnen
        ctx.fillStyle = '#000000'; // Farbe: Schwarz
        rectangles.forEach(rect => {
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        });

        // 3. Den aktuell gezeichneten Balken (Vorschau) zeichnen
        if (currentRect) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Leicht transparent beim Aufziehen
            ctx.fillRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
        }
    }

    function updateButtons() {
        const hasRects = rectangles.length > 0;
        undoBtn.disabled = !hasRects;
        clearBtn.disabled = !hasRects;
    }

    undoBtn.addEventListener('click', () => {
        rectangles.pop();
        redrawCanvas();
        updateButtons();
    });

    clearBtn.addEventListener('click', () => {
        rectangles = [];
        redrawCanvas();
        updateButtons();
    });


    // --- 5. Sicherer PDF-Export (Das "Backen") ---
    exportPdfBtn.addEventListener('click', () => {
        if (!baseImage) return;
        
        // Wir nehmen das fertig gezeichnete Canvas (Bild + Balken = Flache Ebene!)
        const flatImageData = canvas.toDataURL('image/jpeg', 0.95);
        
        const { jsPDF } = window.jspdf;
        
        // Ausrichtung berechnen (Hochformat oder Querformat)
        const isLandscape = canvas.width > canvas.height;
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        // Das Bild genau in das PDF einpassen
        pdf.addImage(flatImageData, 'JPEG', 0, 0, canvas.width, canvas.height);
        
        // PDF herunterladen
        pdf.save('geschwaerztes_dokument_sicher.pdf');
    });

});
