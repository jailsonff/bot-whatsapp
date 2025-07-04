import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  tag: text("tag").notNull(), // cliente, amigo, familia, nao_agendado
  lastConversation: timestamp("last_conversation"),
  isActive: boolean("is_active").default(true),
});

export const automations = pgTable("automations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  keywords: text("keywords").array().notNull(),
  response: text("response").notNull(),
  delay: integer("delay").default(2), // seconds
  isActive: boolean("is_active").default(true),
  executions: integer("executions").default(0),
});

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  message: text("message").notNull(),
  targetTags: text("target_tags").array().notNull(),
  interval: integer("interval").default(5), // seconds
  scheduledFor: timestamp("scheduled_for"),
  status: text("status").default("draft"), // draft, active, completed, paused
  sent: integer("sent").default(0),
  total: integer("total").default(0),
});

export const conversationFlows = pgTable("conversation_flows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  triggerKeywords: text("trigger_keywords").array().notNull(),
  responses: text("responses").array().notNull(),
  isActive: boolean("is_active").default(true),
  executions: integer("executions").default(0),
});

export const whatsappStatus = pgTable("whatsapp_status", {
  id: serial("id").primaryKey(),
  isConnected: boolean("is_connected").default(false),
  lastConnected: timestamp("last_connected"),
  autoReconnect: boolean("auto_reconnect").default(true),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertAutomationSchema = createInsertSchema(automations).omit({ id: true, executions: true });
export const insertBroadcastSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  targetTags: z.array(z.string()).min(1, "Selecione pelo menos uma categoria"),
  interval: z.coerce.number().min(1).max(300).default(5),
  scheduledFor: z.string().nullable().optional(),
  status: z.string().default("draft"),
  total: z.coerce.number().min(0, "Total deve ser maior ou igual a 0")
});
export const insertConversationFlowSchema = createInsertSchema(conversationFlows).omit({ id: true, executions: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type ConversationFlow = typeof conversationFlows.$inferSelect;
export type InsertConversationFlow = z.infer<typeof insertConversationFlowSchema>;
export type WhatsappStatus = typeof whatsappStatus.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
