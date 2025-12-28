import jsPDF from "jspdf";
import mermaid from "mermaid";

/**
 * Enhanced PDF Generation Utility for Actinova AI Tutor
 * 
 * Generates professional PDFs with left-aligned headers respecting margins.
 * Special handling for **SECTION TITLE** style (blue bold with underline).
 */

// Brand Colors
const COLORS = {
    primary: [37, 99, 235],    // Blue
    primaryLight: [239, 246, 255],
    text: [31, 41, 55],       // Dark Gray
    textLight: [107, 114, 128],
    divider: [229, 231, 235],
};

const saveAndSharePDF = async (pdf, fileName, logTitle, notificationBody, logType = 'File') => {
    // Mobile/Capacitor Support
    const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.location.protocol === 'capacitor:');

    if (isCapacitor) {
        try {
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            const { Filesystem, Directory } = await import('@capacitor/filesystem').catch(() => ({}));
            const { Share } = await import('@capacitor/share').catch(() => ({}));
            const { LocalNotifications } = await import('@capacitor/local-notifications').catch(() => ({}));

            if (!Filesystem || !Share || !LocalNotifications) {
                throw new Error("Capacitor plugins not available");
            }

            // Request notification permissions
            try {
                await LocalNotifications.requestPermissions();
            } catch (e) {
                console.warn("Notification permissions denied", e);
            }

            const result = await Filesystem.writeFile({
                path: fileName,
                data: pdfBase64,
                directory: Directory.Documents,
            });

            // Schedule notification
            await LocalNotifications.schedule({
                notifications: [{
                    title: 'Download Complete',
                    body: notificationBody,
                    id: Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: null,
                    attachments: null,
                    actionTypeId: "",
                    extra: null
                }]
            });

            await Share.share({
                title: `Actinova ${logType} Download`,
                text: `${logType} for ${logTitle}`,
                url: result.uri,
                dialogTitle: 'Save or Open PDF',
            });
        } catch (error) {
            console.error('Capacitor PDF error:', error);
            pdf.save(fileName); // Fallback
        }
    } else {
        pdf.save(fileName);
    }
};

