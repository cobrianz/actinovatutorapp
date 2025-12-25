import jsPDF from "jspdf";

/**
 * Enhanced PDF Generation Utility for Actinova AI Tutor
 * 
 * This utility generates professional, visually appealing PDFs for courses and notes.
 * It handles markdown-like formatting including bold, italics, headers, and lists.
 */

// Brand Colors
const COLORS = {
    primary: [37, 99, 235],    // Blue
    primaryLight: [239, 246, 255],
    secondary: [99, 102, 241],  // Purple
    text: [31, 41, 55],       // Dark Gray
    textLight: [107, 114, 128], // Light Gray
    divider: [229, 231, 235],   // Border color
    white: [255, 255, 255]
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

    // Header & Footer Helper
    const addPageDecoration = (pageNum, totalPages) => {
        // Header line
        pdf.setDrawColor(...COLORS.divider);
        pdf.setLineWidth(0.2);
        pdf.line(margin, 15, pageWidth - margin, 15);

        // Footer
        pdf.setDrawColor(...COLORS.divider);
        pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text("Actinova AI Tutor - Personalized Learning", margin, pageHeight - 10);
        pdf.text(`Copyright © Actinova AI Tutor. All rights reserved.`, pageWidth / 2, pageHeight - 10, { align: "center" });
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    };

    // Check Page Overflow
    const checkNewPage = (neededSpace) => {
        if (y + neededSpace > pageHeight - 25) {
            pdf.addPage();
            y = 25;
            return true;
        }
        return false;
    };

    // --- COVER PAGE ---
    // No background gradient - keeping it clean as per user request
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    y = 40;
    try {
        // Add logo to cover page - path relative to public folder in Next.js
        pdf.addImage("/logo.png", "PNG", (pageWidth - 40) / 2, y, 40, 40);
        y += 45;
    } catch (e) {
        // Fallback if logo-white not found
        try {
            pdf.addImage("/logo.png", "PNG", (pageWidth - 40) / 2, y, 40, 40);
            y += 45;
        } catch (err) {
            y = 80; // Reset if no logo
        }
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
    // Box for title
    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin - 5, y - 15, contentWidth + 10, 80, 2, 2, "D");

    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(14);
    pdf.text(mode.toUpperCase() === "NOTES" ? "PERSONALIZED STUDY NOTES" : "PERSONALIZED COURSE MATERIAL", pageWidth / 2, y, { align: "center" });

    y += 15;
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(28);
    const titleLines = pdf.splitTextToSize(data.title || "Study Material", contentWidth - 10);
    pdf.text(titleLines, pageWidth / 2, y, { align: "center" });

    y += (titleLines.length * 10) + 10;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });

    // --- CONTENT PREPARATION ---
    pdf.addPage();
    y = 30;

    const renderMarkdownLine = (text, xPos, currentY, size = 11) => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...COLORS.text);

        const lines = pdf.splitTextToSize(text, contentWidth - (xPos - margin));

        lines.forEach((line) => {
            checkNewPage(8);

            let currentX = xPos;
            // Improved splitting for **bold**, *italic*, and _underline_
            const segments = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);

            segments.forEach(segment => {
                if (!segment) return;

                let style = "normal";
                let underline = false;
                let cleanText = segment;

                if (segment.startsWith("**") && segment.endsWith("**")) {
                    style = "bold";
                    cleanText = segment.substring(2, segment.length - 2);
                } else if ((segment.startsWith("*") && segment.endsWith("*")) || (segment.startsWith("_") && segment.endsWith("_"))) {
                    // Support both * and _ for italics
                    style = "italic";
                    cleanText = segment.substring(1, segment.length - 1);
                }

                pdf.setFont("helvetica", style);
                pdf.text(cleanText, currentX, y);

                const w = pdf.getTextWidth(cleanText);
                currentX += w;
            });
            y += 7;
        });
    };

    const renderCodeLine = (text, xPos) => {
        pdf.setFont("courier", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(50, 50, 50);

        const lines = pdf.splitTextToSize(text, contentWidth - (xPos - margin + 4));

        lines.forEach((line) => {
            checkNewPage(7);

            // Draw code background
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin + 2, y - 4, contentWidth - 4, 6, "F");

            pdf.text(line, xPos + 2, y);
            y += 6;
        });
        pdf.setFont("helvetica", "normal"); // Reset
    };

    const processContent = (content) => {
        if (!content) return;
        const lines = content.split('\n');
        let isInCodeBlock = false;

        lines.forEach(line => {
            const trimmedLine = line.trim();

            // Handle code block toggle
            if (trimmedLine.startsWith("```")) {
                isInCodeBlock = !isInCodeBlock;
                y += 2; // Small padding
                return;
            }

            if (isInCodeBlock) {
                renderCodeLine(line, margin + 4);
                return;
            }

            // Handle horizontal rule
            if (trimmedLine === "---" || trimmedLine === "***" || trimmedLine === "___") {
                checkNewPage(10);
                y += 5;
                pdf.setDrawColor(...COLORS.divider);
                pdf.setLineWidth(0.5);
                pdf.line(margin, y, pageWidth - margin, y);
                y += 8;
                return;
            }

            if (!trimmedLine) {
                y += 5;
                return;
            }

            checkNewPage(12);

            if (trimmedLine.startsWith("# ")) {
                const headerText = trimmedLine.substring(2).trim();
                // Skip if it matches the course title to avoid redundancy
                if (headerText.toLowerCase() === data.title?.toLowerCase()) {
                    return;
                }
                y += 5;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(26);
                pdf.setTextColor(...COLORS.primary);
                pdf.text(headerText, pageWidth / 2, y, { align: "center" });
                y += 15;
            } else if (trimmedLine.startsWith("## ")) {
                y += 5;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(20);
                pdf.setTextColor(...COLORS.primary);
                const headerText = trimmedLine.substring(3).toUpperCase();
                const lines = pdf.splitTextToSize(headerText, contentWidth);
                pdf.text(lines, margin, y);

                const lastLineW = pdf.getTextWidth(lines[lines.length - 1]);
                pdf.setDrawColor(...COLORS.primary);
                pdf.setLineWidth(0.8);
                const lineY = y + (lines.length * 7) - 4;
                pdf.line(margin, lineY, margin + lastLineW, lineY);
                y += (lines.length * 7) + 5;
            } else if (trimmedLine.startsWith("### ")) {
                y += 3;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(15);
                pdf.setTextColor(...COLORS.text);
                const headerText = trimmedLine.substring(4);
                const lines = pdf.splitTextToSize(headerText, contentWidth);
                pdf.text(lines, margin, y);
                y += (lines.length * 7) + 2;
            } else if (trimmedLine.startsWith("#### ")) {
                y += 2;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(13);
                pdf.setTextColor(...COLORS.text);
                const headerText = trimmedLine.substring(5);
                const lines = pdf.splitTextToSize(headerText, contentWidth);
                pdf.text(lines, margin, y);
                y += (lines.length * 6) + 2;
            } else if (trimmedLine.startsWith("> ")) {
                const quoteText = trimmedLine.substring(2).trim();
                pdf.setFont("helvetica", "italic");
                pdf.setTextColor(...COLORS.textLight);
                const lines = pdf.splitTextToSize(quoteText, contentWidth - 10);

                checkNewPage(lines.length * 6 + 4);

                // Draw quote vertical bar
                pdf.setDrawColor(...COLORS.divider);
                pdf.setLineWidth(1);
                pdf.line(margin + 2, y - 4, margin + 2, y + (lines.length * 6) - 4);

                pdf.text(lines, margin + 8, y);
                y += (lines.length * 6) + 4;
                pdf.setFont("helvetica", "normal"); // Reset
            } else if (trimmedLine.match(/^[-*•]\s/)) {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...COLORS.primary);
                pdf.text("•", margin + 2, y);
                const txt = trimmedLine.replace(/^[-*•]\s/, "");
                renderMarkdownLine(txt, margin + 8, y);
            } else if (trimmedLine.match(/^\d+\.\s/)) {
                const n = trimmedLine.match(/^\d+\./)[0];
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...COLORS.primary);
                pdf.text(n, margin, y);
                const txt = trimmedLine.replace(/^\d+\.\s/, "");
                renderMarkdownLine(txt, margin + 10, y);
            } else {
                pdf.setTextColor(...COLORS.text);
                renderMarkdownLine(trimmedLine, margin, y);
            }
        });
    };

    if (mode === "course") {
        const modules = data.modules || data.courseData?.modules || [];

        // Add Table of Contents
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        pdf.setTextColor(...COLORS.primary);
        pdf.text("Table of Contents", margin, y);
        y += 15;

        modules.forEach((mod, idx) => {
            checkNewPage(10);
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...COLORS.text);
            pdf.text(`Module ${idx + 1}: ${mod.title}`, margin, y);
            y += 8;
        });

        // Process Modules
        modules.forEach((mod, idx) => {
            pdf.addPage();
            y = 30;

            // Module Title
            pdf.setFillColor(...COLORS.primaryLight);
            pdf.rect(margin, y - 8, contentWidth, 15, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(20);
            pdf.setTextColor(...COLORS.primary);
            pdf.text(`Module ${idx + 1}: ${mod.title}`, margin + 5, y + 2);
            y += 20;

            mod.lessons?.forEach((lesson, lIdx) => {
                checkNewPage(20);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(16);
                pdf.setTextColor(...COLORS.text);
                pdf.text(`${idx + 1}.${lIdx + 1} ${lesson.title || lesson}`, margin, y);
                y += 10;

                if (lesson.content) {
                    processContent(lesson.content);
                }
                y += 10;
            });
        });
    } else {
        // Mode is "notes"
        processContent(data.content);
    }

    // --- FINAL DECORATION ---
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageDecoration(i, totalPages);
    }

    const fileName = `${data.title?.replace(/\s+/g, "_").toLowerCase() || "actinova_study"}.pdf`;
    pdf.save(fileName);
};



