import jsPDF from "jspdf";
import { COLORS, MARGIN, checkNewPage, saveAndSharePDF } from "./pdfShared";

export const downloadQuizAsPDF = async (data) => {
    if (!data || !data.questions) throw new Error("No data provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const contentWidth = pageWidth - MARGIN * 2;
    let y = 50;

    // Header branding
    const addBranding = (pageNum, total) => {
        pdf.setFillColor(...COLORS.primary);
        pdf.rect(0, 0, pageWidth, 15, "F");
        pdf.setFontSize(9);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Actinova AI Tutor • Assessment`, MARGIN, 10);
        if (pageNum) pdf.text(`Page ${pageNum} of ${total}`, pageWidth - MARGIN, 10, { align: "right" });
    };
    addBranding();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(32);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("ASSESSMENT", pageWidth / 2, y, { align: "center" });
    y += 15;

    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.text);
    pdf.text(data.title || "Quiz", pageWidth / 2, y, { align: "center" });
    y += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text(`Subject: ${data.topic || "General"}`, pageWidth / 2, y, { align: "center" });
    y += 25;

    // Instructions
    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(MARGIN, y, contentWidth, 20, 4, 4, "S");
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.text);
    pdf.text("Select the correct answer. Write answers on a separate sheet.", MARGIN + 8, y + 12);
    y += 35;

    data.questions.forEach((q, i) => {
        const qLines = pdf.splitTextToSize(`${i + 1}. ${q.text}`, contentWidth - 10);
        const optHeight = (q.options?.length || 0) * 10;

        y = checkNewPage(pdf, qLines.length * 8 + optHeight + 25, y);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(...COLORS.text);
        pdf.text(qLines, MARGIN, y);
        y += qLines.length * 8 + 8;

        if (q.options) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(12);
            q.options.forEach((opt, j) => {
                pdf.setTextColor(...COLORS.textLight);
                pdf.text(`${String.fromCharCode(65 + j)})`, MARGIN + 8, y);
                pdf.setTextColor(...COLORS.text);
                pdf.text(pdf.splitTextToSize(opt, contentWidth - 30), MARGIN + 20, y);
                y += 10;
            });
        }
        y += 10;
    });

    // Answer Key
    pdf.addPage();
    addBranding();
    y = 40;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("ANSWER KEY", MARGIN, y);
    y += 20;

    pdf.setFontSize(12);
    data.questions.forEach((q, i) => {
        y = checkNewPage(pdf, 12, y);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${i + 1}.`, MARGIN, y);
        pdf.setTextColor(...COLORS.success);
        pdf.text(String(q.correctAnswer), MARGIN + 15, y);
        y += 12;
    });

    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addBranding(i, totalPages);
    }

    const fileName = `assessment_${(data.title || "quiz").replace(/\s+/g, "_").toLowerCase()}.pdf`;
    await saveAndSharePDF(pdf, fileName, data.title, "Your assessment paper is ready.", 'Assessment');
};