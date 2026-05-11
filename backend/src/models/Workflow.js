import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema(
  {
    workflowId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    version: { type: String, default: '1.0.0' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published'
    },
    nodes: { type: Array, default: [] },
    edges: { type: Array, default: [] },
    config: { type: Object, default: {} }
  },
  { timestamps: true }
);

export const Workflow = mongoose.model('Workflow', workflowSchema);