export const downloadQuizAsPDF = async (data) => {
    if (!data || !data.questions) throw new Error("No data provided");

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 40;

    const addBranding = (pageNum, total) => {
        pdf.setDrawColor(...COLORS.divider);
        pdf.setLineWidth(0.2);
        pdf.line(margin, 15, pageWidth - margin, 15);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(`Actinova AI Tutor - Assessment: ${data.title}`, margin, 12);
        if (pageNum) pdf.text(`Page ${pageNum} of ${total}`, pageWidth - margin, 12, { align: "right" });
    };

    addBranding();

    // Title Section
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

    // Questions
    data.questions.forEach((q, index) => {
        const textLines = pdf.splitTextToSize(`${index + 1}. ${q.text}`, contentWidth - 10);
        const optionsHeight = (q.options?.length || 0) * 8;
        const neededSpace = (textLines.length * 6) + optionsHeight + 20;

        if (y + neededSpace > pageHeight - 30) {
            pdf.addPage();
            addBranding();
            y = 25;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(...COLORS.text);
        pdf.text(textLines, margin, y);

        y += (textLines.length * 6) + 5;

        if (q.options) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            q.options.forEach((opt, optIdx) => {
                const optPrefix = String.fromCharCode(65 + optIdx) + ")";
                pdf.setTextColor(...COLORS.textLight);
                pdf.text(optPrefix, margin + 5, y);
                pdf.setTextColor(...COLORS.text);
                pdf.text(pdf.splitTextToSize(opt, contentWidth - 20), margin + 15, y);
                y += 8;
            });
        } else {
            // Space for written answer
            pdf.setDrawColor(...COLORS.divider);
            pdf.line(margin + 5, y + 5, pageWidth - margin - 5, y + 5);
            y += 15;
        }

        y += 10;
    });

    // Answer Key (on a new page)
    pdf.addPage();
    addBranding();
    y = 30;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("ANSWER KEY", margin, y);
    y += 15;

    pdf.setFontSize(11);
    data.questions.forEach((q, index) => {
        if (y > pageHeight - 20) {
            pdf.addPage();
            addBranding();
            y = 25;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORS.text);
        pdf.text(`${index + 1}: `, margin, y);
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

    const fileName = `assessment_${data.title?.replace(/\s+/g, "_").toLowerCase() || "exam"}.pdf`;
    pdf.save(fileName);
};
