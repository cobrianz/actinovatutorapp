// src/app/api/courses/[courseId]/download/route.js

import { NextResponse } from "next/server";
import { withAuth, withErrorHandling } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import User from "@/models/User";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

// Parse markdown content and extract structured text with formatting info
function parseMarkdown(md) {
  if (!md) return [];

  const lines = md.split("\n");
  const parsed = [];
  let currentList = null;
  let listItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentList) {
        parsed.push({ type: currentList, items: listItems });
        currentList = null;
        listItems = [];
      }
      continue;
    }

    // Headers
    if (line.startsWith("#### ")) {
      if (currentList) {
        parsed.push({ type: currentList, items: listItems });
        currentList = null;
        listItems = [];
      }
      parsed.push({ type: "h4", text: line.replace(/^####\s+/, "") });
    } else if (line.startsWith("### ")) {
      if (currentList) {
        parsed.push({ type: currentList, items: listItems });
        currentList = null;
        listItems = [];
      }
      parsed.push({ type: "h3", text: line.replace(/^###\s+/, "") });
    } else if (line.startsWith("## ")) {
      if (currentList) {
        parsed.push({ type: currentList, items: listItems });
        currentList = null;
        listItems = [];
      }
      parsed.push({ type: "h2", text: line.replace(/^##\s+/, "") });
    } else if (line.startsWith("# ")) {
      if (currentList) {
        parsed.push({ type: currentList, items: listItems });
        currentList = null;
        listItems = [];
      }
      parsed.push({ type: "h1", text: line.replace(/^#\s+/, "") });
    }
    // Bullet lists
    else if (/^[-•*]\s+/.test(line)) {
      const text = line.replace(/^[-•*]\s+/, "");
      if (currentList !== "ul") {
        if (currentList) {
          parsed.push({ type: currentList, items: listItems });
        }
        currentList = "ul";
        listItems = [];
      }
      listItems.push(text);
    }
    // Numbered lists
    else if (/^\d+\.\s+/.test(line)) {
      const text = line.replace(/^\d+\.\s+/, "");
      if (currentList !== "ol") {
        if (currentList) {
          parsed.push({ type: currentList, items: listItems });
        }
        currentList = "ol";
        listItems = [];
      }
      listItems.push(text);
    }
    // Regular paragraph
    else {
      if (currentList) {
        parsed.push({ type: currentList, items: listItems });
        currentList = null;
        listItems = [];
      }
      parsed.push({ type: "p", text: line });
    }
  }

  if (currentList) {
    parsed.push({ type: currentList, items: listItems });
  }

  return parsed;
}

// Extract inline formatting from text (fixed with global regex)
function parseInlineFormatting(text) {
  const segments = [];
  let lastIndex = 0;

  // Combined regex for **bold**, *italic*, `code`
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`/g;
  let match;

  while ((match = regex.exec(text))) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      // Bold: **text**
      segments.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      // Italic: *text*
      segments.push({ text: match[2], italic: true });
    } else if (match[3] !== undefined) {
      // Inline code: `code`
      segments.push({ text: match[3], code: true });
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments;
}

async function handlePost(request, { params }) {
  const { courseId } = params;
  await connectToDatabase();

  const user = request.user;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Validate courseId
    if (!courseId || !/^[0-9a-fA-F]{24}$/.test(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    // Check premium
    const userDoc = await User.findById(user._id).lean();
    const isPremium =
      userDoc?.isPremium ||
      (userDoc?.subscription?.plan === "pro" &&
        userDoc?.subscription?.status === "active");

    if (!isPremium) {
      return NextResponse.json(
        { error: "Upgrade to Pro to download courses as PDF" },
        { status: 403 }
      );
    }

    // Fetch course
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Size limit check to prevent abuse
    const totalLessons = course.modules.reduce(
      (sum, m) => sum + (m.lessons?.length || 0),
      0
    );
    if (totalLessons > 200) {
      return NextResponse.json(
        { error: "Course too large for PDF export" },
        { status: 400 }
      );
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();

    // Embed fonts with caching
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Add cover page
    const coverPage = pdfDoc.addPage([595.28, 841.89]); // A4
    coverPage.drawText(course.title, {
      x: 50,
      y: 500,
      size: 36,
      font: bold,
      color: rgb(0.15, 0.4, 0.9),
    });
    coverPage.drawText(`Student: ${userDoc.firstName} ${userDoc.lastName}`, {
      x: 50,
      y: 450,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    });
    coverPage.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: 420,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    });

    let page = pdfDoc.addPage([595.28, 841.89]);
    let y = 780;
    const margin = 50;
    const lineHeight = 18;

    const checkNewPage = () => {
      if (y < 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 780;
      }
    };

    const addLine = (
      text,
      size = 12,
      selectedFont = font,
      color = rgb(0, 0, 0)
    ) => {
      checkNewPage();
      page.drawText(text, {
        x: margin,
        y,
        size,
        font: selectedFont,
        color,
      });
      y -= lineHeight;
    };

    const addFormattedText = (segments, size = 12, indent = 0) => {
      checkNewPage();
      let x = margin + indent;
      const maxWidth = 595.28 - margin * 2 - indent;

      for (const segment of segments) {
        const segmentFont = segment.bold
          ? bold
          : segment.italic
            ? italic
            : font;
        const words = segment.text.split(" ");

        for (const word of words) {
          const wordWithSpace = word + " ";
          const wordWidth = segmentFont.widthOfTextAtSize(wordWithSpace, size);

          if (x + wordWidth > margin + maxWidth) {
            // Word doesn't fit, move to next line
            y -= lineHeight;
            checkNewPage();
            x = margin + indent;
          }

          page.drawText(word + " ", {
            x,
            y,
            size,
            font: segmentFont,
            color: segment.code ? rgb(0.2, 0.4, 0.8) : rgb(0, 0, 0),
          });

          x += wordWidth;
        }
      }

      y -= lineHeight + 5; // Extra spacing after paragraph
    };

    const addParagraph = (text, size = 12, indent = 0) => {
      const segments = parseInlineFormatting(text);
      addFormattedText(segments, size, indent);
    };

    // Simple Table of Contents (without page numbers for simplicity)
    addLine("Table of Contents", 24, bold, rgb(0.15, 0.4, 0.9));
    y -= 10;

    for (const module of course.modules) {
      if (
        !module.lessons?.length ||
        module.lessons.every(
          (l) => !l.content?.trim() || l.content.includes("coming soon")
        )
      )
        continue;
      addLine(`Module ${module.id}: ${module.title}`, 14, font);
      y -= 5;
    }
    y -= 20; // Space after TOC

    // Content
    for (const module of course.modules) {
      if (
        !module.lessons?.length ||
        module.lessons.every(
          (l) => !l.content?.trim() || l.content.includes("coming soon")
        )
      )
        continue;

      addLine(
        `Module ${module.id}: ${module.title}`,
        18,
        bold,
        rgb(0.1, 0.2, 0.4)
      );
      y -= 10;

      for (const lesson of module.lessons) {
        if (!lesson.content?.trim() || lesson.content.includes("coming soon"))
          continue;

        addLine(`${lesson.title}`, 14, bold, rgb(0.2, 0.3, 0.5));
        y -= 8;

        // Parse and render formatted content
        const parsedContent = parseMarkdown(lesson.content);

        for (const block of parsedContent) {
          if (block.type === "h1") {
            y -= 5;
            addLine(block.text, 20, bold, rgb(0.1, 0.2, 0.4));
            y -= 5;
          } else if (block.type === "h2") {
            y -= 3;
            addLine(block.text, 16, bold, rgb(0.15, 0.25, 0.45));
            y -= 3;
          } else if (block.type === "h3") {
            y -= 3;
            addLine(block.text, 14, bold, rgb(0.2, 0.3, 0.5));
            y -= 3;
          } else if (block.type === "h4") {
            y -= 2;
            addLine(block.text, 13, bold, rgb(0.25, 0.35, 0.55));
            y -= 2;
          } else if (block.type === "ul" || block.type === "ol") {
            let counter = 1;
            for (const item of block.items) {
              const bulletOrNumber =
                block.type === "ul" ? "• " : `${counter}. `;
              const segments = parseInlineFormatting(item);

              // Add bullet/number
              checkNewPage();
              page.drawText(bulletOrNumber, {
                x: margin + 10,
                y,
                size: 12,
                font: font,
                color: rgb(0, 0, 0),
              });

              // Add formatted text after bullet
              let x = margin + 30;
              const maxWidth = 595.28 - margin * 2 - 30;

              for (const segment of segments) {
                const segmentFont = segment.bold
                  ? bold
                  : segment.italic
                    ? italic
                    : font;
                const words = segment.text.split(" ");

                for (const word of words) {
                  const wordWithSpace = word + " ";
                  const wordWidth = segmentFont.widthOfTextAtSize(
                    wordWithSpace,
                    12
                  );

                  if (x + wordWidth > margin + maxWidth) {
                    y -= lineHeight;
                    checkNewPage();
                    x = margin + 30;
                  }

                  page.drawText(word + " ", {
                    x,
                    y,
                    size: 12,
                    font: segmentFont,
                    color: segment.code ? rgb(0.2, 0.4, 0.8) : rgb(0, 0, 0),
                  });

                  x += wordWidth;
                }
              }

              y -= lineHeight + 3;
              counter++;
            }
            y -= 5;
          } else if (block.type === "p") {
            addParagraph(block.text, 12, 0);
            y -= 5;
          }
        }

        y -= 10;
      }
    }

    // Footer page
    const finalPage = pdfDoc.addPage([595.28, 841.89]);
    finalPage.drawText("Thank you for learning with us!", {
      x: 100,
      y: 400,
      size: 20,
      font: bold,
      color: rgb(0.15, 0.4, 0.9),
    });

    // Add watermark to all pages
    const watermarkText = "Generated by Actinova AI Tutor";
    const pages = pdfDoc.getPages();
    for (const pg of pages) {
      pg.drawText(watermarkText, {
        x: pg.getWidth() / 2 - 150,
        y: pg.getHeight() / 2,
        size: 50,
        font: font,
        color: rgb(0.9, 0.9, 0.9), // Light gray
        rotate: degrees(45),
        opacity: 0.5,
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Better filename sanitization
    const safeTitle = course.title
      .replace(/[<>:"/\\|?*]/g, "") // Remove invalid filename chars
      .replace(/\s+/g, "_")
      .substring(0, 100)
      .toLowerCase();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

// Middleware
const handler = withAuth(handlePost);
export const POST = withErrorHandling(handler);
