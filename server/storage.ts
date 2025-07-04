import { 
  Contact, 
  InsertContact, 
  Automation, 
  InsertAutomation, 
  ConversationFlow, 
  InsertConversationFlow, 
  Setting, 
  InsertSetting 
} from "@shared/schema";

export interface Storage {
  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Automations
  getAutomations(): Promise<Automation[]>;
  getAutomation(id: number): Promise<Automation | undefined>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: number, automation: Partial<Automation>): Promise<Automation>;
  deleteAutomation(id: number): Promise<void>;

  // Conversation flows
  getConversationFlows(): Promise<ConversationFlow[]>;
  getConversationFlow(id: number): Promise<ConversationFlow | undefined>;
  createConversationFlow(flow: InsertConversationFlow): Promise<ConversationFlow>;
  updateConversationFlow(id: number, flow: Partial<ConversationFlow>): Promise<ConversationFlow>;
  deleteConversationFlow(id: number): Promise<void>;

  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(id: number): Promise<Setting | undefined>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(id: number, setting: Partial<Setting>): Promise<Setting>;
  deleteSetting(id: number): Promise<void>;
}

export class MemoryStorage implements Storage {
  private nextId = 1;
  private contacts: Map<number, Contact> = new Map();
  private automations: Map<number, Automation> = new Map();
  private conversationFlows: Map<number, ConversationFlow> = new Map();
  private settings: Map<number, Setting> = new Map();

  constructor() {
    // Initialize default settings
    this.settings.set(1, { id: 1, key: "defaultInterval", value: "5" });
    this.settings.set(2, { id: 2, key: "maxMessagesPerHour", value: "100" });
    this.settings.set(3, { id: 3, key: "darkMode", value: "true" });
    this.settings.set(4, { id: 4, key: "exportFormat", value: "csv" });
    this.settings.set(5, { id: 5, key: "includeTimestamps", value: "true" });
    
    // NOT using sample data - only real WhatsApp data
    this.nextId = 1;
  }
  


  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.nextId++;
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

  async createAutomation(insertAutomation: InsertAutomation): Promise<Automation> {
    const id = this.nextId++;
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

  // Conversation flows
  async getConversationFlows(): Promise<ConversationFlow[]> {
    return Array.from(this.conversationFlows.values());
  }

  async getConversationFlow(id: number): Promise<ConversationFlow | undefined> {
    return this.conversationFlows.get(id);
  }

  async createConversationFlow(insertFlow: InsertConversationFlow): Promise<ConversationFlow> {
    const id = this.nextId++;
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

  // Settings
  async getSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(id: number): Promise<Setting | undefined> {
    return this.settings.get(id);
  }

  async createSetting(setting: InsertSetting): Promise<Setting> {
    const id = this.settings.size + 1;
    const newSetting: Setting = { ...setting, id };
    this.settings.set(id, newSetting);
    return newSetting;
  }

  async updateSetting(id: number, update: Partial<Setting>): Promise<Setting> {
    const setting = this.settings.get(id);
    if (!setting) throw new Error("Setting not found");
    const updated = { ...setting, ...update };
    this.settings.set(id, updated);
    return updated;
  }

  async deleteSetting(id: number): Promise<void> {
    this.settings.delete(id);
  }
}

export const storage = new MemoryStorage();