export const downloadCourseAsPDF = async (data, mode = "course") => {
    if (!data) throw new Error("No data provided");

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 25;

    // Helper to render Mermaid to PNG
    const renderMermaidToPng = async (code) => {
        try {
            const id = `mermaid-pdf-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            // Ensure mermaid is initialized
            mermaid.initialize({ startOnLoad: false, theme: 'default' });
            const { svg } = await mermaid.render(id, code);

            return new Promise((resolve, reject) => {
                const img = new Image();
                // Use base64 Data URI instead of Blob URL to avoid tainted canvas SecurityError
                const base64Svg = btoa(unescape(encodeURIComponent(svg)));
                const url = `data:image/svg+xml;base64,${base64Svg}`;

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // 3x scale for crisp PDF headers/text
                    const scale = 3;
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    // White background
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.scale(scale, scale);
                    ctx.drawImage(img, 0, 0);
                    resolve({
                        dataUrl: canvas.toDataURL('image/png'),
                        width: img.width, // unscaled dimensions for PDF layout
                        height: img.height
                    });
                };
                img.onerror = (e) => {
                    console.error("Image load error", e);
                    resolve(null); // Fallback to raw code
                };
                img.crossOrigin = "anonymous";
                img.src = url;
            });
        } catch (e) {
            console.error("Mermaid render error:", e);
            return null;
        }
    };

    // Header & Footer
    const addPageDecoration = (pageNum, totalPages) => {
        pdf.setDrawColor(...COLORS.divider);
        pdf.setLineWidth(0.2);
        pdf.line(margin, 15, pageWidth - margin, 15);
        pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text("Actinova AI Tutor - Personalized Learning", margin, pageHeight - 10);
        pdf.text("Copyright © Actinova AI Tutor. All rights reserved.", pageWidth / 2, pageHeight - 10, { align: "center" });
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    };

    const checkNewPage = (neededSpace) => {
        if (y + neededSpace > pageHeight - 25) {
            pdf.addPage();
            y = 25;
            return true;
        }
        return false;
    };

    // --- COVER PAGE ---
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    y = 40;
    try {
        pdf.addImage("/logo.png", "PNG", (pageWidth - 40) / 2, y, 40, 40);
        y += 45;
    } catch (e) {
        y = 80;
    }
    y += 16;

    pdf.setTextColor(...COLORS.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(48);
    pdf.text("ACTINOVA", pageWidth / 2, y, { align: "center" });

    y += 12;
    pdf.setFontSize(24);
    pdf.text("AI TUTOR PLATFORM", pageWidth / 2, y, { align: "center" });

    y = 150;

    const titleLines = pdf.splitTextToSize(data.title || "Study Material", contentWidth - 20);
    const titleHeight = titleLines.length * 12;
    const boxHeight = 40 + titleHeight + 20;

    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin - 5, y - 15, contentWidth + 10, boxHeight, 2, 2, "D");

    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(14);
    pdf.text(mode.toUpperCase() === "NOTES" ? "PERSONALIZED STUDY NOTES" : "PERSONALIZED COURSE MATERIAL", pageWidth / 2, y, { align: "center" });

    y += 15;
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(28);
    pdf.text(titleLines, pageWidth / 2, y, { align: "center" });

    y += (titleLines.length * 12) + 10;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });

    // --- CONTENT ---
    pdf.addPage();
    y = 30;

    const renderMarkdownLine = (text, xPos, size = 11) => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...COLORS.text);

        // Strip ALL markdown before processing
        let cleanedText = text
            // Remove images: ![alt](url) -> alt
            .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
            // Remove links: [text](url) -> text
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            // Remove raw URLs
            .replace(/https?:\/\/[^\s\)]+/g, '')
            // Bold/Italic/Code (handle nesting loosely by running multiple passes or simple greedy)
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
            .replace(/(\*|_)(.*?)\1/g, '$2')    // Italic
            .replace(/~~(.*?)~~/g, '$1')        // Strikethrough
            .replace(/`([^`]+)`/g, '$1')        // Inline code
            // Remove header markers if any remain (though processed in loop)
            .replace(/^#+\s+/, '')
            // Remove blockquote markers
            .replace(/^>\s+/, '')
            // Remove horizontal rule markers
            .replace(/^[-*_]{3,}\s*$/, '')
            // Remove list markers (handled in loop but good for safety)
            .replace(/^[-*•]\s+/, '')
            .replace(/^\d+\.\s+/, '')
            .trim();

        const maxWidth = contentWidth - (xPos - margin);
        const lines = pdf.splitTextToSize(cleanedText, maxWidth);

        lines.forEach((line) => {
            checkNewPage(8);
            pdf.text(line, xPos, y);
            y += 7;
        });
    };

    const processContent = async (content, titleToSkip = null) => {
        if (!content) return;
        const lines = content.split('\n');
        let isInCodeBlock = false;
        let isFirstLine = true;
        let tableBuffer = [];
        let mermaidBuffer = [];

        const flushTable = () => {
            if (tableBuffer.length === 0) return;

            checkNewPage(20);
            y += 5;

            // Basic Table Rendering logic
            const rows = tableBuffer.map(row => row.split('|').map(c => c.trim()).filter(c => c !== ''));
            if (rows.length < 2) return; // Not a valid table

            const headers = rows[0];
            const colCount = headers.length;
            const colWidth = (contentWidth - 10) / colCount;

            // Header
            pdf.setFillColor(245, 247, 250);
            pdf.rect(margin, y, contentWidth, 10, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(...COLORS.text);

            headers.forEach((h, i) => {
                pdf.text(h, margin + 5 + (i * colWidth), y + 6);
            });
            y += 10;

            // Rows
            pdf.setFont("helvetica", "normal");
            rows.slice(2).forEach((row, rIdx) => {
                const rowHeight = 10; // Fixed for simplicity currently
                checkNewPage(rowHeight);

                // Zebra striping
                if (rIdx % 2 === 1) {
                    pdf.setFillColor(249, 250, 251);
                    pdf.rect(margin, y, contentWidth, rowHeight, "F");
                }

                row.forEach((cell, cIdx) => {
                    const cellText = pdf.splitTextToSize(cell, colWidth - 5);
                    pdf.text(cellText, margin + 5 + (cIdx * colWidth), y + 6);
                });

                pdf.setDrawColor(230, 230, 230);
                pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
                y += rowHeight;
            });

            y += 5;
            tableBuffer = [];
        };

        // Use Loop for Async processing
        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith("```")) {
                flushTable(); // Flush pending table if any

                // Check if it's a mermaid block
                const lang = trimmed.substring(3).trim();

                if (lang === 'mermaid') {
                    isInCodeBlock = 'mermaid';
                    mermaidBuffer = []; // Start capturing mermaid code
                } else if (isInCodeBlock === 'mermaid') {
                    // END of mermaid block
                    isInCodeBlock = false;
                    const code = mermaidBuffer.join('\n');

                    if (code.trim()) {
                        // Render Diagram
                        const image = await renderMermaidToPng(code);
                        if (image) {
                            // Calculate dimensions to fit
                            const maxWidth = contentWidth - 10;
                            // const maxHeight = ...
                            let imgW = image.width * 0.264583; // px to mm approx (96dpi) 
                            // Actually jsPDF deals in mm. PNG width is pixels. 
                            // We need to scale it to fit PAGE
                            // Assume 1px = 0.26mm is standard web logic but we can just normalize to width
                            const ratio = image.height / image.width;
                            let displayW = Math.min(maxWidth, imgW); // Don't upscale small images too much

                            // If it's huge, cap it
                            if (displayW < maxWidth * 0.5 && imgW > 100) displayW = maxWidth * 0.7; // Ensure visibility

                            // Auto-fit to width if it's wide
                            if (imgW > maxWidth) displayW = maxWidth;

                            let displayH = displayW * ratio;

                            checkNewPage(displayH + 10);
                            y += 5;
                            try {
                                pdf.addImage(image.dataUrl, 'PNG', (pageWidth - displayW) / 2, y, displayW, displayH);
                                y += displayH + 5;
                            } catch (err) {
                                console.error("PDF AddImage failed", err);
                            }
                        }
                    }
                } else if (isInCodeBlock) {
                    isInCodeBlock = false;
                } else {
                    isInCodeBlock = true;
                }

                y += 2;
                isFirstLine = false;
                continue;
            }

            if (isInCodeBlock === 'mermaid') {
                mermaidBuffer.push(line);
                continue;
            }

            if (isInCodeBlock) {
                pdf.setFont("courier", "normal");
                pdf.setFontSize(10);
                pdf.setFillColor(248, 250, 252); // Lighter background for code
                pdf.rect(margin + 2, y - 4, contentWidth - 4, 6, "F");
                pdf.text(line, margin + 4, y);
                y += 6;
                pdf.setFont("helvetica", "normal");
                isFirstLine = false;
                continue;
            }

            // Table Detection
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                tableBuffer.push(trimmed);
                continue;
            } else {
                flushTable();
            }

            // Graph / Ascii Art Detection (simple heuristic: look for typical graph chars not starting with markdown)
            if (!trimmed.startsWith('#') && !trimmed.startsWith('>') && (trimmed.includes('---|') || trimmed.includes('/ \\') || trimmed.includes(' +--') || trimmed.includes(' | '))) {
                pdf.setFont("courier", "normal");
                checkNewPage(6);
                pdf.text(line, margin, y);
                y += 6;
                pdf.setFont("helvetica", "normal");
                continue;
            }

            if (["---", "***", "___"].includes(trimmed)) {
                checkNewPage(5);
                y += 4;
                isFirstLine = false;
                continue;
            }

            if (!trimmed) {
                y += 5;
                isFirstLine = false;
                continue;
            }

            checkNewPage(12);

            // Skip module title
            if (trimmed.match(/^#? ?Module:.*/i)) {
                isFirstLine = false;
                continue;
            }

            // Handle Lesson: line
            if (trimmed.startsWith('## LESSON: ') || trimmed.startsWith('LESSON: ') || trimmed.startsWith('Lesson: ')) {
                y += 2;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(20);
                pdf.setTextColor(...COLORS.primary);
                let headerText = trimmed.replace(/^##\s*/, '').replace(/^LESSON:\s*/i, '');
                headerText = headerText.toUpperCase();
                const lines2 = pdf.splitTextToSize(headerText, contentWidth);
                pdf.text(lines2, margin, y);
                y += lines2.length * 10;
                y += 2;
                isFirstLine = false;
                continue;
            }

            // Handle first line as H1 if applicable
            if (isFirstLine && !trimmed.startsWith('#') && !trimmed.startsWith('##') && !trimmed.startsWith('###') && !trimmed.startsWith('> ') && !trimmed.match(/^[-*•]\s/) && !trimmed.match(/^\d+\.\s/)) {
                y += 2;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(26);
                pdf.setTextColor(...COLORS.primary);
                const headerLines = pdf.splitTextToSize(trimmed, contentWidth - 10);
                pdf.text(headerLines, margin, y);
                y += headerLines.length * 12 + 4;
                isFirstLine = false;
                continue;
            }

            isFirstLine = false;

            // Markdown Headers - left aligned
            if (trimmed.startsWith("# ")) {
                const text = trimmed.substring(2).replace(/[\*_]/g, '').trim();
                // Skip if matches title we are skipping
                if (titleToSkip && text.toLowerCase().includes(titleToSkip.toLowerCase())) continue;

                y += 2;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(26);
                pdf.setTextColor(...COLORS.primary);
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 12 + 4;
            } else if (trimmed.startsWith("## ")) {
                y += 2;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(20);
                pdf.setTextColor(...COLORS.primary);
                const text = trimmed.substring(3).replace(/[\*_]/g, '').trim();
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 10;
                y += 2;
            } else if (trimmed.startsWith("### ")) {
                y += 2;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(16);
                pdf.setTextColor(...COLORS.text);
                const text = trimmed.substring(4).replace(/[\*_]/g, '').trim();
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 9 + 2;
            } else if (trimmed.startsWith("#### ")) {
                y += 2;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.setTextColor(...COLORS.text);
                const text = trimmed.substring(5).replace(/[\*_]/g, '').trim();
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 8 + 2;
            } else if (trimmed.startsWith("> ")) {
                const quote = trimmed.substring(2).trim();
                pdf.setFont("helvetica", "italic");
                pdf.setTextColor(...COLORS.textLight);
                const qLines = pdf.splitTextToSize(quote, contentWidth - 10);
                checkNewPage(qLines.length * 6 + 4);
                pdf.setDrawColor(...COLORS.divider);
                pdf.setLineWidth(1);
                pdf.line(margin + 2, y - 4, margin + 2, y + qLines.length * 6 - 4);
                pdf.text(qLines, margin + 8, y);
                y += qLines.length * 6 + 4;
                pdf.setFont("helvetica", "normal");
            } else if (trimmed.match(/^[-*•]\s/)) {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...COLORS.primary);
                pdf.text("•", margin + 2, y);
                renderMarkdownLine(trimmed.replace(/^[-*•]\s/, ""), margin + 8);
            } else if (trimmed.match(/^\d+\.\s/)) {
                const num = trimmed.match(/^\d+\./)[0];
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...COLORS.primary);
                pdf.text(num, margin, y);
                renderMarkdownLine(trimmed.replace(/^\d+\.\s/, ""), margin + 10);
            } else {
                renderMarkdownLine(trimmed, margin);
            }
        }

        flushTable(); // Ensure last table is flushed
    };

    if (mode === "course") {
        const modules = data.modules || data.courseData?.modules || [];

        // Table of Contents
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        pdf.setTextColor(...COLORS.primary);
        pdf.text("Table of Contents", margin, y);
        y += 15;

        modules.forEach((mod, idx) => {
            checkNewPage(12);
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...COLORS.text);
            pdf.text(`Module ${idx + 1}: ${mod.title}`, margin, y);
            y += 8;
        });

        // Use Loop for Async processing
        for (let idx = 0; idx < modules.length; idx++) {
            const mod = modules[idx];
            pdf.addPage();
            y = 30;

            // Module title box removed per plan
            y += 5;

            if (mod.lessons) {
                for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
                    const lesson = mod.lessons[lIdx];
                    checkNewPage(20);
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(16);
                    pdf.setTextColor(...COLORS.text);
                    pdf.text(`${idx + 1}.${lIdx + 1} ${lesson.title || lesson}`, margin, y);
                    y += 12;

                    if (lesson.content) {
                        await processContent(lesson.content, lesson.title || lesson);
                    }
                    y += 10;
                }
            }
        }
    } else {
        await processContent(data.content, data.title);
    }

    // Final decorations
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageDecoration(i, totalPages);
    }

    const fileName = `${data.title?.replace(/\s+/g, "_").toLowerCase() || "actinova_study"}.pdf`;
    await saveAndSharePDF(
        pdf,
        fileName,
        data.title,
        `${data.title} saved to Documents. Tap to view.`,
        'Study Material'
    );
};

