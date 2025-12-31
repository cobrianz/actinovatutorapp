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
export const SECTION_GAP = 5;
export const MARGIN = 20;

export const stripMarkdown = (text) => {
    if (!text) return "";
    return text
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
        .replace(/(\*|_)(.*?)\1/g, '$2')     // Italic
        .replace(/~~(.*?)~~/g, '$1')         // Strikethrough
        .replace(/`([^`]+)`/g, '$1')         // Inline Code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links [text](url) -> text
        .replace(/\\\[(.*?)\\\]/g, '$1')     // LaTeX \[...\] -> ...
        .replace(/^\s*#+\s*/, '')            // Headers #
        .trim();
};

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

            if (LocalNotifications) {
                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: 'Download Successful',
                            body: notificationBody || `The ${logType.toLowerCase()} for "${logTitle}" is ready.`,
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
                        title: `${logType} Downloaded`,
                        text: `Successfully downloaded ${logTitle}. Find it in your device's Downloads folder.`,
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

export const checkNewPage = (pdf, neededSpace, currentY) => {
    const pageHeight = 297;
    if (currentY + neededSpace > pageHeight - 25) {
        pdf.addPage();
        addPageDecoration(pdf, pdf.internal.getNumberOfPages(), pdf.internal.getNumberOfPages());
        return 25;
    }
    return currentY;
};

