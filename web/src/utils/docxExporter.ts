import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import { ensureArray, formatBoolean } from './helpers';

// Helper to trigger browser download
export function downloadDocxBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Styling Constants
const PRIMARY_COLOR = '1E40AF'; // Deep Blue
const SECONDARY_COLOR = '2563EB'; // Royal Blue
const HEADER_BG = 'F1F5F9'; // Light Slate
const ZEBRA_BG = 'F8FAFC'; // Very light slate
const BORDER_COLOR = 'CBD5E1';

const cellBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
};

function createHeaderCell(text: string, widthPercent?: number): TableCell {
  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: HEADER_BG },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: cellBorder,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text,
            bold: true,
            size: 20, // 10pt
            color: '0F172A',
          }),
        ],
      }),
    ],
  });
}

function createDataCell(
  content: string | Paragraph[],
  options?: { isZebra?: boolean; widthPercent?: number; bold?: boolean; fontColor?: string; italic?: boolean }
): TableCell {
  const children = typeof content === 'string'
    ? [
        new Paragraph({
          children: [
            new TextRun({
              text: content || '-',
              size: 19, // 9.5pt
              bold: options?.bold,
              color: options?.fontColor || '334155',
              italics: options?.italic,
            }),
          ],
        }),
      ]
    : content;

  return new TableCell({
    width: options?.widthPercent ? { size: options?.widthPercent, type: WidthType.PERCENTAGE } : undefined,
    shading: options?.isZebra ? { fill: ZEBRA_BG } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    borders: cellBorder,
    children,
  });
}

function createDocHeader(moduleName: string, title: string) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32, // 16pt
          color: PRIMARY_COLOR,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Module: ${moduleName}  |  Exported: ${new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          size: 18,
          color: '64748B',
          italics: true,
        }),
      ],
      spacing: { after: 300 },
    }),
  ];
}