export const downloadQuizAsPDF = async (data) => {
    // unchanged - same as previous version
    if (!data || !data.questions) throw new Error("No data provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 40;

    const addBranding = (pageNum, total) => {
        pdf.setDrawColor(...COLORS.divider);
        pdf.setLineWidth(0.2);
        pdf.line(margin, 15, pageWidth - margin, 15);
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(`Actinova AI Tutor - Assessment: ${data.title}`, margin, 12);
        if (pageNum) pdf.text(`Page ${pageNum} of ${total}`, pageWidth - margin, 12, { align: "right" });
    };

    addBranding();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("ASSESSMENT PAPER", pageWidth / 2, y, { align: "center" });
    y += 12;
    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text(`Subject: ${data.topic || "General Knowledge"}`, pageWidth / 2, y, { align: "center" });
    y += 10;
    // Line removed
    // pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    data.questions.forEach((q, i) => {
        const qLines = pdf.splitTextToSize(`${i + 1}. ${q.text}`, contentWidth - 10);
        const optHeight = (q.options?.length || 0) * 8;
        if (y + qLines.length * 6 + optHeight + 20 > pageHeight - 30) {
            pdf.addPage();
            addBranding();
            y = 25;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(...COLORS.text);
        pdf.text(qLines, margin, y);
        y += qLines.length * 6 + 2;

        if (q.options) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            q.options.forEach((opt, j) => {
                pdf.setTextColor(...COLORS.textLight);
                pdf.text(String.fromCharCode(65 + j) + ")", margin + 5, y);
                pdf.setTextColor(...COLORS.text);
                pdf.text(pdf.splitTextToSize(opt, contentWidth - 20), margin + 15, y);
                y += 6;
            });
        } else {
            // Line removed
            // pdf.line(margin + 5, y + 5, pageWidth - margin - 5, y + 5);
            y += 10;
        }
        y += 5;
    });

    pdf.addPage();
    addBranding();
    y = 30;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("ANSWER KEY", margin, y);
    y += 15;

    pdf.setFontSize(11);
    data.questions.forEach((q, i) => {
        if (y > pageHeight - 20) {
            pdf.addPage();
            addBranding();
            y = 25;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORS.text);
        pdf.text(`${i + 1}: `, margin, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...COLORS.primary);
        pdf.text(String(q.correctAnswer), margin + 10, y);
        y += 6;
    });

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addBranding(i, totalPages);
    }

    const fileName = `assessment_${data.title?.replace(/\s+/g, "_").toLowerCase() || "exam"}.pdf`;
    await saveAndSharePDF(
        pdf,
        fileName,
        data.title,
        `Assessment for ${data.title} saved to Documents.`,
        'Assessment'
    );
};

