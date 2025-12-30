```javascript
import jsPDF from "jspdf";
import mermaid from "mermaid";
import katex from "katex";
import html2canvas from "html2canvas";

export const COLORS = {
    primary: [37, 99, 235],
    primaryLight: [239, 246, 255],
    text: [31, 41, 55],
    textLight: [107, 114, 128],
    divider: [229, 231, 235],
};

export const LINE_HEIGHT_RATIO = 2.0;
export const PARAGRAPH_GAP = 6;
export const SECTION_GAP = 5; // Reduced from 10
export const MARGIN = 20;

export const saveAndSharePDF = async (pdf, fileName, logTitle, notificationBody, logType = 'File') => {
    const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.location.protocol === 'capacitor:');

    if (isCapacitor) {
        try {
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            const { Filesystem, Directory } = await import('@capacitor/filesystem').catch(() => ({}));
            const { Share } = await import('@capacitor/share').catch(() => ({}));
            const { LocalNotifications } = await import('@capacitor/local-notifications').catch(() => ({}));

            try {
                const status = await Filesystem.requestPermissions();
                if (status.publicStorage !== 'granted') {
                    console.warn("Storage permission not granted, falling back to app-specific storage.");
                }
            } catch (e) { }


            const result = await Filesystem.writeFile({
                path: fileName,
                data: pdfBase64,
                directory: Directory.Downloads || Directory.Documents,
                recursive: true
            });



            // These are optional - failure here shouldn't stop the download
            if (LocalNotifications) {
                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: 'Download Successful',
                            body: notificationBody || `The ${ logType.toLowerCase() } for "${logTitle}" is ready.`,
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now() + 500) },
                            sound: null,
                            attachments: [],
                            smallIcon: 'res://ic_stat_name',
                            iconColor: '#2563EB'
                        }]
                    });
                } catch (err) { console.error("[PDF] Notification error:", err); }
            }

            if (Share) {
                try {
                    await Share.share({
                        title: `${ logType } Downloaded`,
                        text: `Successfully downloaded ${ logTitle }. Find it in your device's Downloads folder.`,
url: result.uri,
    dialogTitle: 'Share or Open Document',
                    });

                } catch (err) { console.error("[PDF] Share error:", err); }
            }
        } catch (error) {
    console.error('Capacitor PDF error (falling back to web save):', error);
    pdf.save(fileName);
}
    } else {
    pdf.save(fileName);
}
};

export const addPageDecoration = (pdf, pageNum, totalPages) => {
    const pageWidth = 210;
    const pageHeight = 297;
    pdf.setDrawColor(...COLORS.divider);
    pdf.setLineWidth(0.1);
    pdf.line(MARGIN, 15, pageWidth - MARGIN, 15);
    pdf.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.textLight);
    const currentYear = new Date().getFullYear();
    pdf.text(`© ${currentYear} Actinova AI Tutor - Premium Study Material`, MARGIN, pageHeight - 10);
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - MARGIN, pageHeight - 10, { align: "right" });
};

// Helper to determine if we are in list context for 'checkNewPage' callbacks if needed.
// But mostly we just need loop update.

