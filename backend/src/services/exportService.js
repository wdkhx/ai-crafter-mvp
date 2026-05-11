import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { PaperTask } from '../models/PaperTask.js';

export async function buildPaperDocx(userId, taskId) {
  const task = await PaperTask.findOne({ userId, taskId }).lean();
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
    new Paragraph({
      text: task.result.title,
      heading: HeadingLevel.TITLE
    }),
    new Paragraph({
      children: [new TextRun({ text: task.result.abstract, size: 24 })],
      spacing: { after: 240 }
    })
  ];

  for (const section of task.result.sections || []) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.content, size: 24 })],
        spacing: { after: 240 }
      })
    );
  }

  children.push(new Paragraph({ text: '参考文献', heading: HeadingLevel.HEADING_1 }));
  for (const reference of task.result.references || []) {
    children.push(new Paragraph({ children: [new TextRun({ text: reference, size: 22 })] }));
  }

  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [
        new TextRun({
          text: '声明：本文档由 AI CRAFTER 辅助生成，仅用于学习、研究和写作参考，禁止用于学术不端行为。',
          italics: true,
          size: 20
        })
      ]
    })
  );

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  return {
    buffer: await Packer.toBuffer(doc),
    filename: `${sanitizeFilename(task.result.title || 'paper')}.docx`
  };
}

function sanitizeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, '').slice(0, 80) || 'paper';
}
