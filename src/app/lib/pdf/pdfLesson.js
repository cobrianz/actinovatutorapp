import jsPDF from "jspdf";
import {
    COLORS, MARGIN, checkNewPage, addPageDecoration,
    processContent, saveAndSharePDF, stripMarkdown
} from "./pdfShared";

export const downloadLessonAsPDF = async (data) => {
    if (!data || !data.content) throw new Error("No content provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (MARGIN * 2);
    let y = 25;

    // --- COVER PAGE ---
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    y = 40;
    try {
        pdf.addImage("/logo.png", "PNG", (pageWidth - 40) / 2, y, 40, 40);
        y += 45;
    } catch (e) { y = 80; }

    y += 16;
    pdf.setTextColor(...COLORS.text);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(40);
    pdf.text("STUDY NOTES", pageWidth / 2, y, { align: "center" });

    y = 150;
    const titleLines = pdf.splitTextToSize(stripMarkdown(data.title) || "Lesson Material", contentWidth - 40);
    const boxHeight = 40 + (titleLines.length * 12) + 20;

    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(MARGIN, y - 15, contentWidth, boxHeight, 2, 2, "D");

    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(14);
    pdf.text("PERSONALIZED ACADEMIC CONTENT", pageWidth / 2, y, { align: "center" });
    y += 15;
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(28);
    pdf.text(titleLines, pageWidth / 2, y, { align: "center", maxWidth: contentWidth - 40 });
    y += (titleLines.length * 12) + 10;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });

    // --- CONTENT ---
    pdf.addPage();
    y = 30;

    // Explicit Header for the lesson
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(...COLORS.primary);
    // Wrap lesson title to prevent overflow
    const headerLines = pdf.splitTextToSize(stripMarkdown(data.title) || "Lesson Material", contentWidth);
    pdf.text(headerLines, MARGIN, y);
    y += (headerLines.length * 8) + 6;

    y = await processContent(pdf, data.content, y, {
        titleToSkip: stripMarkdown(data.title),
        isFirstLesson: true
    });

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageDecoration(pdf, i, totalPages);
    }

    const fileName = `${stripMarkdown(data.title)?.replace(/\s+/g, "_").toLowerCase() || "lesson"}.pdf`;
    await saveAndSharePDF(pdf, fileName, stripMarkdown(data.title), "Your lesson notes are ready.", 'Lesson');
};