// 1. EXPORT ACTIONS
export async function exportActionsToDocx(moduleName: string, actions: any[]) {
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('No', 6),
        createHeaderCell('Action Name', 24),
        createHeaderCell('Description', 26),
        createHeaderCell('Inputs', 22),
        createHeaderCell('Outputs', 22),
      ],
    }),
  ];

  actions.forEach((act, idx) => {
    const isZebra = idx % 2 === 1;
    const inputParams = ensureArray(act?.InputParameters?.InputParameter);
    const outputParams = ensureArray(act?.OutputParameters?.OutputParameter);

    const inputParagraphs = inputParams.length === 0
      ? [new Paragraph({ children: [new TextRun({ text: '-', italics: true, size: 18, color: '94A3B8' })] })]
      : inputParams.map(
          (ip) =>
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `• ${ip.Name || '-'}`, bold: true, size: 18, color: '1E3A8A' }),
                new TextRun({ text: ` (${ip.DataType || 'Text'})`, size: 17, color: '64748B' }),
                formatBoolean(ip.IsMandatory)
                  ? new TextRun({ text: ' [Mandatory]', size: 16, color: 'DC2626', bold: true })
                  : new TextRun({ text: '' }),
              ],
            })
        );

    const outputParagraphs = outputParams.length === 0
      ? [new Paragraph({ children: [new TextRun({ text: '-', italics: true, size: 18, color: '94A3B8' })] })]
      : outputParams.map(
          (op) =>
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `• ${op.Name || '-'}`, bold: true, size: 18, color: '065F46' }),
                new TextRun({ text: ` (${op.DataType || 'Text'})`, size: 17, color: '64748B' }),
              ],
            })
        );

    const badges = [];
    if (act.Function === 'Yes') badges.push('[Function]');
    if (act.Public === 'Yes') badges.push('[Public]');
    const nameExtra = badges.length ? ` ${badges.join(' ')}` : '';

    rows.push(
      new TableRow({
        children: [
          createDataCell(String(idx + 1), { isZebra, widthPercent: 6 }),
          createDataCell(
            [
              new Paragraph({
                children: [
                  new TextRun({ text: act.Name || 'Unnamed Action', bold: true, size: 19, color: '0F172A' }),
                  nameExtra
                    ? new TextRun({ text: nameExtra, size: 16, color: '2563EB', bold: true })
                    : new TextRun({ text: '' }),
                ],
              }),
            ],
            { isZebra, widthPercent: 24 }
          ),
          createDataCell(act.Description || '-', { isZebra, widthPercent: 26 }),
          createDataCell(inputParagraphs, { isZebra, widthPercent: 22 }),
          createDataCell(outputParagraphs, { isZebra, widthPercent: 22 }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `OutSystems Module: ${moduleName}`, size: 16, color: '94A3B8' })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...createDocHeader(moduleName, 'Server Actions Specification'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Server_Actions.docx`);
}

// 2. EXPORT SERVICE ACTIONS
export async function exportServiceActionsToDocx(moduleName: string, serviceActions: any[]) {
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('No', 6),
        createHeaderCell('Service Action (API)', 24),
        createHeaderCell('Description', 26),
        createHeaderCell('Inputs', 22),
        createHeaderCell('Outputs', 22),
      ],
    }),
  ];

  serviceActions.forEach((act, idx) => {
    const isZebra = idx % 2 === 1;
    const inputParams = ensureArray(act?.InputParameters?.InputParameter);
    const outputParams = ensureArray(act?.OutputParameters?.OutputParameter);

    const inputParagraphs = inputParams.length === 0
      ? [new Paragraph({ children: [new TextRun({ text: '-', italics: true, size: 18, color: '94A3B8' })] })]
      : inputParams.map(
          (ip) =>
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `• ${ip.Name || '-'}`, bold: true, size: 18, color: '1E3A8A' }),
                new TextRun({ text: ` (${ip.DataType || 'Text'})`, size: 17, color: '64748B' }),
                formatBoolean(ip.IsMandatory)
                  ? new TextRun({ text: ' [Mandatory]', size: 16, color: 'DC2626', bold: true })
                  : new TextRun({ text: '' }),
              ],
            })
        );

    const outputParagraphs = outputParams.length === 0
      ? [new Paragraph({ children: [new TextRun({ text: '-', italics: true, size: 18, color: '94A3B8' })] })]
      : outputParams.map(
          (op) =>
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `• ${op.Name || '-'}`, bold: true, size: 18, color: '065F46' }),
                new TextRun({ text: ` (${op.DataType || 'Text'})`, size: 17, color: '64748B' }),
              ],
            })
        );

    rows.push(
      new TableRow({
        children: [
          createDataCell(String(idx + 1), { isZebra, widthPercent: 6 }),
          createDataCell(
            [
              new Paragraph({
                children: [
                  new TextRun({ text: act.Name || 'Unnamed Action', bold: true, size: 19, color: '0F172A' }),
                  act.Public === 'Yes'
                    ? new TextRun({ text: ' [Public API]', size: 16, color: '059669', bold: true })
                    : new TextRun({ text: '' }),
                ],
              }),
            ],
            { isZebra, widthPercent: 24 }
          ),
          createDataCell(act.Description || '-', { isZebra, widthPercent: 26 }),
          createDataCell(inputParagraphs, { isZebra, widthPercent: 22 }),
          createDataCell(outputParagraphs, { isZebra, widthPercent: 22 }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...createDocHeader(moduleName, 'Service Actions (Public APIs) Specification'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Service_Actions.docx`);
}

// 3. EXPORT ENTITIES
export async function exportEntitiesToDocx(moduleName: string, entities: any[]) {
  const children: any[] = [...createDocHeader(moduleName, 'Database Entities & Data Dictionary')];

  entities.forEach((entity, eIdx) => {
    const attributes = ensureArray(entity?.Attributes?.Attribute);
    const isPublic = entity.Public === 'Yes' || entity.ExposeReadOnly === 'Yes';

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({ text: `${eIdx + 1}. Entity: ${entity.Name || 'Unnamed'}`, bold: true, size: 26, color: SECONDARY_COLOR }),
          isPublic ? new TextRun({ text: ' (Public)', size: 20, color: '059669', bold: true }) : new TextRun({ text: '' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: `Key: ${entity.Key || '-'}  |  Attributes: ${attributes.length} Columns  |  Description: ${entity.Description || '-'}`,
            size: 18,
            color: '64748B',
            italics: true,
          }),
        ],
      })
    );

    const attrRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell('No', 6),
          createHeaderCell('Attribute Name', 28),
          createHeaderCell('Data Type', 22),
          createHeaderCell('Length', 12),
          createHeaderCell('Delete Rule', 16),
          createHeaderCell('Mandatory', 16),
        ],
      }),
    ];

    attributes.forEach((attr, aIdx) => {
      const isZebra = aIdx % 2 === 1;
      const isMandatory = formatBoolean(attr.IsMandatory);
      const isAutoNumber = formatBoolean(attr.IsAutoNumber);

      attrRows.push(
        new TableRow({
          children: [
            createDataCell(String(aIdx + 1), { isZebra, widthPercent: 6 }),
            createDataCell(
              [
                new Paragraph({
                  children: [
                    new TextRun({ text: attr.Name || '-', bold: true, size: 19 }),
                    isAutoNumber
                      ? new TextRun({ text: ' [AutoNumber]', size: 15, color: '059669', bold: true })
                      : new TextRun({ text: '' }),
                  ],
                }),
              ],
              { isZebra, widthPercent: 28 }
            ),
            createDataCell(attr.DataType || '-', { isZebra, widthPercent: 22 }),
            createDataCell(String(attr.Length || '-'), { isZebra, widthPercent: 12 }),
            createDataCell(attr.DeleteRule || '-', { isZebra, widthPercent: 16 }),
            createDataCell(isMandatory ? 'Yes' : 'No', {
              isZebra,
              widthPercent: 16,
              bold: isMandatory,
              fontColor: isMandatory ? 'DC2626' : '64748B',
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: attrRows,
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Database_Entities.docx`);
}

// 4. EXPORT STATIC ENTITIES
export async function exportStaticEntitiesToDocx(moduleName: string, staticEntities: any[]) {
  const children: any[] = [...createDocHeader(moduleName, 'Static Entities & Records (Lookup/Enums)')];

  staticEntities.forEach((entity, eIdx) => {
    const attributes = ensureArray(entity?.Attributes?.Attribute);
    const records = ensureArray(entity?.StaticRecords?.StaticRecord);

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({ text: `${eIdx + 1}. Static Entity: ${entity.Name || 'Unnamed'}`, bold: true, size: 26, color: SECONDARY_COLOR }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: `Key: ${entity.Key || '-'}  |  Attributes: ${attributes.length} Columns  |  Records Count: ${records.length} items`,
            size: 18,
            color: '64748B',
            italics: true,
          }),
        ],
      })
    );

    // Attributes table
    if (attributes.length > 0) {
      const attrRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('No', 8),
            createHeaderCell('Attribute Name', 42),
            createHeaderCell('Data Type', 30),
            createHeaderCell('Length', 20),
          ],
        }),
      ];

      attributes.forEach((attr, aIdx) => {
        const isZebra = aIdx % 2 === 1;
        attrRows.push(
          new TableRow({
            children: [
              createDataCell(String(aIdx + 1), { isZebra, widthPercent: 8 }),
              createDataCell(attr.Name || '-', { isZebra, widthPercent: 42, bold: true }),
              createDataCell(attr.DataType || '-', { isZebra, widthPercent: 30 }),
              createDataCell(String(attr.Length || '-'), { isZebra, widthPercent: 20 }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: attrRows,
        })
      );
    }

    // Records table
    if (records.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Static Records Data:', bold: true, size: 20, color: '0F172A' })],
          spacing: { before: 140, after: 60 },
        })
      );

      const recRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('No', 6),
            createHeaderCell('Identifier / Name', 44),
            createHeaderCell('Label / Description', 50),
          ],
        }),
      ];

      records.forEach((rec, rIdx) => {
        const isZebra = rIdx % 2 === 1;
        recRows.push(
          new TableRow({
            children: [
              createDataCell(String(rIdx + 1), { isZebra, widthPercent: 6 }),
              createDataCell(rec.Identifier || rec.Name || '-', { isZebra, widthPercent: 44, bold: true }),
              createDataCell(rec.Label || rec.Description || '-', { isZebra, widthPercent: 50 }),
            ],
          })
        );
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: recRows,
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Static_Entities.docx`);
}

// 5. EXPORT EXCEPTIONS
export async function exportExceptionsToDocx(moduleName: string, exceptions: any[]) {
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('No', 8),
        createHeaderCell('Exception Name', 42),
        createHeaderCell('Category', 25),
        createHeaderCell('Last Modified By', 25),
      ],
    }),
  ];

  exceptions.forEach((ex, idx) => {
    const isZebra = idx % 2 === 1;
    rows.push(
      new TableRow({
        children: [
          createDataCell(String(idx + 1), { isZebra, widthPercent: 8 }),
          createDataCell(ex.Name || '-', { isZebra, widthPercent: 42, bold: true, fontColor: '991B1B' }),
          createDataCell(ex.category || '-', { isZebra, widthPercent: 25 }),
          createDataCell(ex.LastModifiedBy || '-', { isZebra, widthPercent: 25 }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...createDocHeader(moduleName, 'Custom Exceptions Specification'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Exceptions.docx`);
}

// 6. EXPORT STRUCTURES
export async function exportStructuresToDocx(moduleName: string, structures: any[]) {
  const children: any[] = [...createDocHeader(moduleName, 'Data Structures Specification')];

  structures.forEach((struct, sIdx) => {
    const attributes = ensureArray(struct?.Attributes?.Attribute);

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({ text: `${sIdx + 1}. Structure: ${struct.Name || 'Unnamed'}`, bold: true, size: 26, color: SECONDARY_COLOR }),
          struct.Public === 'Yes' ? new TextRun({ text: ' (Public)', size: 20, color: '059669', bold: true }) : new TextRun({ text: '' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: `Description: ${struct.Description || '-'}  |  Attributes: ${attributes.length} fields`,
            size: 18,
            color: '64748B',
            italics: true,
          }),
        ],
      })
    );

    const attrRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell('No', 8),
          createHeaderCell('Field Name', 32),
          createHeaderCell('Data Type', 25),
          createHeaderCell('Length', 15),
          createHeaderCell('Mandatory', 20),
        ],
      }),
    ];

    attributes.forEach((attr, aIdx) => {
      const isZebra = aIdx % 2 === 1;
      const isMandatory = formatBoolean(attr.IsMandatory);
      attrRows.push(
        new TableRow({
          children: [
            createDataCell(String(aIdx + 1), { isZebra, widthPercent: 8 }),
            createDataCell(attr.Name || '-', { isZebra, widthPercent: 32, bold: true }),
            createDataCell(attr.DataType || '-', { isZebra, widthPercent: 25 }),
            createDataCell(String(attr.Length || '-'), { isZebra, widthPercent: 15 }),
            createDataCell(isMandatory ? 'Yes' : 'No', {
              isZebra,
              widthPercent: 20,
              bold: isMandatory,
              fontColor: isMandatory ? 'DC2626' : '64748B',
            }),
          ],
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: attrRows,
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Structures.docx`);
}

// 7. EXPORT ROLES
export async function exportRolesToDocx(moduleName: string, roles: any[]) {
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('No', 8),
        createHeaderCell('Role Name', 40),
        createHeaderCell('Description', 52),
      ],
    }),
  ];

  roles.forEach((role, idx) => {
    const isZebra = idx % 2 === 1;
    rows.push(
      new TableRow({
        children: [
          createDataCell(String(idx + 1), { isZebra, widthPercent: 8 }),
          createDataCell(role.Name || '-', { isZebra, widthPercent: 40, bold: true, fontColor: '1E3A8A' }),
          createDataCell(role.Description || '-', { isZebra, widthPercent: 52 }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...createDocHeader(moduleName, 'Security Roles Specification'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Roles.docx`);
}

// 8. EXPORT SITE PROPERTIES
export async function exportSitePropertiesToDocx(moduleName: string, siteProps: any[]) {
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell('No', 8),
        createHeaderCell('Property Name', 36),
        createHeaderCell('Data Type', 24),
        createHeaderCell('Description', 32),
      ],
    }),
  ];

  siteProps.forEach((prop, idx) => {
    const isZebra = idx % 2 === 1;
    const isSystem = formatBoolean(prop.IsSystem);
    rows.push(
      new TableRow({
        children: [
          createDataCell(String(idx + 1), { isZebra, widthPercent: 8 }),
          createDataCell(
            [
              new Paragraph({
                children: [
                  new TextRun({ text: prop.Name || '-', bold: true, size: 19 }),
                  isSystem ? new TextRun({ text: ' [System]', size: 15, color: '64748B' }) : new TextRun({ text: '' }),
                ],
              }),
            ],
            { isZebra, widthPercent: 36 }
          ),
          createDataCell(prop.DataType || '-', { isZebra, widthPercent: 24 }),
          createDataCell(prop.Description || '-', { isZebra, widthPercent: 32 }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...createDocHeader(moduleName, 'Site Properties Specification'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Site_Properties.docx`);
}

// 9. EXPORT FULL MODULE (ALL TABS COMBINED)
export async function exportFullModuleToDocx(moduleName: string, rawData: Record<string, any> | null) {
  if (!rawData) return;

  const children: any[] = [
    ...createDocHeader(moduleName, `OutSystems Technical Specification: ${moduleName}`),
  ];

  // Overview Info
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: '1. Module Overview', bold: true, size: 24, color: PRIMARY_COLOR })],
    })
  );

  const overviewRows: TableRow[] = [
    new TableRow({
      children: [
        createHeaderCell('Property', 30),
        createHeaderCell('Value', 70),
      ],
    }),
    new TableRow({
      children: [
        createDataCell('Module Name', { bold: true, widthPercent: 30 }),
        createDataCell(rawData.Name || moduleName, { widthPercent: 70 }),
      ],
    }),
    new TableRow({
      children: [
        createDataCell('Module Key', { bold: true, widthPercent: 30 }),
        createDataCell(rawData.Key || '-', { widthPercent: 70 }),
      ],
    }),
    new TableRow({
      children: [
        createDataCell('Module Type', { bold: true, widthPercent: 30 }),
        createDataCell(rawData.ModuleType || '-', { widthPercent: 70 }),
      ],
    }),
    new TableRow({
      children: [
        createDataCell('Use Cookies', { bold: true, widthPercent: 30 }),
        createDataCell(rawData.UseCookies || '-', { widthPercent: 70 }),
      ],
    }),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: overviewRows,
    })
  );

  // Entities
  const allEntities = ensureArray(rawData?.Entities?.Entity);
  const regularEntities = allEntities.filter((e: any) => e?.IsStaticEntity !== 'Yes' && e?.isStaticEntity !== true);
  if (regularEntities.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: `2. Database Entities (${regularEntities.length})`, bold: true, size: 24, color: PRIMARY_COLOR })],
      })
    );

    regularEntities.forEach((entity: any) => {
      const attributes = ensureArray(entity?.Attributes?.Attribute);
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 60 },
          children: [new TextRun({ text: `Entity: ${entity.Name || '-'}`, bold: true, size: 20, color: SECONDARY_COLOR })],
        })
      );

      const attrRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: [
            createHeaderCell('Attribute Name', 35),
            createHeaderCell('Data Type', 30),
            createHeaderCell('Length', 15),
            createHeaderCell('Mandatory', 20),
          ],
        }),
      ];

      attributes.forEach((attr: any, aIdx: number) => {
        const isZebra = aIdx % 2 === 1;
        const isMandatory = formatBoolean(attr.IsMandatory);
        attrRows.push(
          new TableRow({
            children: [
              createDataCell(attr.Name || '-', { isZebra, widthPercent: 35, bold: true }),
              createDataCell(attr.DataType || '-', { isZebra, widthPercent: 30 }),
              createDataCell(String(attr.Length || '-'), { isZebra, widthPercent: 15 }),
              createDataCell(isMandatory ? 'Yes' : 'No', { isZebra, widthPercent: 20, fontColor: isMandatory ? 'DC2626' : undefined }),
            ],
          })
        );
      });

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: attrRows }));
    });
  }

  // Actions
  const actions = ensureArray(rawData?.Actions?.Action);
  if (actions.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: `3. Server Actions (${actions.length})`, bold: true, size: 24, color: PRIMARY_COLOR })],
      })
    );

    const actRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          createHeaderCell('No', 8),
          createHeaderCell('Action Name', 32),
          createHeaderCell('Description', 60),
        ],
      }),
    ];

    actions.forEach((act: any, idx: number) => {
      actRows.push(
        new TableRow({
          children: [
            createDataCell(String(idx + 1), { isZebra: idx % 2 === 1, widthPercent: 8 }),
            createDataCell(act.Name || '-', { isZebra: idx % 2 === 1, widthPercent: 32, bold: true }),
            createDataCell(act.Description || '-', { isZebra: idx % 2 === 1, widthPercent: 60 }),
          ],
        })
      );
    });

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: actRows }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadDocxBlob(blob, `${moduleName}_Full_Specification.docx`);
}