// Async function to measure and render text with mixed content (LaTeX, Code, Links)
export const renderFormattedText = async (pdf, text, x, y, contentWidth, size = 11, checkNewPage) => {
    const maxWidth = contentWidth - (x - MARGIN);
    pdf.setFontSize(size);
    pdf.setTextColor(...COLORS.text);

    // 1. Cleanup
    const cleanText = text.trim()
        .replace(/^[#\s]+/, '')
        .replace(/\\\[(.*?)\\\]/g, '$1');

    if (!cleanText) return y;

    // 2. Tokenize
    const regex = /(\\\\(?:[\s\S]*?)\\\\|\$(?:[^$]+?)\$|\[.*?\]\(.*?\)|`[^`]+`|\*\*.*?\*\*|__.*?__|(?<!\*)\*.*?\*(?!\*)|(?<!_)_.*?_(?!_)|~~.*?~~)/g;

    const rawParts = cleanText.split(regex).filter(p => p);

    // 3. Process Tokens (Measure & Pre-render Images)
    const tokens = [];

    for (const part of rawParts) {
        // -- LATEX --
        const latexMatch = part.match(/^(\\\(([\s\S]*?)\\\)|\$([^$]+?)\$)$/);
        if (latexMatch) {
            const content = latexMatch[2] || latexMatch[3];
            const image = await renderLatexToPng(content.trim());
            if (image) {
                const targetH = size * 0.3527 * 1.5;
                const ratio = image.width / image.height;
                const targetW = targetH * ratio;

                tokens.push({ type: 'image', data: image.dataUrl, width: targetW, height: targetH, text: part });
            } else {
                tokens.push({ type: 'text', text: part, width: pdf.getTextWidth(part) });
            }
            continue;
        }

        // -- LINK --
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
            const label = linkMatch[1];
            const url = linkMatch[2];
            tokens.push({ type: 'link', text: label, url: url, width: pdf.getTextWidth(label) });
            continue;
        }

        // -- CODE --
        const codeMatch = part.match(/^`([^`]+)`$/);
        if (codeMatch) {
            const content = codeMatch[1];
            pdf.setFont("courier", "normal");
            const w = pdf.getTextWidth(content);
            pdf.setFont("helvetica", "normal");
            tokens.push({ type: 'code', text: content, width: w });
            continue;
        }

        // -- FORMATTING --
        let isBold = (part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'));
        let isItalic = (part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'));
        let isStrike = part.startsWith('~~') && part.endsWith('~~');

        let content = part;
        if (isBold) { content = part.slice(2, -2); pdf.setFont("helvetica", "bold"); }
        else if (isItalic) { content = part.slice(1, -1); pdf.setFont("helvetica", "italic"); }
        else if (isStrike) { content = part.slice(2, -2); }

        const w = pdf.getTextWidth(content);
        if (isBold || isItalic) pdf.setFont("helvetica", "normal");

        const words = content.split(/(\s+)/);
        words.forEach(word => {
            if (!word) return;
            const wordW = pdf.getTextWidth(word);
            tokens.push({
                type: 'text',
                text: word,
                width: wordW,
                bold: isBold,
                italic: isItalic,
                strike: isStrike
            });
        });
    }

    // 4. Wrap Lines
    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;

    for (const token of tokens) {
        if (token.text === '\n') {
            lines.push(currentLine); currentLine = []; currentLineWidth = 0; continue;
        }

        if (currentLineWidth + token.width > maxWidth) {
            if (currentLine.length === 0) {
                lines.push([token]);
            } else {
                lines.push(currentLine);
                currentLine = [token];
                currentLineWidth = token.width;
            }
        } else {
            currentLine.push(token);
            currentLineWidth += token.width;
        }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    // 5. Render
    const lineHeight = size * 0.3527 * LINE_HEIGHT_RATIO;

    for (const lineTokens of lines) {
        y = checkNewPage(pdf, lineHeight + 2, y);

        let lineX = x;

        for (const token of lineTokens) {
            if (token.type === 'image') {
                pdf.addImage(token.data, 'PNG', lineX, y - token.height + 1, token.width, token.height);
                lineX += token.width;
            } else if (token.type === 'code') {
                pdf.setFont("courier", "normal");
                pdf.setFillColor(248, 250, 252);
                pdf.rect(lineX, y - size / 1.5, token.width, size, 'F');
                pdf.setTextColor(220, 38, 38);
                pdf.text(token.text, lineX, y);
                pdf.setTextColor(...COLORS.text);
                pdf.setFont("helvetica", "normal");
                lineX += token.width;
            } else if (token.type === 'link') {
                pdf.setTextColor(...COLORS.primary);
                pdf.text(token.text, lineX, y);
                pdf.setDrawColor(...COLORS.primary);
                pdf.setLineWidth(0.1);
                pdf.line(lineX, y + 1, lineX + token.width, y + 1);
                pdf.link(lineX, y - size, token.width, size, { url: token.url });
                pdf.setTextColor(...COLORS.text);
                lineX += token.width;
            } else {
                if (token.bold) pdf.setFont("helvetica", "bold");
                else if (token.italic) pdf.setFont("helvetica", "italic");
                else pdf.setFont("helvetica", "normal");

                pdf.text(token.text, lineX, y);

                if (token.strike) {
                    pdf.setDrawColor(...COLORS.text);
                    pdf.setLineWidth(0.2);
                    pdf.line(lineX, y - size * 0.25, lineX + token.width, y - size * 0.25);
                }

                pdf.setFont("helvetica", "normal");
                lineX += token.width;
            }
        }
        y += lineHeight;
    }
    return y;
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
    let isInCodeBlock = false;
    let tableBuffer = [];
    let mermaidBuffer = [];
    let latexBuffer = [];
    let paragraphBuffer = [];
    let currentSection = "";

    const flushParagraph = async () => {
        if (paragraphBuffer.length === 0) return;
        const text = paragraphBuffer.join(' ');
        y = await renderFormattedText(pdf, text, margin, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
        paragraphBuffer = [];
    };

    const flushTable = async () => {
        if (tableBuffer.length === 0) return;
        await flushParagraph();
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

        // Empty Line = Paragraph Break
        if (!trimmed && !isInCodeBlock) {
            await flushParagraph();
            y += PARAGRAPH_GAP;
            continue;
        }

        // --- MERMAID BLOCK START ---
        if (trimmed.startsWith("```mermaid")) {
            await flushTable();
            await flushParagraph();
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
                    const pxToMm = 0.264583;
                    const naturalWidthMM = (image.width / 3) * pxToMm;
                    const naturalHeightMM = (image.height / 3) * pxToMm;

                    let displayW = naturalWidthMM;
                    let displayH = naturalHeightMM;

                    if (displayW > contentWidth) {
                        const ratio = displayH / displayW;
                        displayW = contentWidth;
                        displayH = displayW * ratio;
                    }

                    y = checkNewPage(pdf, displayH + 15, y);
                    pdf.addImage(image.dataUrl, 'PNG', margin + (contentWidth - displayW) / 2, y, displayW, displayH);
                    y += displayH + 10;
                }
            }
            continue;
        }
        if (isInCodeBlock === 'mermaid') {
            mermaidBuffer.push(line);
            continue;
        }

        // --- LATEX BLOCK START ---
        if (trimmed === "$$" || trimmed === "\\[") {
            await flushTable();
            await flushParagraph();
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
                    const scale = 0.24;
                    const displayW = image.width * scale;
                    const displayH = image.height * scale;

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

        // --- GENERIC CODE BLOCK START ---
        if (trimmed.startsWith("```")) {
            await flushTable();
            await flushParagraph();
            if (isInCodeBlock === true) {
                isInCodeBlock = false;
            } else {
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

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            await flushParagraph();
            tableBuffer.push(trimmed);
            continue;
        } else await flushTable();

        // y = checkNewPage(pdf, 12, y); // This line is now handled by flushParagraph or specific elements

        if (trimmed.startsWith("# ") || trimmed.startsWith("## ")) {
            currentSection = stripMarkdown(trimmed);
        }

        // Headers causing flush
        if (trimmed.startsWith("#") && !trimmed.startsWith("# ")) {
            // Handle #Header vs # Header? 
            // Markdown requires space. But to be safe if we match our conditions:
        }

        if (trimmed.startsWith("# ")) {
            await flushParagraph();
            const text = stripMarkdown(trimmed);
            if (titleToSkip && text.toLowerCase().includes(titleToSkip.toLowerCase()) && isFirstLesson) continue;
            y += SECTION_GAP;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(26);
            pdf.setTextColor(...COLORS.primary);
            pdf.text(text, margin, y);
            y += 5;
            pdf.setDrawColor(...COLORS.primary);
            pdf.setLineWidth(0.8);
            pdf.line(margin, y - 2, margin + pdf.getTextWidth(text), y - 2);
            y += 5;
        } else if (trimmed.startsWith("## ")) {
            await flushParagraph();
            y += SECTION_GAP;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(20);
            pdf.setTextColor(...COLORS.primary);
            pdf.setFontSize(20);
            pdf.setTextColor(...COLORS.primary);
            const text = stripMarkdown(trimmed);
            pdf.text(text, margin, y);
            y += 5;
            pdf.setDrawColor(...COLORS.primaryLight);
            pdf.setLineWidth(0.4);
            pdf.line(margin, y - 2, margin + contentWidth, y - 2);
            y += 4;
        } else if (trimmed.startsWith("### ")) {
            await flushParagraph();
            y += SECTION_GAP / 2;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.setTextColor(...COLORS.text);
            pdf.setFontSize(16);
            pdf.setTextColor(...COLORS.text);
            const text = stripMarkdown(trimmed);
            pdf.text(text, margin, y);
            y += 5;
        } else if (trimmed.startsWith("#### ")) {
            await flushParagraph();
            y += SECTION_GAP / 3;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.setTextColor(...COLORS.text);
            pdf.setTextColor(...COLORS.text);
            const text = stripMarkdown(trimmed);
            pdf.text(text, margin, y);
            y += 4;
        } else if (trimmed.startsWith("##### ")) {
            await flushParagraph();
            y += SECTION_GAP / 4;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(...COLORS.text);
            pdf.setTextColor(...COLORS.text);
            const text = stripMarkdown(trimmed);
            pdf.text(text, margin, y);
            y += 4;
        } else if (trimmed.startsWith("###### ")) {
            await flushParagraph();
            y += SECTION_GAP / 5;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(...COLORS.text);
            pdf.setTextColor(...COLORS.text);
            const text = stripMarkdown(trimmed);
            pdf.text(text, margin, y);
            y += 4;
        } else if (trimmed.startsWith("> ")) {
            await flushParagraph();
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
            await flushParagraph();
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
            await flushParagraph();
            const num = trimmed.match(/^\d+\./)[0];
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...COLORS.primary);
            pdf.text(num, margin, y);
            y = await renderFormattedText(pdf, trimmed.replace(/^\d+\.\s/, ""), margin + 10, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
        } else if (line.startsWith("    ") || line.startsWith("\t")) {
            await flushParagraph();
            y = await renderFormattedText(pdf, trimmed, margin + 10, y, contentWidth, 11, (space, cy) => checkNewPage(pdf, space, cy));
        } else {
            // Normal text line - buffer it!
            paragraphBuffer.push(trimmed);
        }
    }
    await flushTable();
    await flushParagraph();
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
        container.style.padding = '20px';
        container.style.backgroundColor = '#ffffff';
        container.style.display = 'inline-block';
        document.body.appendChild(container);

        katex.render(latex, container, {
            throwOnError: false,
            displayMode: true,
            output: 'html'
        });

        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 3
        });

        const dataUrl = canvas.toDataURL('image/png');
        document.body.removeChild(container);

        return { dataUrl, width: canvas.width / 3, height: canvas.height / 3 };
    } catch (e) {
        console.error("LaTeX render error:", e);
        return null;
    }
};