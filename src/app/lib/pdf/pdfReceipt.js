import jsPDF from "jspdf";
import { COLORS, MARGIN, saveAndSharePDF } from "./pdfShared";

export const downloadReceiptAsPDF = async (data, userName = "Scholar") => {
    if (!data) throw new Error("No data provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    let y = 30;

    // Subtle watermark
    pdf.setFontSize(70);
    pdf.setTextColor(240, 240, 240);
    pdf.text("ACTINOVA", pageWidth / 2, 160, { align: "center" });

    try {
        pdf.addImage("/logo.png", "PNG", (pageWidth - 40) / 2, y, 40, 40);
        y += 55;
    } catch (e) { y += 10; }

    // Header
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(MARGIN, y, pageWidth - MARGIN * 2, 15, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text("PAYMENT RECEIPT", pageWidth / 2, y + 10, { align: "center" });
    y += 30;

    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(22);
    pdf.text("Actinova AI Tutor", pageWidth / 2, y, { align: "center" });
    y += 12;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("Your Intelligent Learning Companion", pageWidth / 2, y, { align: "center" });
    y += 20;

    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.text);
    pdf.text(`Billed to: ${userName}`, pageWidth / 2, y, { align: "center" });
    y += 20;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Thank you for your subscription!", pageWidth / 2, y, { align: "center" });
    y += 25;

    // Details
    const col1 = MARGIN + 10;
    const col2 = pageWidth / 2 + 10;
    const date = new Date(data.date || data.paidAt || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Date:", col1, y); pdf.text(date, col1 + 40, y);
    pdf.text("Plan:", col2, y); pdf.text(data.plan || "Pro", col2 + 30, y);
    y += 10;
    pdf.text("Receipt #:", col1, y); pdf.text(data.reference?.toUpperCase() || "N/A", col1 + 40, y);
    pdf.text("Status:", col2, y); pdf.setTextColor(...COLORS.success); pdf.text("PAID", col2 + 30, y);
    y += 20;

    // Amount
    pdf.setFontSize(20);
    pdf.setTextColor(...COLORS.primary);
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount || 0);
    pdf.text(`Amount: ${amount}`, pageWidth / 2, y, { align: "center" });
    y += 30;

    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("This is an official receipt. Contact support@actinova.ai for questions.", pageWidth / 2, y, { align: "center" });

    const fileName = `receipt-${data.reference || "payment"}.pdf`;
    await saveAndSharePDF(pdf, fileName, "Subscription Payment", "Your receipt has been downloaded.", 'Receipt');
};