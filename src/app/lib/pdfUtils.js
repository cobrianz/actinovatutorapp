import jsPDF from "jspdf";

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
            .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')  // Bold+Italic
            .replace(/\*\*([^*]+)\*\*/g, '$1')      // Bold
            .replace(/\*([^*]+)\*/g, '$1')          // Italic
            .replace(/__([^_]+)__/g, '$1')          // Bold underscore
            .replace(/_([^_]+)_/g, '$1')            // Italic underscore
            .replace(/~~([^~]+)~~/g, '$1')          // Strikethrough
            .replace(/`([^`]+)`/g, '$1')            // Inline code
            .trim();

        const maxWidth = contentWidth - (xPos - margin);
        const lines = pdf.splitTextToSize(cleanedText, maxWidth);

        lines.forEach((line) => {
            checkNewPage(8);
            pdf.text(line, xPos, y);
            y += 7;
        });
    };

    const processContent = (content, titleToSkip = null) => {
        if (!content) return;
        const lines = content.split('\n');
        let isInCodeBlock = false;
        let hasSkippedTitle = false;
        let isFirstLine = true;

        lines.forEach((line) => {
            const trimmed = line.trim();

            if (trimmed.startsWith("```")) {
                isInCodeBlock = !isInCodeBlock;
                y += 2;
                isFirstLine = false;
                return;
            }

            if (isInCodeBlock) {
                pdf.setFont("courier", "normal");
                pdf.setFontSize(10);
                pdf.setFillColor(245, 245, 245);
                pdf.rect(margin + 2, y - 4, contentWidth - 4, 6, "F");
                pdf.text(line, margin + 4, y);
                y += 6;
                pdf.setFont("helvetica", "normal");
                isFirstLine = false;
                return;
            }

            if (["---", "***", "___"].includes(trimmed)) {
                checkNewPage(10);
                y += 5;
                pdf.setDrawColor(...COLORS.divider);
                pdf.setLineWidth(0.5);
                pdf.line(margin, y, pageWidth - margin, y);
                y += 8;
                isFirstLine = false;
                return;
            }

            if (!trimmed) {
                y += 5;
                isFirstLine = false;
                return;
            }

            checkNewPage(12);

            // Skip module title
            if (trimmed.startsWith('# Module: ') || trimmed.startsWith('MODULE: ') || trimmed.startsWith('Module: ')) {
                isFirstLine = false;
                return;
            }

            // Handle Lesson: line
            if (trimmed.startsWith('## LESSON: ') || trimmed.startsWith('LESSON: ') || trimmed.startsWith('Lesson: ')) {
                y += 5;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(20);
                pdf.setTextColor(...COLORS.primary);
                let headerText = trimmed.replace(/^##\s*/, '').replace(/^LESSON:\s*/i, '');
                headerText = headerText.toUpperCase();
                const lines2 = pdf.splitTextToSize(headerText, contentWidth);
                pdf.text(lines2, margin, y);
                y += lines2.length * 10;
                const lastW = pdf.getTextWidth(lines2[lines2.length - 1]);
                pdf.setDrawColor(...COLORS.primary);
                pdf.setLineWidth(0.8);
                pdf.line(margin, y - 2, margin + lastW, y - 2);
                y += 5;
                isFirstLine = false;
                return;
            }

            // Handle first line as H1 if applicable
            if (isFirstLine && !trimmed.startsWith('#') && !trimmed.startsWith('##') && !trimmed.startsWith('###') && !trimmed.startsWith('> ') && !trimmed.match(/^[-*•]\s/) && !trimmed.match(/^\d+\.\s/)) {
                y += 5;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(26);
                pdf.setTextColor(...COLORS.primary);
                const headerLines = pdf.splitTextToSize(trimmed, contentWidth - 10);
                pdf.text(headerLines, margin, y);
                y += headerLines.length * 12 + 8;
                isFirstLine = false;
                return;
            }

            isFirstLine = false;

            // Markdown Headers - left aligned
            if (trimmed.startsWith("# ")) {
                const text = trimmed.substring(2).replace(/[\*_]/g, '').trim();
                if (!hasSkippedTitle && titleToSkip && text.toLowerCase().includes(titleToSkip.toLowerCase())) {
                    hasSkippedTitle = true;
                    return;
                }
                y += 5;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(26);
                pdf.setTextColor(...COLORS.primary);
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 12 + 8;
            } else if (trimmed.startsWith("## ")) {
                y += 5;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(20);
                pdf.setTextColor(...COLORS.primary);
                const text = trimmed.substring(3).replace(/[\*_]/g, '').trim();
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 10;
                const lastW = pdf.getTextWidth(hLines[hLines.length - 1]);
                pdf.setDrawColor(...COLORS.primary);
                pdf.setLineWidth(0.8);
                pdf.line(margin, y - 2, margin + lastW, y - 2);
                y += 5;
            } else if (trimmed.startsWith("### ")) {
                y += 4;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(16);
                pdf.setTextColor(...COLORS.text);
                const text = trimmed.substring(4).replace(/[\*_]/g, '').trim();
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 9 + 4;
            } else if (trimmed.startsWith("#### ")) {
                y += 3;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.setTextColor(...COLORS.text);
                const text = trimmed.substring(5).replace(/[\*_]/g, '').trim();
                const hLines = pdf.splitTextToSize(text, contentWidth);
                pdf.text(hLines, margin, y);
                y += hLines.length * 8 + 3;
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
        });
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

        modules.forEach((mod, idx) => {
            pdf.addPage();
            y = 30;

            // Module title box removed per plan
            y += 5;

            mod.lessons?.forEach((lesson, lIdx) => {
                checkNewPage(20);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(16);
                pdf.setTextColor(...COLORS.text);
                pdf.text(`${idx + 1}.${lIdx + 1} ${lesson.title || lesson}`, margin, y);
                y += 12;

                if (lesson.content) processContent(lesson.content, lesson.title || lesson);
                y += 10;
            });
        });
    } else {
        processContent(data.content, data.title);
    }

    // Final decorations
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageDecoration(i, totalPages);
    }

    const fileName = `${data.title?.replace(/\s+/g, "_").toLowerCase() || "actinova_study"}.pdf`;

    // Mobile/Capacitor Support
    const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.location.protocol === 'capacitor:');

    if (isCapacitor) {
        try {
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { Share } = await import('@capacitor/share');

            const result = await Filesystem.writeFile({
                path: fileName,
                data: pdfBase64,
                directory: Directory.Cache,
            });

            await Share.share({
                title: 'Actinova PDF Download',
                text: `Personalized material for ${data.title}`,
                url: result.uri,
                dialogTitle: 'Open PDF',
            });
        } catch (error) {
            console.error('Capacitor PDF error:', error);
            pdf.save(fileName); // Fallback
        }
    } else {
        pdf.save(fileName);
    }
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
    y += 20;
    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(1);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 15;

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
        y += qLines.length * 6 + 5;

        if (q.options) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            q.options.forEach((opt, j) => {
                pdf.setTextColor(...COLORS.textLight);
                pdf.text(String.fromCharCode(65 + j) + ")", margin + 5, y);
                pdf.setTextColor(...COLORS.text);
                pdf.text(pdf.splitTextToSize(opt, contentWidth - 20), margin + 15, y);
                y += 8;
            });
        } else {
            pdf.setDrawColor(...COLORS.divider);
            pdf.line(margin + 5, y + 5, pageWidth - margin - 5, y + 5);
            y += 15;
        }
        y += 10;
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
        y += 8;
    });

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addBranding(i, totalPages);
    }

    pdf.save(`assessment_${data.title?.replace(/\s+/g, "_").toLowerCase() || "exam"}.pdf`);
};
