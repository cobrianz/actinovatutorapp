import jsPDF from "jspdf";
import mermaid from "mermaid";

export const COLORS = {
    primary: [30, 64, 175],          // Deep premium blue
    primaryLight: [238, 244, 255],   // Soft background tint
    accent: [99, 102, 255],          // Subtle purple accent
    text: [17, 24, 39],              // Rich black for readability
    textLight: [75, 85, 99],         // Soft gray
    divider: [229, 231, 235],
    success: [34, 197, 94],
};

export const MARGIN = 25;
export const LINE_HEIGHT_RATIO = 1.8;
export const PARAGRAPH_GAP = 8;
export const SECTION_GAP = 16;

export const saveAndSharePDF = async (pdf, fileName, logTitle, notificationBody, logType = 'File') => {
    const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.location.protocol === 'capacitor:');

    if (isCapacitor) {
        try {
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            const { Filesystem, Directory } = await import('@capacitor/filesystem').catch(() => ({}));
            const { Share } = await import('@capacitor/share').catch(() => ({}));
            const { LocalNotifications } = await import('@capacitor/local-notifications').catch(() => ({}));

            const result = await Filesystem.writeFile({
                path: fileName,
                data: pdfBase64,
                directory: Directory.Downloads,
                recursive: true
            });

            if (LocalNotifications) {
                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: 'Download Complete',
                            body: notificationBody || `Your ${logType.toLowerCase()} "${logTitle}" is ready.`,
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now() + 500) },
                            iconColor: '#1E40AF',
                            smallIcon: 'ic_launcher',
                            largeIcon: 'logo',
                            sound: null,
                            attachments: []
                        }]
                    });
                } catch (err) { console.error("[PDF] Notification error:", err); }
            }

            if (Share) {
                try {
                    await Share.share({
                        title: `${logType} Ready`,
                        text: `Your ${logTitle} has been downloaded.`,
                        url: result.uri,
                        dialogTitle: 'Share Document',
                    });
                } catch (err) { console.error("[PDF] Share error:", err); }
            }
        } catch (error) {
            console.error('Capacitor PDF error:', error);
            pdf.save(fileName);
        }
    } else {
        pdf.save(fileName);
    }
};

export const addPageDecoration = (pdf, pageNum, totalPages) => {
    const pageWidth = 210;
    const pageHeight = 297;

    // Premium top accent bar
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(0, 0, pageWidth, 10, "F");

    // Clean bottom line
    pdf.setDrawColor(...COLORS.divider);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, pageHeight - 20, pageWidth - MARGIN, pageHeight - 20);

    // Footer
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("Actinova AI Tutor • Your Intelligent Learning Companion", MARGIN, pageHeight - 12);
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - MARGIN, pageHeight - 12, { align: "right" });
};

export const checkNewPage = (pdf, neededSpace, currentY) => {
    const pageHeight = 297;
    if (currentY + neededSpace > pageHeight - 30) {
        pdf.addPage();
        return 30;
    }
    return currentY;
};

