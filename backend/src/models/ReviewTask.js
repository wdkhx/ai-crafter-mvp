import mongoose from 'mongoose';

const reviewTaskSchema = new mongoose.Schema(
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
    estimatedRemainingSeconds: { type: Number, default: 420 },
    input: {
      topic: String,
      depth: String,
      audience: String,
      focus: String
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
      subtitle: String,
      executiveSummary: String,
      sections: [
        {
          heading: String,
          content: String,
          bullets: [String]
        }
      ],
      signals: [
        {
          source: String,
          name: String,
          url: String,
          publishedAt: Date,
          summary: String,
          heatScore: Number,
          tags: [String]
        }
      ],
      fullText: String,
      metrics: {
        wordCount: Number,
        signalCount: Number,
        generatedAt: Date
      }
    },
    errorMessage: String,
    cancelledAt: Date,
    finishedAt: Date
  },
  { timestamps: true }
);

reviewTaskSchema.index({ userId: 1, createdAt: -1 });

export const ReviewTask = mongoose.model('ReviewTask', reviewTaskSchema);
