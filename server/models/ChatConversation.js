import mongoose from 'mongoose';

const chatConversationSchema = new mongoose.Schema({
  serviceRequestId: { type: Number, required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const ChatConversation = mongoose.models.ChatConversation || mongoose.model('ChatConversation', chatConversationSchema);
