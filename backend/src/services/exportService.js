import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { ReviewTask } from '../models/ReviewTask.js';

export async function buildReviewDocx(userId, taskId) {
  const task = await ReviewTask.findOne({ userId, taskId }).lean();
  if (!task) {
    const error = new Error('任务不存在');
    error.status = 404;
    error.code = 'TASK_NOT_FOUND';
    throw error;
  }
  if (task.status !== 'succeeded' || !task.result) {
    const error = new Error('任务尚未生成完成，无法导出');
    error.status = 400;
    error.code = 'TASK_NOT_READY';
    throw error;
  }

  const children = [
    new Paragraph({ text: task.result.title, heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [new TextRun({ text: task.result.subtitle || '', color: '666666', size: 20 })],
      spacing: { after: 260 }
    }),
    new Paragraph({ text: '执行摘要', heading: HeadingLevel.HEADING_1 }),
    paragraph(task.result.executiveSummary)
  ];

  for (const section of task.result.sections || []) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    children.push(paragraph(section.content));
    for (const item of section.bullets || []) {
      children.push(new Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 90 } }));
    }
  }

  children.push(new Paragraph({ text: '来源信号', heading: HeadingLevel.HEADING_1 }));
  for (const [index, signal] of (task.result.signals || []).entries()) {
    children.push(paragraph(`[${index + 1}] ${signal.source}. ${signal.name}. ${signal.url || ''}`, 21));
  }

  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [
        new TextRun({
          text: '声明：本文档由 AI CRAFTER 基于公开技术信号辅助生成，请结合原始来源复核事实、时间和结论。',
          italics: true,
          color: '666666',
          size: 20
        })
      ]
    })
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return {
    buffer: await Packer.toBuffer(doc),
    filename: `${sanitizeFilename(task.result.title || 'frontier-review')}.docx`
  };
}

function paragraph(text, size = 24) {
  return new Paragraph({
    children: [new TextRun({ text: String(text || ''), size })],
    spacing: { after: 220 },
    alignment: AlignmentType.BOTH
  });
}

function sanitizeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, '').slice(0, 80) || 'frontier-review';
}
