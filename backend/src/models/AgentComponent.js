import mongoose from 'mongoose';

const agentComponentSchema = new mongoose.Schema(
  {
    componentId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    version: { type: String, default: '1.0.0' },
    inputSchema: { type: Object, default: {} },
    outputSchema: { type: Object, default: {} },
    implementationNote: { type: String, default: '' },
    testCases: { type: Array, default: [] },
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const AgentComponent = mongoose.model('AgentComponent', agentComponentSchema);
