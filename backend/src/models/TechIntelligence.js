import mongoose from 'mongoose';

const techIntelligenceSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    source: { type: String, required: true },
    url: String,
    publishedAt: Date,
    summary: String,
    applicationAdvice: String,
    tags: [String],
    heatScore: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    comments: [
      {
        author: String,
        content: String,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

techIntelligenceSchema.index({ publishedAt: -1, heatScore: -1 });

export const TechIntelligence = mongoose.model('TechIntelligence', techIntelligenceSchema);