export const renderFormattedText = (pdf, text, x, y, contentWidth, size = 11, checkNewPageFn) => {
    const maxWidth = contentWidth - (x - MARGIN);
    pdf.setFontSize(size);
    pdf.setTextColor(...COLORS.text);

    const cleanText = text.trim().replace(/^[#\s]+/, '').replace(/\\\[(.*?)\\\]/g, '$1');
    const wrappedLines = pdf.splitTextToSize(cleanText, maxWidth);

    wrappedLines.forEach((line) => {
        const lineHeight = size * 0.3527 * LINE_HEIGHT_RATIO;
        y = checkNewPageFn(lineHeight + 2, y);

        const parts = line.split(/(\*\*.*?\*\*|__.*?__|(?<!\*)\*.*?\*(?!\*)|(?<!_)_.*?_(?!_)|~~.*?~~)/g);
        let currentX = x;

        parts.forEach(part => {
            const isBold = part.startsWith('**') && part.endsWith('**') || part.startsWith('__') && part.endsWith('__');
            const isItalic = part.startsWith('*') && part.endsWith('*') || part.startsWith('_') && part.endsWith('_');
            const isStrikethrough = part.startsWith('~~') && part.endsWith('~~');

            if (isBold) {
                pdf.setFont("helvetica", "bold");
                const clean = part.slice(2, -2);
                pdf.text(clean, currentX, y);
                currentX += pdf.getTextWidth(clean);
            } else if (isItalic) {
                pdf.setFont("helvetica", "italic");
                const clean = part.slice(1, -1);
                pdf.text(clean, currentX, y);
                currentX += pdf.getTextWidth(clean);
            } else if (isStrikethrough) {
                const clean = part.slice(2, -2);
                pdf.setFont("helvetica", "normal");
                pdf.text(clean, currentX, y);
                const w = pdf.getTextWidth(clean);
                pdf.setLineWidth(0.2);
                pdf.line(currentX, y - (size * 0.12), currentX + w, y - (size * 0.12));
                currentX += w;
            } else {
                pdf.setFont("helvetica", "normal");
                pdf.text(part, currentX, y);
                currentX += pdf.getTextWidth(part);
            }
        });
        y += lineHeight;
    });
    return y;
};

export const processContent = async (pdf, content, currentY, options = {}) => {
    const { margin = MARGIN, contentWidth = 210 - (MARGIN * 2), titleToSkip = null, isFirstLesson = true } = options;
    if (!content) return currentY;

    const lines = content.split('\n');
    let y = currentY;
    let isInCodeBlock = false;
    let tableBuffer = [];
    let mermaidBuffer = [];

    const flushTable = () => {
        if (tableBuffer.length < 2) { tableBuffer = []; return; }
        y = checkNewPage(pdf, 30, y);

        const rows = tableBuffer.map(r => r.split('|').map(c => c.trim()).filter(c => c));
        const headers = rows[0];
        const colCount = headers.length;
        const colWidth = (contentWidth - 10) / colCount;

        // Header background
        pdf.setFillColor(...COLORS.primaryLight);
        pdf.rect(margin, y, contentWidth, 12, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...COLORS.primary);
        headers.forEach((h, i) => pdf.text(h, margin + 5 + i * colWidth, y + 8));

        y += 12;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.text);

        rows.slice(1).forEach((row, idx) => {
            const rowHeight = 10;
            y = checkNewPage(pdf, rowHeight, y);
            if (idx % 2 === 0) {
                pdf.setFillColor(248, 250, 255);
                pdf.rect(margin, y, contentWidth, rowHeight, "F");
            }
            row.forEach((cell, i) => {
                const cellLines = pdf.splitTextToSize(cell, colWidth - 8);
                pdf.text(cellLines, margin + 5 + i * colWidth, y + 6);
            });
            y += rowHeight;
        });
        y += 8;
        tableBuffer = [];
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed && !isInCodeBlock) { y += PARAGRAPH_GAP; continue; }

        if (trimmed.startsWith("```")) {
            flushTable();
            const lang = trimmed.substring(3).trim();
            if (lang === 'mermaid') {
                isInCodeBlock = 'mermaid';
                mermaidBuffer = [];
            } else if (isInCodeBlock === 'mermaid') {
                isInCodeBlock = false;
                const code = mermaidBuffer.join('\n');
                if (code.trim()) {
                    const image = await renderMermaidToPng(code);
                    if (image) {
                        const ratio = image.height / image.width;
                        const w = Math.min(contentWidth * 0.9, image.width);
                        const h = w * ratio;
                        y = checkNewPage(pdf, h + 20, y);
                        pdf.addImage(image.dataUrl, 'PNG', (210 - w) / 2, y, w, h);
                        y += h + 15;
                    }
                }
            } else {
                isInCodeBlock = !isInCodeBlock;
            }
            continue;
        }

        if (isInCodeBlock === 'mermaid') { mermaidBuffer.push(line); continue; }
        if (isInCodeBlock) {
            y = checkNewPage(pdf, 8, y);
            pdf.setFont("courier", "normal");
            pdf.setFontSize(9);
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin + 2, y - 5, contentWidth - 4, 8, "F");
            pdf.text(line, margin + 6, y);
            y += 8;
            continue;
        }

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            tableBuffer.push(trimmed);
            continue;
        } else flushTable();

        y = checkNewPage(pdf, 14, y);

        if (trimmed.startsWith("# ")) {
            const text = trimmed.substring(2).replace(/[\*_]/g, '').trim();
            // For lesson PDFs, skip ALL H1 headings (course/module titles)
            // For course PDFs, only skip on first lesson
            if (titleToSkip && isFirstLesson) continue;

            y += 10;
            pdf.setFillColor(...COLORS.primaryLight);
            pdf.rect(margin - 5, y - 10, contentWidth + 10, 28, "F");

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(28);
            pdf.setTextColor(...COLORS.primary);
            pdf.text(text, margin, y + 10);
            y += 35;
        } else if (trimmed.startsWith("## ")) {
            y += SECTION_GAP;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(22);
            pdf.setTextColor(...COLORS.primary);
            pdf.text(trimmed.substring(3).replace(/[\*_]/g, '').trim(), margin, y);
            y += 12;
        } else if (trimmed.startsWith("### ")) {
            y += 10;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.setTextColor(...COLORS.text);
            pdf.text(trimmed.substring(4).trim(), margin, y);
            y += 10;
        } else if (trimmed.match(/^[-*•]\s/)) {
            pdf.setFontSize(14);
            pdf.setTextColor(...COLORS.primary);
            pdf.text("●", margin + 4, y);
            y = renderFormattedText(pdf, trimmed.replace(/^[-*•]\s/, ""), margin + 14, y, contentWidth, 11, checkNewPage);
        } else if (trimmed.match(/^\d+\.\s/)) {
            const num = trimmed.match(/^\d+\./)[0];
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...COLORS.primary);
            pdf.text(num, margin, y);
            y = renderFormattedText(pdf, trimmed.replace(/^\d+\.\s/, ""), margin + 12, y, contentWidth, 11, checkNewPage);
        } else {
            y = renderFormattedText(pdf, trimmed, margin, y, contentWidth, 11, checkNewPage);
        }
    }
    flushTable();
    return y;
};

export const renderMermaidToPng = async (code) => {
    try {
        const processedCode = code.replace(/\[([\s\S]*?)\]/g, (m, l) => l.includes('"') ? `["${l.trim().replace(/"/g, '""')}"]` : m);
        const id = `mermaid-${Date.now()}`;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
        const { svg } = await mermaid.render(id, processedCode);

        return new Promise((resolve) => {
            const img = new Image();
            const svgBase64 = btoa(unescape(encodeURIComponent(svg)));
            img.src = `data:image/svg+xml;base64,${svgBase64}`;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = 3;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.width, height: img.height });
            };
            img.onerror = () => resolve(null);
        });
    } catch (e) {
        console.error("Mermaid error:", e);
        return null;
    }
};