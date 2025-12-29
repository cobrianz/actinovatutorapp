import jsPDF from "jspdf";
import {
  COLORS,
  MARGIN,
  checkNewPage,
  addPageDecoration,
  processContent,
  saveAndSharePDF,
} from "./pdfShared";

/**
 * Generates a professional PDF for lesson/study notes with a clean cover page
 * and structured content.
 *
 * @param {Object} data - Lesson data containing at least { title: string, content: any }
 * @returns {Promise<void>}
 */
export const downloadLessonAsPDF = async (data) => {
  if (!data || !data.content) {
    throw new Error("No content provided");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const contentWidth = pageWidth - 2 * MARGIN;

  // Helper to add a new page if needed
  const addNewPageIfNecessary = (currentY, requiredHeight = 20) => {
    if (currentY + requiredHeight > pageHeight - MARGIN) {
      pdf.addPage();
      return MARGIN + 20; // Reset Y with some top padding
    }
    return currentY;
  };

  // === COVER PAGE ===
  let y = 40;

  // Logo (with graceful fallback)
  try {
    pdf.addImage("/logo.png", "PNG", (pageWidth - 50) / 2, y, 50, 50);
    y += 60;
  } catch (error) {
    y += 20; // Extra space if logo fails
  }

  // Main title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(36);
  pdf.setTextColor(...COLORS.primary);
  pdf.text("STUDY NOTES", pageWidth / 2, y, { align: "center" });
  y += 20;

  // Subtitle
  pdf.setFontSize(16);
  pdf.setTextColor(...COLORS.textLight);
  pdf.text("Personalized Academic Content", pageWidth / 2, y, { align: "center" });
  y += 30;

  // Lesson title in a elegant framed box
  const titleLines = pdf.splitTextToSize(data.title || "Lesson Material", contentWidth - 40);
  const titleHeight = titleLines.length * 12 + 30;

  pdf.setDrawColor(...COLORS.primary);
  pdf.setLineWidth(1);
  pdf.roundedRect(
    (pageWidth - (contentWidth + 20)) / 2,
    y - 15,
    contentWidth + 20,
    titleHeight,
    8,
    8,
    "S"
  ); // Stroke only

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(...COLORS.text);
  pdf.text(titleLines, pageWidth / 2, y + 10, { align: "center" });

  y += titleHeight + 10;

  // Generation date
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.textLight);
  pdf.text(
    `Generated on ${new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // === CONTENT PAGES ===
  pdf.addPage();
  y = MARGIN + 10;

  // Lesson header on first content page
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(...COLORS.primary);
  pdf.text(data.title || "Lesson Material", MARGIN, y);
  y += 15;

  // Process the main content (assumed to handle pagination internally)
  y = await processContent(pdf, data.content, y, {
    titleToSkip: data.title,
    isFirstLesson: true,
  });

  // Add consistent page decorations (headers/footers, page numbers, etc.)
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addPageDecoration(pdf, i, totalPages);
  }

  // Generate filename and save/share
  const safeTitle = (data.title || "lesson")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();
  const fileName = `${safeTitle}.pdf`;

  await saveAndSharePDF(
    pdf,
    fileName,
    data.title || "Lesson Notes",
    "Your personalized study notes are ready!",
    "Lesson"
  );
};