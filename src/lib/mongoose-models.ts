import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  ticketId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "file" | "system";
  fileUrl?: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    ticketId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "file", "system"], default: "text" },
    fileUrl: { type: String },
  },
  { timestamps: true }
);

MessageSchema.index({ ticketId: 1, createdAt: -1 });

export const Message =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export interface IChatSeen extends Document {
  ticketId: string;
  userId: string;
  userName: string;
  lastSeenAt: Date;
}

const ChatSeenSchema = new Schema<IChatSeen>({
  ticketId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  lastSeenAt: { type: Date, default: Date.now },
});

ChatSeenSchema.index({ ticketId: 1, userId: 1 }, { unique: true });

export const ChatSeen =
  mongoose.models.ChatSeen ||
  mongoose.model<IChatSeen>("ChatSeen", ChatSeenSchema);
