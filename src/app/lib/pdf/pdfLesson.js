import jsPDF from "jspdf";
import { COLORS, MARGIN, checkNewPage, addPageDecoration, processContent, saveAndSharePDF } from "./pdfShared";

export const downloadLessonAsPDF = async (data) => {
    if (!data || !data.content) throw new Error("No content provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const contentWidth = pageWidth - (MARGIN * 2);
    let y = 40;

    // === COVER ===
    pdf.setFillColor(...COLORS.primaryLight);
    pdf.rect(0, 0, pageWidth, 297, "F");

    try {
        pdf.addImage("/logo.png", "PNG", (pageWidth - 50) / 2, y, 50, 50);
        y += 70;
    } catch (e) { y += 20; }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(36);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("STUDY NOTES", pageWidth / 2, y, { align: "center" });
    y += 30;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(2);
    pdf.roundedRect(MARGIN, y, contentWidth, 80, 10, 10, "FD");

    pdf.setFontSize(30);
    const titleLines = pdf.splitTextToSize(data.title || "Lesson Material", contentWidth - 40);
    pdf.text(titleLines, pageWidth / 2, y + 30, { align: "center" });

    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("Personalized Academic Content", pageWidth / 2, y + 60, { align: "center" });
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 
             pageWidth / 2, y + 75, { align: "center" });

    // === CONTENT ===
    pdf.addPage();
    y = 40;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(26);
    pdf.setTextColor(...COLORS.primary);
    const headerLines = pdf.splitTextToSize(data.title || "Lesson", contentWidth);
    pdf.text(headerLines, MARGIN, y);
    y += headerLines.length * 12 + 20;

    y = await processContent(pdf, data.content, y, {
        titleToSkip: data.title,
        isFirstLesson: true
    });

    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageDecoration(pdf, i, totalPages);
    }

    const fileName = `${(data.title || "lesson").replace(/\s+/g, "_").toLowerCase()}.pdf`;
    await saveAndSharePDF(pdf, fileName, data.title, "Your personalized study notes are ready.", 'Lesson');
};