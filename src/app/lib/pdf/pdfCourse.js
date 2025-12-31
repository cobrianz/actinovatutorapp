import jsPDF from "jspdf";
import { COLORS, MARGIN, checkNewPage, addPageDecoration, processContent, saveAndSharePDF, stripMarkdown } from "./pdfShared";

export const downloadCourseAsPDF = async (data) => {
    if (!data) throw new Error("No data provided");

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - (MARGIN * 2);
    let y = 30;

    // === COVER PAGE ===
    pdf.setFillColor(...COLORS.primaryLight);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    try {
        pdf.addImage("/logo.png", "PNG", (pageWidth - 50) / 2, y, 50, 50);
        y += 70;
    } catch (e) { y += 30; }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(40);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("ACTINOVA", pageWidth / 2, y, { align: "center" });
    y += 15;
    pdf.setFontSize(18);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("AI Tutor Platform", pageWidth / 2, y, { align: "center" });

    // Title Box
    y = 140;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...COLORS.primary);
    pdf.setLineWidth(2);
    pdf.roundedRect(MARGIN, y, contentWidth, 80, 10, 10, "FD");

    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(32);
    pdf.setFontSize(32);
    const titleLines = pdf.splitTextToSize(stripMarkdown(data.title) || "Full Course Material", contentWidth - 40);
    pdf.text(titleLines, pageWidth / 2, y + 30, { align: "center" });

    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.textLight);
    pdf.text("Personalized Course Textbook", pageWidth / 2, y + 60, { align: "center" });
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        pageWidth / 2, y + 75, { align: "center" });

    // === TABLE OF CONTENTS ===
    pdf.addPage();
    y = 40;
    const modules = data.modules || data.courseData?.modules || [];

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor(...COLORS.primary);
    pdf.text("Table of Contents", MARGIN, y);
    y += 20;

    modules.forEach((mod, idx) => {
        y = checkNewPage(pdf, 20, y);
        pdf.setFontSize(16);
        pdf.setFontSize(16);
        pdf.setTextColor(...COLORS.text);
        pdf.text(`Module ${idx + 1}: ${stripMarkdown(mod.title)}`, MARGIN, y);
        y += 12;

        if (mod.lessons) {
            mod.lessons.forEach((lesson, lIdx) => {
                y = checkNewPage(pdf, 10, y);
                pdf.setFontSize(12);
                pdf.setFontSize(12);
                pdf.setTextColor(...COLORS.textLight);
                pdf.text(`  ${idx + 1}.${lIdx + 1}  ${stripMarkdown(lesson.title) || "Untitled Lesson"}`, MARGIN + 5, y);
                y += 8;
            });
        }
        y += 8;
    });

    // === CONTENT ===
    for (let idx = 0; idx < modules.length; idx++) {
        const mod = modules[idx];
        pdf.addPage();
        y = 40;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(34);
        pdf.setTextColor(...COLORS.primary);
        pdf.text(`MODULE ${idx + 1}`, MARGIN, y);
        y += 18;

        pdf.setFontSize(24);
        pdf.setTextColor(...COLORS.text);
        pdf.setFontSize(24);
        pdf.setTextColor(...COLORS.text);
        const modLines = pdf.splitTextToSize(stripMarkdown(mod.title).toUpperCase(), contentWidth);
        pdf.text(modLines, MARGIN, y);
        y += modLines.length * 12 + 20;

        if (mod.lessons) {
            for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
                const lesson = mod.lessons[lIdx];
                if (idx === 0 && lIdx === 0) {
                    // First lesson of first module can stay on same page if it fits? 
                    // Users prefer fresh start usually.
                    pdf.addPage();
                } else {
                    pdf.addPage();
                }

                // Reset Y to top margin
                y = 40;
                addPageDecoration(pdf, pdf.getNumberOfPages(), totalPages); // Re-calculated later but good to haveplaceholder

                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(20);
                pdf.setFontSize(20);
                pdf.setTextColor(...COLORS.primary);
                const lessonTitle = `${idx + 1}.${lIdx + 1} ${stripMarkdown(lesson.title) || "Lesson"}`;
                const lLines = pdf.splitTextToSize(lessonTitle, contentWidth);
                pdf.text(lLines, MARGIN, y);
                y += lLines.length * 10 + 15;

                if (lesson.content) {
                    y = await processContent(pdf, lesson.content, y, {
                        titleToSkip: stripMarkdown(lesson.title),
                        isFirstLesson: true  // Always skip lesson titles in content for course PDFs
                    });
                }
            }
            y += 20;
        }
    }

    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addPageDecoration(pdf, i, totalPages);
    }

    const fileName = `${(stripMarkdown(data.title) || "course").replace(/\s+/g, "_").toLowerCase()}.pdf`;
    await saveAndSharePDF(pdf, fileName, stripMarkdown(data.title), `Your full course textbook "${stripMarkdown(data.title)}" is ready.`, 'Course');
};