// NOTE: renderFormattedText is now ASYNC to support LaTeX image generation
export const renderFormattedText = async (pdf, text, x, y, contentWidth, size = 11, checkNewPage, options = {}) => {
    const maxWidth = contentWidth - (x - MARGIN);
    pdf.setFontSize(size);
    pdf.setTextColor(...COLORS.text);

    // Filter out common markdown artifacts that might bleed through but keep structure we want
    // We only clean up leading # (headers) and escaped brackets here. 
    // Note: We used to remove []() links here but now we want to parse them.
    const cleanText = text.trim()
        .replace(/^[#\s]+/, '') // Strip leading #
        .replace(/\\\[(.*?)\\\]/g, '$1'); // Unescape matches like \[text\]

    const wrappedLines = pdf.splitTextToSize(cleanText, maxWidth);

    // We must process lines sequentially due to async
    for (const line of wrappedLines) {
        const currentLineHeight = size * 0.3527 * LINE_HEIGHT_RATIO;
        y = checkNewPage(currentLineHeight + 2, y);

        // Regex Explanation:
        // 1. Latex: \\\(.*?\\\) OR \$[^$]+\$
        // 2. Links: \[(.*?)\]\((.*?)\) -> Matches [text](url)
        // 3. Inline Code: `([^`]+)` -> Matches `code`
        // 4. Bold: \*\*.*?\*\* or __.*?__
        // 5. Italic: \*.*?\* or _.*?_ (negative lookbehind/ahead to avoid matching within ** or __)
        // 6. Strikethrough: ~~.*?~~

        // We split by capturing groups. The split will include the delimiters in the result array.
        // Priority: Links/Code first as they are most distinct, then formatting.
        const parts = line.split(/(\\\\(?:[\s\S]*?)\\\\|\$(?:[^$]+?)\$|\[.*?\]\(.*?\)|`[^`]+`|\*\*.*?\*\*|__.*?__|(?<!\*)\*.*?\*(?!\*)|(?<!_)_.*?_(?!_)|~~.*?~~)/g);

        let currentX = x;

        for (const part of parts) {
            // -- LATEX START --
            const latexMatch = part.match(/^(\\\(([\s\S]*?)\\\)|\$([^$]+?)\$)$/);
            // Group 2 is \( content \), Group 3 is $ content $
            if (latexMatch) {
                const latexContent = latexMatch[2] || latexMatch[3];
                if (latexContent) {
                    const image = await renderLatexToPng(latexContent.trim());
                    if (image) {
                        // Scale for inline text height (approx size mm)
                        const targetHeight = size * 0.3527 * 1.2; // slightly larger than text
                        const ratio = image.width / image.height;
                        const targetWidth = targetHeight * ratio;

                        // Check bounds
                        if (currentX + targetWidth > MARGIN + contentWidth) {
                            // potential wrap issue, but handling wrap mid-line is hard. 
                            // We'll just print it.
                        }

                        pdf.addImage(image.dataUrl, 'PNG', currentX, y - targetHeight + 1, targetWidth, targetHeight);
                        currentX += targetWidth + 1;
                    }
                }
                continue;
            }
            // -- LATEX END --

            // -- LINK START --
            const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (linkMatch) {
                const linkText = linkMatch[1];
                const linkUrl = linkMatch[2];

                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...COLORS.primary); // Blue

                // Optional: Underline (manual because jsPDF text options are limited sometimes)
                const textWidth = pdf.getTextWidth(linkText);
                pdf.text(linkText, currentX, y);
                pdf.setLineWidth(0.1);
                pdf.setDrawColor(...COLORS.primary);
                pdf.line(currentX, y + 1.5, currentX + textWidth, y + 1.5); // Underline

                // Add clickable link
                pdf.link(currentX, y - size / 2, textWidth, size, { url: linkUrl });

                currentX += textWidth;

                // Reset Color
                pdf.setTextColor(...COLORS.text);
                continue;
            }
            // -- LINK END --

            // -- INLINE CODE START --
            const codeMatch = part.match(/^`([^`]+)`$/);
            if (codeMatch) {
                const codeText = codeMatch[1];
                // Use a monospaced font if available (Courier is standard PDF font)
                pdf.setFont("courier", "normal");
                // Optional: Light background for code
                const textWidth = pdf.getTextWidth(codeText);
                pdf.setFillColor(240, 240, 240); // Light gray
                pdf.rect(currentX, y - size / 1.5, textWidth, size, 'F');

                pdf.setTextColor(220, 38, 38); // Red-ish for code
                pdf.text(codeText, currentX, y);

                currentX += textWidth;

                // Reset Font/Color
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...COLORS.text);
                continue;
            }
            // -- INLINE CODE END --

            const isBold = (part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'));
            const isItalic = (part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'));
            const isStrikethrough = part.startsWith('~~') && part.endsWith('~~');

            if (isBold) {
                pdf.setFont("helvetica", "bold");
                const cleanPart = part.slice(2, -2);
                pdf.text(cleanPart, currentX, y);
                currentX += pdf.getTextWidth(cleanPart);
            } else if (isItalic) {
                pdf.setFont("helvetica", "italic");
                const cleanPart = part.slice(1, -1);
                pdf.text(cleanPart, currentX, y);
                currentX += pdf.getTextWidth(cleanPart);
            } else if (isStrikethrough) {
                const cleanPart = part.slice(2, -2);
                pdf.setFont("helvetica", "normal");
                pdf.text(cleanPart, currentX, y);
                const textWidth = pdf.getTextWidth(cleanPart);
                pdf.setLineWidth(0.2);
                pdf.setDrawColor(...COLORS.text); // Ensure strikethrough is text color
                pdf.line(currentX, y - (size * 0.12), currentX + textWidth, y - (size * 0.12));
                currentX += textWidth;
            } else {
                pdf.setFont("helvetica", "normal");
                pdf.text(part, currentX, y);
                currentX += pdf.getTextWidth(part);
            }
        }
        y += currentLineHeight;
    }
    return y;
};

export const checkNewPage = (pdf, neededSpace, currentY) => {
    const pageHeight = 297;
    if (currentY + neededSpace > pageHeight - 25) {
        pdf.addPage();
        return 25;
    }
    return currentY;
};

export const processContent = async (pdf, content, currentY, options = {}) => {
    const {
        margin = MARGIN,
        contentWidth = 210 - (MARGIN * 2),
        titleToSkip = null,
        isFirstLesson = true
    } = options;

    if (!content) return currentY;
    const lines = content.split('\n');
    let y = currentY;
    let isInCodeBlock = false; // 'mermaid' | 'latex' | boolean
    let tableBuffer = [];
    let mermaidBuffer = [];
    let latexBuffer = [];
    let currentSection = "";

    const flushTable = () => {
        if (tableBuffer.length === 0) return;
        y = checkNewPage(pdf, 25, y);
        y += 5;
        const rows = tableBuffer.map(row => row.split('|').map(c => c.trim()).filter(c => c !== ''));
        if (rows.length < 2) return;
        const headers = rows[0];
        const colWidth = (contentWidth - 10) / headers.length;
        pdf.setFillColor(245, 247, 250);
        pdf.rect(margin, y, contentWidth, 10, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.text);
        headers.forEach((h, i) => pdf.text(h, margin + 5 + (i * colWidth), y + 6));
        y += 10;
        pdf.setFont("helvetica", "normal");
        rows.slice(2).forEach((row, rIdx) => {
            const rowHeight = 10;
            y = checkNewPage(pdf, rowHeight, y);
            if (rIdx % 2 === 1) {
                pdf.setFillColor(249, 250, 251);
                pdf.rect(margin, y, contentWidth, rowHeight, "F");
            }
            row.forEach((cell, cIdx) => {
                const cellText = pdf.splitTextToSize(cell, colWidth - 5);
                pdf.text(cellText, margin + 5 + (cIdx * colWidth), y + 6);
            });
            pdf.setDrawColor(230, 230, 230);
            pdf.line(margin, y + rowHeight, 210 - margin, y + rowHeight);
            y += rowHeight;
        });
        y += 5;
        tableBuffer = [];
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed && !isInCodeBlock) {
            y += PARAGRAPH_GAP;
            continue;
        }

        // --- MERMAID BLOCK START ---
        if (trimmed.startsWith("```mermaid")) {
            flushTable();
            isInCodeBlock = 'mermaid';
            mermaidBuffer = [];
            continue;
        }
        if (isInCodeBlock === 'mermaid' && trimmed.startsWith("```")) {
            isInCodeBlock = false;
            const code = mermaidBuffer.join('\n');
            if (code.trim()) {
                const image = await renderMermaidToPng(code);
                if (image) {
                    const ratio = image.height / image.width;
                    const displayW = Math.min(contentWidth, image.width * 0.2);
                    const displayH = displayW * ratio;
                    y = checkNewPage(pdf, displayH + 15, y);
                    pdf.addImage(image.dataUrl, 'PNG', (210 - displayW) / 2, y, displayW, displayH);
                    y += displayH + 10;
                }
            }
            continue;
        }
        if (isInCodeBlock === 'mermaid') {
            mermaidBuffer.push(line);
            continue;
        }
        // --- MERMAID BLOCK END ---

        // --- LATEX BLOCK START ---
        if (trimmed === "$$" || trimmed === "\\[") {
            flushTable();
            isInCodeBlock = 'latex';
            latexBuffer = [];
            continue;
        }
        if (isInCodeBlock === 'latex' && (trimmed === "$$" || trimmed === "\\]")) {
            isInCodeBlock = false;
            const latex = latexBuffer.join('\n');
            if (latex.trim()) {
                const image = await renderLatexToPng(latex);
                if (image) {
                    // Adjust scale
                    const scale = 0.24; // approx px to mm ratio
                    const displayW = image.width * scale;
                    const displayH = image.height * scale;

                    // Don't let it be wider than content
                    let finalW = displayW;
                    let finalH = displayH;
                    if (finalW > contentWidth) {
                        const ratio = finalH / finalW;
                        finalW = contentWidth;
                        finalH = finalW * ratio;
                    }

                    y = checkNewPage(pdf, finalH + 10, y);
                    pdf.addImage(image.dataUrl, 'PNG', margin + 5, y, finalW, finalH);
                    y += finalH + 10;
                }
            }
            continue;
        }
        if (isInCodeBlock === 'latex') {
            latexBuffer.push(line);
            continue;
        }
        // --- LATEX BLOCK END ---


        // --- GENERIC CODE BLOCK START ---
        if (trimmed.startsWith("```")) {
            flushTable();
            // Just toggle it
            if (isInCodeBlock === true) {
                // End
                isInCodeBlock = false;
            } else {
                // Start
                isInCodeBlock = true;
            }
            continue;
        }

        if (isInCodeBlock === true) {
            y = checkNewPage(pdf, 8, y);
            pdf.setFont("courier", "normal");
            pdf.setFontSize(10);
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin + 2, y - 4, contentWidth - 4, 6, "F");
            pdf.text(line, margin + 4, y);
            y += 6;
            continue;
        }
        // --- GENERIC CODE BLOCK END ---

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            tableBuffer.push(trimmed);
            continue;
        } else flushTable();

        y = checkNewPage(pdf, 12, y);

        if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
            currentSection = trimmed.replace(/^#+\s*/, "").replace(/[\*_]/g, "").trim();
        }

        if (trimmed.startsWith("# ")) {
            const text = trimmed.substring(2).replace(/[\*_]/g, '').trim();
            if (titleToSkip && text.toLowerCase().includes(titleToSkip.toLowerCase()) && isFirstLesson) continue;
            y += SECTION_GAP;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(26);
            pdf.setTextColor(...COLORS.primary);
            pdf.text(text, margin, y);
            y += 5; // Reduced from 10
            pdf.setDrawColor(...COLORS.primary);
            pdf.setLineWidth(0.8);
            pdf.line(margin, y - 2, margin + pdf.getTextWidth(text), y - 2); // Tightened line pos
            y += 5;
        } else if (trimmed.startsWith("## ")) {
            y += SECTION_GAP;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(20);
            pdf.setTextColor(...COLORS.primary);
            const text = trimmed.substring(3).replace(/[\*_]/g, '').trim();
            pdf.text(text, margin, y);
            y += 5; // Reduced from 8
            pdf.setDrawColor(...COLORS.primaryLight);
            pdf.setLineWidth(0.4);
            pdf.line(margin, y - 2, margin + contentWidth, y - 2);
            y += 4;
        } else if (trimmed.startsWith("### ")) {
            y += SECTION_GAP / 2;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.setTextColor(...COLORS.text);
            const text = trimmed.substring(4).replace(/[\*_]/g, '').trim();
            pdf.text(text, margin, y);
            y += 5; // Reduced from 8
        } else if (trimmed.startsWith("#### ")) {
            y += SECTION_GAP / 3;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.setTextColor(...COLORS.text);
            const text = trimmed.substring(5).replace(/[\*_]/g, '').trim();
            pdf.text(text, margin, y);
            y += 4; // Reduced from 6
        } else if (trimmed.startsWith("##### ")) {
            y += SECTION_GAP / 4;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(...COLORS.text);
            const text = trimmed.substring(6).replace(/[\*_]/g, '').trim();
            pdf.text(text, margin, y);
            y += 4; // Reduced from 5
        } else if (trimmed.startsWith("###### ")) {
            y += SECTION_GAP / 5;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(...COLORS.text);
            const text = trimmed.substring(7).replace(/[\*_]/g, '').trim();
            pdf.text(text, margin, y);
            y += 4;
        } else if (trimmed.startsWith("> ")) {
            const quote = trimmed.substring(2).trim();
            pdf.setFont("helvetica", "italic");
            pdf.setTextColor(...COLORS.textLight);
            const qLines = pdf.splitTextToSize(quote, contentWidth - 15);
            y = checkNewPage(pdf, qLines.length * 8 + 5, y);
            pdf.setDrawColor(...COLORS.primary);
            pdf.setLineWidth(1.5);
            pdf.line(margin + 2, y - 4, margin + 2, y + (qLines.length * 8) - 4);
            qLines.forEach(l => {
                pdf.text(l, margin + 8, y);
                y += 8;
            });
            y += 5;
        } else if (trimmed.match(/^[-*•]\s/)) {
            const isExercise = currentSection.toLowerCase().includes("practice exercises");
            if (isExercise) {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(0, 0, 0);
                pdf.text("\u2713", margin + 2, y);
                y = await renderFormattedText(pdf, trimmed.replace(/^[-*•]\s/, ""), margin + 10, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
            } else {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...COLORS.primary);
                pdf.text("•", margin + 2, y);
                y = await renderFormattedText(pdf, trimmed.replace(/^[-*•]\s/, ""), margin + 8, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
            }
        } else if (trimmed.match(/^\d+\.\s/)) {
            const num = trimmed.match(/^\d+\./)[0];
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...COLORS.primary);
            pdf.text(num, margin, y);
            y = await renderFormattedText(pdf, trimmed.replace(/^\d+\.\s/, ""), margin + 10, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
        } else if (line.startsWith("    ") || line.startsWith("\t")) {
            y = await renderFormattedText(pdf, trimmed, margin + 10, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
        } else {
            y = await renderFormattedText(pdf, trimmed, margin, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
        }
    }
    flushTable();
    return y;
};

export const renderMermaidToPng = async (code) => {
    try {
        const processedCode = code.replace(/\[([\s\S]*?)\]/g, (match, label) => {
            if (/[()",]/.test(label)) return `["${label.trim().replace(/"/g, '""')}"]`;
            return match;
        });

        const id = `mermaid-pdf-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        // Force default theme for visibility in PDF (white background)
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        const { svg } = await mermaid.render(id, processedCode);

        return new Promise((resolve) => {
            const img = new Image();
            const base64Svg = btoa(unescape(encodeURIComponent(svg)));
            const url = `data:image/svg+xml;base64,${base64Svg}`;

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
            img.src = url;
        });
    } catch (e) {
        console.error("Mermaid render error:", e);
        return null;
    }
};

export const renderLatexToPng = async (latex) => {
    try {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.padding = '20px'; // Add padding for bounds
        container.style.backgroundColor = '#ffffff'; // White bg
        container.style.display = 'inline-block'; // Fit content
        document.body.appendChild(container);

        katex.render(latex, container, {
            throwOnError: false,
            displayMode: true,
            output: 'html' // Render as HTML so html2canvas can capture it
        });

        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 3 // High resolution
        });

        const dataUrl = canvas.toDataURL('image/png');
        document.body.removeChild(container);

        return { dataUrl, width: canvas.width / 3, height: canvas.height / 3 };
    } catch (e) {
        console.error("LaTeX render error:", e);
        return null;
    }
};
```