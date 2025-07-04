import { 
  Contact, 
  InsertContact, 
  Automation, 
  InsertAutomation, 
  Broadcast, 
  InsertBroadcast, 
  ConversationFlow, 
  InsertConversationFlow, 
  WhatsappStatus, 
  Settings, 
  InsertSettings 
} from "@shared/schema";

export interface IStorage {
  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByPhone(phone: string): Promise<Contact | undefined>;
  getContactsByTag(tag: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Automations
  getAutomations(): Promise<Automation[]>;
  getAutomation(id: number): Promise<Automation | undefined>;
  getActiveAutomations(): Promise<Automation[]>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: number, automation: Partial<Automation>): Promise<Automation>;
  deleteAutomation(id: number): Promise<void>;

  // Broadcasts
  getBroadcasts(): Promise<Broadcast[]>;
  getBroadcast(id: number): Promise<Broadcast | undefined>;
  createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast>;
  updateBroadcast(id: number, broadcast: Partial<Broadcast>): Promise<Broadcast>;
  deleteBroadcast(id: number): Promise<void>;

  // Conversation Flows
  getConversationFlows(): Promise<ConversationFlow[]>;
  getConversationFlow(id: number): Promise<ConversationFlow | undefined>;
  getActiveConversationFlows(): Promise<ConversationFlow[]>;
  createConversationFlow(flow: InsertConversationFlow): Promise<ConversationFlow>;
  updateConversationFlow(id: number, flow: Partial<ConversationFlow>): Promise<ConversationFlow>;
  deleteConversationFlow(id: number): Promise<void>;

  // WhatsApp Status
  getWhatsappStatus(): Promise<WhatsappStatus>;
  updateWhatsappStatus(status: Partial<WhatsappStatus>): Promise<WhatsappStatus>;

  // Settings
  getSettings(): Promise<Settings[]>;
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(setting: InsertSettings): Promise<Settings>;
  updateSetting(key: string, value: string): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private contacts: Map<number, Contact> = new Map();
  private automations: Map<number, Automation> = new Map();
  private broadcasts: Map<number, Broadcast> = new Map();
  private conversationFlows: Map<number, ConversationFlow> = new Map();
  private whatsappStatus: WhatsappStatus = {
    id: 1,
    isConnected: false,
    lastConnected: null,
    autoReconnect: true
  };
  private settings: Map<string, Settings> = new Map();
  private currentId = 1;

  constructor() {
    // Initialize default settings
    this.settings.set("defaultInterval", { id: 1, key: "defaultInterval", value: "5" });
    this.settings.set("maxMessagesPerHour", { id: 2, key: "maxMessagesPerHour", value: "100" });
    this.settings.set("darkMode", { id: 3, key: "darkMode", value: "true" });
    this.settings.set("exportFormat", { id: 4, key: "exportFormat", value: "csv" });
    this.settings.set("includeTimestamps", { id: 5, key: "includeTimestamps", value: "true" });
    
    // NOT using sample data - only real WhatsApp data
    this.currentId = 1;
  }
  


  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactByPhone(phone: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(c => c.phone === phone);
  }

