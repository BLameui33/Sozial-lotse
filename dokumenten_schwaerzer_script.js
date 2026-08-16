    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    const fileUploader = document.getElementById('fileUploader');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    
    const placeholderText = document.getElementById('placeholderText');
    const canvas = document.getElementById('redactionCanvas');
    const ctx = canvas.getContext('2d');

    const paginationControls = document.getElementById('paginationControls');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageNumDisplay = document.getElementById('pageNum');
    const pageCountDisplay = document.getElementById('pageCount');

    // State Variables
    let pdfDoc = null;
    let pageNum = 1;
    let isImageMode = false;
    
    // Gedächtnis für alle Seiten
    let pdfPageCache = {};      // Speichert die unberührten Seiten als Bilder für schnelleres Blättern
    let pagesRectangles = {};   // { 1: [{x, y, w, h}], 2: [] } -> Balken pro Seite
    let currentRectangles = []; // Balken der aktuell sichtbaren Seite

    // Zeichen Variablen
    let baseImage = null;
    let isDrawing = false;
    let startX = 0, startY = 0;
    let currentRect = null;
    const currentScale = 2.5; // Hohe Auflösung für Retina/Druck

    // --- 1. DATEI UPLOAD ---
    fileUploader.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        placeholderText.style.display = 'none';
        canvas.style.display = 'block';
        exportPdfBtn.disabled = false;
        
        // Zurücksetzen der Variablen
        pdfPageCache = {};
        pagesRectangles = {};
        currentRectangles = [];
        updateButtons();

        const fileReader = new FileReader();

        if (file.type === 'application/pdf') {
            isImageMode = false;
            fileReader.onload = function(evt) {
                const typedarray = new Uint8Array(evt.target.result);
                pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                    pdfDoc = pdf;
                    pageCountDisplay.textContent = pdfDoc.numPages;
                    paginationControls.style.display = pdfDoc.numPages > 1 ? 'flex' : 'none';
                    pageNum = 1;
                    renderPage(pageNum);
                });
            };
            fileReader.readAsArrayBuffer(file);
        } else if (file.type.startsWith('image/')) {
            isImageMode = true;
            paginationControls.style.display = 'none';
            fileReader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    baseImage = img;
                    canvas.width = img.width;
                    canvas.height = img.height;
                    redrawCanvas();
                };
                img.src = evt.target.result;
            };
            fileReader.readAsDataURL(file);
        }
    });

    // --- 2. SEITEN RENDERN & BLÄTTERN ---
    async function renderPage(num) {
        // Lade Balken aus dem Gedächtnis
        currentRectangles = pagesRectangles[num] || [];

        // Prüfe ob die rohe PDF Seite schon im Cache ist
        if (pdfPageCache[num]) {
            baseImage = pdfPageCache[num];
            canvas.width = baseImage.width;
            canvas.height = baseImage.height;
            redrawCanvas();
            pageNumDisplay.textContent = num;
            updateButtons();
            return;
        }

        // Ansonsten aus dem PDF extrahieren
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: currentScale });
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        await page.render({ canvasContext: tempCtx, viewport: viewport }).promise;

        const img = new Image();
        img.onload = function() {
            pdfPageCache[num] = img;
            baseImage = img;
            canvas.width = img.width;
            canvas.height = img.height;
            redrawCanvas();
            updateButtons();
        };
        img.src = tempCanvas.toDataURL('image/jpeg', 1.0);
        
        pageNumDisplay.textContent = num;
    }

    prevPageBtn.addEventListener('click', () => {
        if (pageNum <= 1) return;
        pagesRectangles[pageNum] = [...currentRectangles]; // Speichern bevor geblättert wird
        pageNum--;
        renderPage(pageNum);
    });

    nextPageBtn.addEventListener('click', () => {
        if (pageNum >= pdfDoc.numPages) return;
        pagesRectangles[pageNum] = [...currentRectangles]; // Speichern bevor geblättert wird
        pageNum++;
        renderPage(pageNum);
    });


    // --- 3. ZEICHNEN (SCHWÄRZEN) ---
    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX = evt.clientX;
        let clientY = evt.clientY;

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
        e.preventDefault();
        isDrawing = true;
        const pos = getMousePos(e);
        startX = pos.x;
        startY = pos.y;
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getMousePos(e);
        currentRect = { x: startX, y: startY, w: pos.x - startX, h: pos.y - startY };
        redrawCanvas();
    }

    function stopDrawing(e) {
        if (!isDrawing) return;
        e.preventDefault();
        isDrawing = false;
        
        // Nur wenn das Rechteck nicht zu klein ist speichern
        if (currentRect && Math.abs(currentRect.w) > 5 && Math.abs(currentRect.h) > 5) {
            currentRectangles.push(currentRect);
        }
        currentRect = null;
        redrawCanvas();
        updateButtons();
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    window.addEventListener('touchend', stopDrawing);


    // --- 4. CANVAS UPDATES ---
    function redrawCanvas() {
        if (!baseImage) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000000';
        currentRectangles.forEach(rect => {
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        });

        // Vorschau des aktuellen Balkens während des Ziehens
        if (currentRect) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h);
        }
    }

    function updateButtons() {
        const hasRects = currentRectangles.length > 0;
        undoBtn.disabled = !hasRects;
        clearBtn.disabled = !hasRects;
    }

    undoBtn.addEventListener('click', () => {
        currentRectangles.pop();
        redrawCanvas();
        updateButtons();
    });

    clearBtn.addEventListener('click', () => {
        currentRectangles = [];
        redrawCanvas();
        updateButtons();
    });


    // --- 5. EXPORT ALS SICHERES MEHRSEITEN-A4-PDF ---
    function addImageToPdf(pdf, imgData, cWidth, cHeight) {
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasRatio = cWidth / cHeight;
        const pdfRatio = pdfWidth / pdfHeight;
        
        let finalWidth = pdfWidth;
        let finalHeight = pdfHeight;
        
        if (canvasRatio > pdfRatio) {
            finalHeight = pdfWidth / canvasRatio;
        } else {
            finalWidth = pdfHeight * canvasRatio;
        }
        
        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
    }

    exportPdfBtn.addEventListener('click', async () => {
        if (!baseImage) return;

        // Sichere den aktuellen Stand der Seite ins Gedächtnis
        if (!isImageMode) {
            pagesRectangles[pageNum] = [...currentRectangles];
        }

        const originalText = exportPdfBtn.innerHTML;
        exportPdfBtn.innerHTML = "⏳ PDF wird generiert... Bitte warten.";
        exportPdfBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            let pdf = null;

            if (isImageMode) {
                // Einzelnes Bild exportieren
                const isLandscape = canvas.width > canvas.height;
                pdf = new jsPDF({ orientation: isLandscape ? 'l' : 'p', unit: 'mm', format: 'a4' });
                
                // Rechtecke ins Bild brennen
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                addImageToPdf(pdf, imgData, canvas.width, canvas.height);

            } else {
                // Alle Seiten des PDFs durchgehen
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    let rects = pagesRectangles[i] || [];
                    let tempC = document.createElement('canvas');
                    let tCtx = tempC.getContext('2d');

                    if (pdfPageCache[i]) {
                        tempC.width = pdfPageCache[i].width;
                        tempC.height = pdfPageCache[i].height;
                        tCtx.drawImage(pdfPageCache[i], 0, 0);
                    } else {
                        // Falls die Seite noch nie angesehen wurde, im Hintergrund rendern
                        const page = await pdfDoc.getPage(i);
                        const viewport = page.getViewport({ scale: currentScale });
                        tempC.width = viewport.width;
                        tempC.height = viewport.height;
                        await page.render({ canvasContext: tCtx, viewport: viewport }).promise;
                    }

                    // Alle Balken für diese Seite auf das Canvas brennen
                    if (rects.length > 0) {
                        tCtx.fillStyle = '#000000';
                        rects.forEach(r => tCtx.fillRect(r.x, r.y, r.w, r.h));
                    }

                    const imgData = tempC.toDataURL('image/jpeg', 1.0);
                    const isLandscape = tempC.width > tempC.height;

                    if (i === 1) {
                        pdf = new jsPDF({ orientation: isLandscape ? 'l' : 'p', unit: 'mm', format: 'a4' });
                    } else {
                        pdf.addPage('a4', isLandscape ? 'l' : 'p');
                    }

                    addImageToPdf(pdf, imgData, tempC.width, tempC.height);
                }
            }
            
            pdf.save('geschwaerztes_dokument_sicher.pdf');

        } catch (error) {
            console.error(error);
            alert("Fehler beim Erstellen der PDF.");
        } finally {
            exportPdfBtn.innerHTML = originalText;
            exportPdfBtn.disabled = false;
        }
    });

