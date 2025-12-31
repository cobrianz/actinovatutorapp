// Actinova PDF Generation Entry Point
// Updated to use Server-Side Puppeteer (2026 Standard)

import { downloadQuizAsPDF } from "./pdf/pdfQuiz";
import { downloadReceiptAsPDF } from "./pdf/pdfReceipt";

// Helper to fetch and download PDF from server
const fetchPdf = async (type, data, filename) => {
    try {
        const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });

        if (!response.ok) throw new Error("PDF generation failed");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("PDF Download Error:", error);
        alert("Failed to generate PDF. Please try again.");
    }
};

export const downloadCourseAsPDF = (data) => fetchPdf('course', data, (data.title || 'course').replace(/\s+/g, '_'));
export const downloadLessonAsPDF = (data) => fetchPdf('lesson', data, (data.title || 'lesson').replace(/\s+/g, '_'));

// Re-export for use in the application
export {
    downloadQuizAsPDF,
    downloadReceiptAsPDF
};

// Aliases
export const downloadNotesAsPDF = downloadLessonAsPDF;
export const downloadAssessmentAsPDF = downloadQuizAsPDF;
