export type { IMessage } from "@/lib/mongoose-models";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
  organizationType: string;
  organizationName: string;
}

export interface ChatMessage {
  _id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "file" | "system";
  fileUrl?: string;
  createdAt: string;
}