export const downloadReceiptAsPDF = async (data) => {
    if (!data) throw new Error("No data provided");

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    let y = 40;

    // Header
    pdf.setFillColor(248, 250, 252); // Light gray bg for header
    pdf.rect(0, 0, pageWidth, 50, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("RECEIPT", pageWidth - margin, 25, { align: "right" });

    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("PAYMENT CONFIRMATION", pageWidth - margin, 32, { align: "right" });

    // Logo placeholder text
    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.text);
    pdf.text("Actinova AI Tutor", margin, 25);
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("123 Learning Lane, EdTech City", margin, 32);

    y = 70;

    // Transaction Details
    // Line removed
    // pdf.setDrawColor(...COLORS.divider);
    // pdf.setLineWidth(0.5);
    // pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    const addRow = (label, value, isBold = false) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(label, margin, y);

        pdf.setFont("helvetica", isBold ? "bold" : "normal");
        pdf.setTextColor(...COLORS.text);
        pdf.text(value, pageWidth - margin, y, { align: "right" });
        y += 8;
    };

    addRow("Reference ID", data.reference || "N/A");
    addRow("Date", new Date(data.date || data.paidAt || Date.now()).toLocaleDateString());
    addRow("Plan", data.plan || "Premium Subscription");
    addRow("Billing Cycle", data.billingCycle || "Monthly");

    y += 2;
    // Line removed
    // pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Amount
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.text);
    pdf.text("Total Amount", margin, y);
    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.primary);
    pdf.text(
        new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount || 0),
        pageWidth - margin,
        y,
        { align: "right" }
    );

    y += 40;

    // Footer
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("Thank you for your business!", pageWidth / 2, y, { align: "center" });

    const fileName = `receipt-${data.reference || "transaction"}.pdf`;
    await saveAndSharePDF(
        pdf,
        fileName,
        data.plan || "Subscription",
        `Receipt for ${data.plan || "Subscription"} saved to Documents.`,
        'Receipt'
    );
};