  async getContactsByTag(tag: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(c => c.tag === tag);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentId++;
    const contact: Contact = {
      ...insertContact,
      id,
      lastConversation: insertContact.lastConversation || null,
      isActive: insertContact.isActive ?? true
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: number, update: Partial<Contact>): Promise<Contact> {
    const contact = this.contacts.get(id);
    if (!contact) throw new Error("Contact not found");
    const updated = { ...contact, ...update };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: number): Promise<void> {
    this.contacts.delete(id);
  }

  // Automations
  async getAutomations(): Promise<Automation[]> {
    return Array.from(this.automations.values());
  }

  async getAutomation(id: number): Promise<Automation | undefined> {
    return this.automations.get(id);
  }

  async getActiveAutomations(): Promise<Automation[]> {
    return Array.from(this.automations.values()).filter(a => a.isActive);
  }

  async createAutomation(insertAutomation: InsertAutomation): Promise<Automation> {
    const id = this.currentId++;
    const automation: Automation = {
      id,
      name: insertAutomation.name,
      description: insertAutomation.description || null,
      keywords: insertAutomation.keywords,
      response: insertAutomation.response,
      delay: insertAutomation.delay ?? 2,
      isActive: insertAutomation.isActive ?? true,
      executions: 0
    };
    this.automations.set(id, automation);
    return automation;
  }

  async updateAutomation(id: number, update: Partial<Automation>): Promise<Automation> {
    const automation = this.automations.get(id);
    if (!automation) throw new Error("Automation not found");
    const updated = { ...automation, ...update };
    this.automations.set(id, updated);
    return updated;
  }

  async deleteAutomation(id: number): Promise<void> {
    this.automations.delete(id);
  }

  // Broadcasts
  async getBroadcasts(): Promise<Broadcast[]> {
    return Array.from(this.broadcasts.values());
  }

  async getBroadcast(id: number): Promise<Broadcast | undefined> {
    return this.broadcasts.get(id);
  }

  async createBroadcast(insertBroadcast: InsertBroadcast): Promise<Broadcast> {
    const id = this.currentId++;
    
    console.log('🔧 Creating broadcast with data:', insertBroadcast);
    console.log('📊 insertBroadcast.total:', insertBroadcast.total);
    console.log('📊 typeof insertBroadcast.total:', typeof insertBroadcast.total);
    
    const totalValue = insertBroadcast.total ?? 0;
    console.log('📊 totalValue after ?? 0:', totalValue);
    
    const broadcast: Broadcast = {
      id,
      name: insertBroadcast.name,
      message: insertBroadcast.message,
      targetTags: insertBroadcast.targetTags,
      interval: insertBroadcast.interval ?? 5,
      status: insertBroadcast.status ?? "draft",
      sent: 0,
      total: totalValue, // PRESERVAR o total enviado
      scheduledFor: insertBroadcast.scheduledFor ? new Date(insertBroadcast.scheduledFor) : null
    };
    
    console.log('✅ Broadcast created with total:', broadcast.total);
    console.log('✅ Final broadcast object:', JSON.stringify(broadcast, null, 2));
    
    this.broadcasts.set(id, broadcast);
    return broadcast;
  }

  async updateBroadcast(id: number, update: Partial<Broadcast>): Promise<Broadcast> {
    const broadcast = this.broadcasts.get(id);
    if (!broadcast) throw new Error("Broadcast not found");
    const updated = { ...broadcast, ...update };
    this.broadcasts.set(id, updated);
    return updated;
  }

  async deleteBroadcast(id: number): Promise<void> {
    this.broadcasts.delete(id);
  }

  // Conversation Flows
  async getConversationFlows(): Promise<ConversationFlow[]> {
    return Array.from(this.conversationFlows.values());
  }

  async getConversationFlow(id: number): Promise<ConversationFlow | undefined> {
    return this.conversationFlows.get(id);
  }

  async getActiveConversationFlows(): Promise<ConversationFlow[]> {
    return Array.from(this.conversationFlows.values()).filter(f => f.isActive);
  }

  async createConversationFlow(insertFlow: InsertConversationFlow): Promise<ConversationFlow> {
    const id = this.currentId++;
    const flow: ConversationFlow = {
      id,
      name: insertFlow.name,
      description: insertFlow.description || null,
      triggerKeywords: insertFlow.triggerKeywords,
      responses: insertFlow.responses,
      isActive: insertFlow.isActive ?? true,
      executions: 0
    };
    this.conversationFlows.set(id, flow);
    return flow;
  }

  async updateConversationFlow(id: number, update: Partial<ConversationFlow>): Promise<ConversationFlow> {
    const flow = this.conversationFlows.get(id);
    if (!flow) throw new Error("Conversation flow not found");
    const updated = { ...flow, ...update };
    this.conversationFlows.set(id, updated);
    return updated;
  }

  async deleteConversationFlow(id: number): Promise<void> {
    this.conversationFlows.delete(id);
  }

  // WhatsApp Status
  async getWhatsappStatus(): Promise<WhatsappStatus> {
    return this.whatsappStatus;
  }

  async updateWhatsappStatus(update: Partial<WhatsappStatus>): Promise<WhatsappStatus> {
    this.whatsappStatus = { ...this.whatsappStatus, ...update };
    return this.whatsappStatus;
  }

  // Settings
  async getSettings(): Promise<Settings[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(key: string): Promise<Settings | undefined> {
    return this.settings.get(key);
  }

  async setSetting(setting: InsertSettings): Promise<Settings> {
    const id = this.settings.size + 1;
    const newSetting: Settings = { ...setting, id };
    this.settings.set(setting.key, newSetting);
    return newSetting;
  }

  async updateSetting(key: string, value: string): Promise<Settings> {
    const setting = this.settings.get(key);
    if (!setting) throw new Error("Setting not found");
    const updated = { ...setting, value };
    this.settings.set(key, updated);
    return updated;
  }
}

export const storage = new MemStorage();
