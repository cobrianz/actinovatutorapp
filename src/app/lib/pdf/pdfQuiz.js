import jsPDF from "jspdf";
import { COLORS, MARGIN, checkNewPage, saveAndSharePDF } from "./pdfShared";

export const downloadQuizAsPDF = async (data) => {
    if (!data || !data.questions) throw new Error("No data provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - MARGIN * 2;
    let y = 40;

    const addBranding = (pageNum, total) => {
        pdf.setDrawColor(...COLORS.divider);
        pdf.setLineWidth(0.1);
        pdf.line(MARGIN, 15, pageWidth - MARGIN, 15);
        pdf.setFontSize(8);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(`Actinova AI Tutor - Assessment: ${data.title}`, MARGIN, 12);
        if (pageNum) pdf.text(`Page ${pageNum} of ${total}`, pageWidth - MARGIN, 12, { align: "right" });
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

    data.questions.forEach((q, i) => {
        const qLines = pdf.splitTextToSize(`${i + 1}. ${q.text}`, contentWidth - 10);
        const optHeight = (q.options?.length || 0) * 8;

        y = checkNewPage(pdf, qLines.length * 6 + optHeight + 20, y);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(...COLORS.text);
        pdf.text(qLines, MARGIN, y);
        y += qLines.length * 6 + 4;

        if (q.options) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            q.options.forEach((opt, j) => {
                pdf.setTextColor(...COLORS.textLight);
                pdf.text(String.fromCharCode(65 + j) + ")", MARGIN + 5, y);
                pdf.setTextColor(...COLORS.text);
                pdf.text(pdf.splitTextToSize(opt, contentWidth - 20), MARGIN + 15, y);
                y += 8; // Double line height for readability
            });
        }
        y += 6;
    });

    // Answer Key on New Page
    pdf.addPage();
    addBranding();
    y = 30;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("ANSWER KEY", MARGIN, y);
    y += 15;

    pdf.setFontSize(11);
    data.questions.forEach((q, i) => {
        y = checkNewPage(pdf, 10, y);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORS.text);
        pdf.text(`${i + 1}: `, MARGIN, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...COLORS.primary);
        pdf.text(String(q.correctAnswer), MARGIN + 10, y);
        y += 10;
    });

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addBranding(i, totalPages);
    }

    const fileName = `assessment_${data.title?.replace(/\s+/g, "_").toLowerCase() || "exam"}.pdf`;
    await saveAndSharePDF(pdf, fileName, data.title, "Assessment downloaded successfully.", 'Assessment');
};
