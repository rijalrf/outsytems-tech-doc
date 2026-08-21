import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  PageBreak,
} from 'docx';
import { FSD_OUTLINE } from '../constants/fsdTemplate';

// ─── Markdown-to-docx helpers ─────────────────────────────────────────────

function parseBold(text: string): TextRun[] {
  const parts = text.split(/\*\*(.+?)\*\*/);
  return parts.map((part, i) =>
    i % 2 === 1
      ? new TextRun({ text: part, bold: true })
      : new TextRun({ text: part })
  );
}

function mdLineToParagraph(line: string): Paragraph {
  const trimmed = line.trim();
  if (trimmed.startsWith('### ')) {
    return new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } });
  }
  if (trimmed.startsWith('## ')) {
    return new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } });
  }
  if (trimmed.startsWith('# ')) {
    return new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 120 } });
  }
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    return new Paragraph({ children: parseBold(trimmed.slice(2)), bullet: { level: 0 } });
  }
  if (trimmed === '---') {
    return new Paragraph({ text: '', spacing: { before: 200, after: 200 } });
  }
  if (trimmed === '') {
    return new Paragraph({ text: '', spacing: { after: 80 } });
  }
  return new Paragraph({ children: parseBold(trimmed), spacing: { after: 60 } });
}

function parseMarkdownTable(lines: string[]): Table | null {
  const headerCells = lines[0].split('|').map((c) => c.trim()).filter(Boolean);
  const dataRows = lines.slice(2).map((l) => l.split('|').map((c) => c.trim()).filter(Boolean));
  if (!headerCells.length) return null;
  const colWidth = Math.floor(9000 / headerCells.length);

  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map(
      (cell) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: cell, bold: true, size: 20 })] })],
        shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
        width: { size: colWidth, type: WidthType.DXA },
      })
    ),
  });

  const bodyRows = dataRows.map(
    (row) => new TableRow({
      children: headerCells.map((_, colIdx) => {
        const cellText = row[colIdx] ?? '';
        return new TableCell({
          children: [new Paragraph({ children: parseBold(cellText), spacing: { after: 40 } })],
          width: { size: colWidth, type: WidthType.DXA },
        });
      }),
    })
  );

  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
    },
  });
}

function markdownToDocxBlocks(md: string): (Paragraph | Table)[] {
  const lines = md.split('\n');
  const blocks: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code / Mermaid block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        new Paragraph({
          children: [new TextRun({ text: `[${lang || 'Code'} Block]`, italics: true, color: '6366F1', size: 18 })],
          spacing: { before: 120, after: 40 },
        })
      );
      codeLines.forEach((cl) =>
        blocks.push(
          new Paragraph({
            children: [new TextRun({ text: cl || ' ', font: 'Courier New', size: 18, color: '1E293B' })],
            spacing: { after: 0 },
            indent: { left: 360 },
          })
        )
      );
      blocks.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      i++;
      continue;
    }

    // Markdown table
    if (line.includes('|') && lines[i + 1]?.includes('---') && lines[i + 1]?.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseMarkdownTable(tableLines);
      if (table) {
        blocks.push(table);
        blocks.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
      continue;
    }

    blocks.push(mdLineToParagraph(line));
    i++;
  }

  return blocks;
}

// ─── Main export function ─────────────────────────────────────────────────

export async function exportToDocx(
  sectionContents: Record<string, string>,
  projectName: string,
  docVersion: string
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Cover / title page
  children.push(
    new Paragraph({
      children: [new TextRun({ text: projectName, bold: true, size: 56, color: '4338CA', font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Functional & Technical Specification Document', size: 32, color: '475569', font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Version ${docVersion}  ·  `, color: '64748B', size: 22 }),
        new TextRun({
          text: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          color: '64748B',
          size: 22,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // FSD Outline sections
  for (const sec of FSD_OUTLINE) {
    const hasChildren = FSD_OUTLINE.some((item) => item.parentId === sec.id);

    if (sec.level === 'parent') {
      children.push(
        new Paragraph({ text: sec.heading, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 120 } })
      );
      if (!hasChildren) {
        const content = sectionContents[sec.heading];
        if (content) {
          children.push(...markdownToDocxBlocks(content));
        } else {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: '[Belum diisi]', italics: true, color: 'CBD5E1', size: 20 })],
              spacing: { after: 80 },
            })
          );
        }
      }
    } else {
      children.push(
        new Paragraph({ text: sec.heading, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } })
      );
      const content = sectionContents[sec.heading];
      if (content) {
        children.push(...markdownToDocxBlocks(content));
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '[Belum diisi]', italics: true, color: 'CBD5E1', size: 20 })],
            spacing: { after: 80 },
          })
        );
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: { bold: true, size: 36, color: '1E293B', font: 'Calibri' },
          paragraph: { spacing: { before: 400, after: 120 } },
        },
        heading2: {
          run: { bold: true, size: 28, color: '3730A3', font: 'Calibri' },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
        heading3: {
          run: { bold: true, size: 24, color: '334155', font: 'Calibri' },
          paragraph: { spacing: { before: 180, after: 60 } },
        },
        document: {
          run: { size: 22, font: 'Calibri', color: '1E293B' },
          paragraph: { spacing: { after: 80 }, alignment: AlignmentType.LEFT },
        },
      },
    },
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${projectName.replace(/\s+/g, '_')}_Technical_Specification_v${docVersion}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
