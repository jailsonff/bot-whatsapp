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
  trigger: text("trigger").notNull(),
  response: text("response").notNull(),
  isActive: boolean("is_active").default(true),
  executions: integer("executions").default(0),
});

export const conversationFlows = pgTable("conversation_flows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  steps: text("steps").array().notNull(),
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
export const insertConversationFlowSchema = createInsertSchema(conversationFlows).omit({ id: true, executions: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type ConversationFlow = typeof conversationFlows.$inferSelect;
export type InsertConversationFlow = z.infer<typeof insertConversationFlowSchema>;
export type WhatsappStatus = typeof whatsappStatus.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
