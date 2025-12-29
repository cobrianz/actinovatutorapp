import jsPDF from "jspdf";
import { COLORS, MARGIN, saveAndSharePDF } from "./pdfShared";

export const downloadReceiptAsPDF = async (data, userName = "Scholar") => {
    if (!data) throw new Error("No data provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // LaTeX Colors
    const COLORS_LATEX = {
        primary: [0, 102, 204],
        accent: [0, 168, 255],
        gray: [100, 100, 100],
        success: [0, 128, 0]
    };

    let y = 0;

    // --- HEADER BAR ---
    pdf.setFillColor(...COLORS_LATEX.primary);
    pdf.rect(margin, 20, pageWidth - (margin * 2), 12, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Payment Receipt", pageWidth / 2, 28, { align: "center" });

    // --- BRANDING ---
    y = 45;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.text("Actinova AI Tutor", pageWidth / 2, y, { align: "center" });

    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("Your Intelligent Learning Companion", pageWidth / 2, y, { align: "center" });

    y += 8;
    pdf.setTextColor(...COLORS_LATEX.gray);
    pdf.text("www.actinova.ai", pageWidth / 2, y, { align: "center" });

    y += 12;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(`Billed To: ${userName}`, pageWidth / 2, y, { align: "center" });

    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.text("Thank you for your subscription!", pageWidth / 2, y, { align: "center" });

    y += 6;
    pdf.setDrawColor(...COLORS_LATEX.accent);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);

    // --- TRANSACTION DETAILS (TWO COLUMNS) ---
    y += 20;
    const col1X = margin;
    const col2X = pageWidth / 2 + 5;
    const detailFontSize = 10;
    const labelSpacing = 6;

    const date = new Date(data.date || data.paidAt || Date.now()).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // Column 1
    pdf.setFontSize(detailFontSize);
    pdf.setTextColor(0, 0, 0);

    let leftY = y;
    pdf.setFont("helvetica", "bold");
    pdf.text("Transaction Date:", col1X, leftY);
    pdf.setFont("helvetica", "normal");
    pdf.text(date, col1X + 35, leftY);

    leftY += labelSpacing;
    pdf.setFont("helvetica", "bold");
    pdf.text("Receipt Number:", col1X, leftY);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.reference?.slice(-10).toUpperCase() || "ORD-" + Math.floor(Math.random() * 1000000), col1X + 35, leftY);

    leftY += labelSpacing;
    pdf.setFont("helvetica", "bold");
    pdf.text("Reference:", col1X, leftY);
    pdf.setFont("helvetica", "normal");
    pdf.text(data.reference || "N/A", col1X + 35, leftY);

    leftY += labelSpacing;
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Status:", col1X, leftY);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS_LATEX.success);
    pdf.text("SUCCESS", col1X + 35, leftY);

    leftY += labelSpacing;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment Method:", col1X, leftY);
    pdf.setFont("helvetica", "normal");
    pdf.text("Credit/Debit Card", col1X + 35, leftY);

    // Column 2
    let rightY = y;
    pdf.setFont("helvetica", "bold");
    pdf.text("Plan:", col2X, rightY);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${data.plan || "Pro Subscription"}`, col2X + 30, rightY);

    rightY += labelSpacing;
    pdf.setFont("helvetica", "bold");
    pdf.text("Status:", col2X, rightY);
    pdf.setFont("helvetica", "normal");
    pdf.text("Active", col2X + 30, rightY);

    rightY += labelSpacing;
    pdf.setFont("helvetica", "bold");
    pdf.text("Auto-Renew:", col2X, rightY);
    pdf.setFont("helvetica", "normal");
    pdf.text("Enabled", col2X + 30, rightY);

    rightY += labelSpacing;
    pdf.setFont("helvetica", "bold");
    pdf.text("Valid From:", col2X, rightY);
    pdf.setFont("helvetica", "normal");
    pdf.text(date, col2X + 30, rightY);

    // --- AMOUNT ---
    y = Math.max(leftY, rightY) + 25;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount || 0);
    pdf.text(`Amount Paid: ${amount}`, pageWidth / 2, y, { align: "center" });

    y += 15;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    const time = new Date(data.date || data.paidAt || Date.now()).toLocaleTimeString('en-US', { hour12: false });
    pdf.text(`Payment processed on ${date} at ${time} EAT`, pageWidth / 2, y, { align: "center" });

    y += 12;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS_LATEX.gray);
    pdf.text("This is an auto-generated receipt. No signature required.", pageWidth / 2, y, { align: "center" });

    y += 10;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Questions? Contact us at support@actinova.ai", pageWidth / 2, y, { align: "center" });

    y += 10;
    pdf.setDrawColor(...COLORS_LATEX.accent);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 50, y, pageWidth / 2 + 50, y);

    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Thank you for choosing Actinova AI Tutor!", pageWidth / 2, y, { align: "center" });

    const fileName = `receipt-${data.reference || "transaction"}.pdf`;
    await saveAndSharePDF(pdf, fileName, data.plan || "Subscription", "Your receipt is ready.", 'Receipt');
};
