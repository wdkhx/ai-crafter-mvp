import mongoose from 'mongoose';

const paperTaskSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
      default: 'queued',
      index: true
    },
    progress: { type: Number, default: 0 },
    currentStep: { type: String, default: '排队中' },
    estimatedRemainingSeconds: { type: Number, default: 600 },
    input: {
      topic: String,
      wordCount: Number,
      referenceCount: Number,
      field: String,
      citationStyle: String,
      specialRequirements: String
    },
    workflowTrace: [
      {
        key: String,
        name: String,
        status: String,
        startedAt: Date,
        finishedAt: Date,
        summary: String
      }
    ],
    result: {
      title: String,
      abstract: String,
      sections: [
        {
          heading: String,
          content: String
        }
      ],
      references: [String],
      fullText: String,
      metrics: {
        wordCount: Number,
        referenceCount: Number,
        estimatedDuplicationRate: Number
      }
    },
    errorMessage: String,
    cancelledAt: Date,
    finishedAt: Date
  },
  { timestamps: true }
);

paperTaskSchema.index({ userId: 1, createdAt: -1 });

export const PaperTask = mongoose.model('PaperTask', paperTaskSchema);
