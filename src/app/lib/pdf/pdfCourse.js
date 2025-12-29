import jsPDF from "jspdf";
import {
    COLORS, MARGIN, checkNewPage, addPageDecoration,
    processContent, saveAndSharePDF
} from "./pdfShared";

export const downloadCourseAsPDF = async (data) => {
    if (!data) throw new Error("No data provided");

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
    pdf.setFontSize(48);
    pdf.text("ACTINOVA", pageWidth / 2, y, { align: "center" });
    y += 12;
    pdf.setFontSize(24);
    pdf.text("AI TUTOR PLATFORM", pageWidth / 2, y, { align: "center" });

    y = 150;
    const titleLines = pdf.splitTextToSize(data.title || "Full Course Material", contentWidth - 40);
    const boxHeight = 40 + (titleLines.length * 12) + 20;
    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(MARGIN, y - 15, contentWidth, boxHeight, 2, 2, "D");
    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(14);
    pdf.text("PERSONALIZED COURSE TEXTBOOK", pageWidth / 2, y, { align: "center" });
    y += 15;
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(28);
    pdf.text(titleLines, pageWidth / 2, y, { align: "center", maxWidth: contentWidth - 40 });
    y += (titleLines.length * 12) + 10;
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });

    // --- TABLE OF CONTENTS ---
    pdf.addPage();
    y = 25;
    const modules = data.modules || data.courseData?.modules || [];
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("Table of Contents", MARGIN, y);
    y += 15;

    modules.forEach((mod, idx) => {
        y = checkNewPage(pdf, 15, y);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORS.text);
        pdf.text(`Module ${idx + 1}: ${mod.title}`, MARGIN, y);
        y += 8;

        if (mod.lessons) {
            mod.lessons.forEach((lesson, lIdx) => {
                y = checkNewPage(pdf, 10, y);
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...COLORS.textLight);
                const lessonTitle = lesson.title || "Untitled Lesson";
                pdf.text(`  ${idx + 1}.${lIdx + 1} ${lessonTitle}`, MARGIN, y);
                y += 7;
            });
        }
        y += 4;
    });

    // --- CONTENT GENERATION ---
    for (let idx = 0; idx < modules.length; idx++) {
        const mod = modules[idx];
        pdf.addPage();
        y = 30;

        // Module Break Page
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(32);
        pdf.setTextColor(...COLORS.primary);
        pdf.text(`MODULE ${idx + 1}`, MARGIN, y);
        y += 12;
        pdf.setFontSize(20);
        pdf.setTextColor(...COLORS.text);
        pdf.text(mod.title.toUpperCase(), MARGIN, y);
        y += 20;

        if (mod.lessons) {
            for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
                const lesson = mod.lessons[lIdx];
                // Start each lesson on a fresh start if too close to bottom
                y = checkNewPage(pdf, 40, y);

                // Explicit Lesson Header for Course Export
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(18);
                pdf.setTextColor(...COLORS.text);
                const lTitle = lesson.title || "Lesson Content";
                pdf.text(`${idx + 1}.${lIdx + 1} ${lTitle}`, MARGIN, y);
                y += 10;

                if (lesson.content) {
                    y = await processContent(pdf, lesson.content, y, {
                        titleToSkip: lTitle,
                        isFirstLesson: false // Allow titles inside content if they exist but skipping main one
                    });
                }
                y += 15; // Gap between lessons
            }
        }
    }

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageDecoration(pdf, i, totalPages);
    }

    const fileName = `${data.title?.replace(/\s+/g, "_").toLowerCase() || "course"}.pdf`;
    const notificationBody = `The course textbook for "${data.title}" is now available in your downloads.`;
    await saveAndSharePDF(pdf, fileName, data.title, notificationBody, 'Course');
};
