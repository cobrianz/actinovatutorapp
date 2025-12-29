/**
 * Actinova PDF Generation Entry Point
 * 
 * This file exports specialized generation logic for different content types.
 * All modules enforce a consistent, premium 2.0 line height and academic layout.
 */

// Import specialized modules
import { downloadCourseAsPDF } from "./pdf/pdfCourse";
import { downloadLessonAsPDF } from "./pdf/pdfLesson";
import { downloadQuizAsPDF } from "./pdf/pdfQuiz";
import { downloadReceiptAsPDF } from "./pdf/pdfReceipt";

// Re-export for use in the application
export {
    downloadCourseAsPDF,
    downloadLessonAsPDF,
    downloadQuizAsPDF,
    downloadReceiptAsPDF
};

// Aliases for compatibility with older code if necessary
export const downloadNotesAsPDF = downloadLessonAsPDF;
export const downloadAssessmentAsPDF = downloadQuizAsPDF;
