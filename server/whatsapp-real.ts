import { makeWASocket, DisconnectReason, useMultiFileAuthState, WASocket, proto } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export interface RealWhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  fromMe: boolean;
  isGroup: boolean;
  participant?: string;
  chatName?: string;
}

export interface RealWhatsAppChat {
  id: string;
  name: string;
  phone: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  avatar?: string;
  participants?: string[];
}

export interface SavedContact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  dateAdded: Date;
  lastInteraction?: Date;
  notes?: string;
  gender?: string;
}

export class RealWhatsAppManager extends EventEmitter {
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private isConnected = false;
  private isConnecting = false;
  private authDir = './whatsapp_auth';
  private chats: Map<string, RealWhatsAppChat> = new Map();
  private messages: Map<string, RealWhatsAppMessage[]> = new Map();
  private savedContacts: Map<string, SavedContact> = new Map();
  
  // Arquivos de persistência
  private contactsFilePath = './saved_contacts.json';
  private chatsFilePath = './saved_chats.json';
  private messagesFilePath = './saved_messages.json';
  private configFilePath = './app_config.json';
  
  // Backup automático
  private backupDir = './backup';
  private autoSaveInterval: NodeJS.Timeout | null = null;
  
  // Flags para salvamento inteligente
  private pendingContactsSave = false;
  private pendingChatsSave = false;
  private pendingMessagesSave = false;
  private pendingConfigSave = false;

  constructor() {
    super();
    this.setupAuthDir();
    this.setupBackupDir();
    this.loadAllData();
    this.startAutoSave();
  }

  private setupAuthDir() {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  private setupBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Backup directory created: ${this.backupDir}`);
    }
  }

  // Carregar todos os dados na inicialização
  private loadAllData() {
    console.log('📂 Loading all persisted data...');
    this.loadSavedContacts();
    this.loadSavedChats();
    this.loadSavedMessages();
    this.loadAppConfig();
    console.log('✅ All data loaded successfully');
  }

  // Salvar todos os dados
  private saveAllData() {
    try {
      console.log('💾 Saving all data...');
      this.saveSavedContacts();
      this.saveSavedChats();
      this.saveSavedMessages();
      this.saveAppConfig();
      console.log('✅ All data saved successfully');
    } catch (error) {
      console.error('❌ Error saving data:', error);
    }
  }

  // Auto-save inteligente a cada 10 segundos
  private startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.performIntelligentSave();
    }, 10000); // 10 segundos
    
    console.log('⏰ Intelligent auto-save enabled (every 10 seconds)');
  }

  // Salvamento inteligente - salva apenas o que mudou
  private performIntelligentSave() {
    let saveCount = 0;
    
    if (this.pendingContactsSave) {
      console.log('🔄 Auto-saving contacts...');
      this.saveSavedContacts();
      this.pendingContactsSave = false;
      saveCount++;
    }
    
    if (this.pendingChatsSave) {
      console.log('🔄 Auto-saving chats...');
      this.saveSavedChats();
      this.pendingChatsSave = false;
      saveCount++;
    }
    
    if (this.pendingMessagesSave) {
      console.log('🔄 Auto-saving messages...');
      this.saveSavedMessages();
      this.pendingMessagesSave = false;
      saveCount++;
    }
    
    if (this.pendingConfigSave) {
      console.log('🔄 Auto-saving config...');
      this.saveAppConfig();
      this.pendingConfigSave = false;
      saveCount++;
    }
    
    // Criar backup a cada 5 minutos ou quando há muitas mudanças
    const now = Date.now();
    const lastBackupTime = this.lastBackupTime || 0;
    const timeSinceLastBackup = now - lastBackupTime;
    
    if (saveCount > 0 && (timeSinceLastBackup > 300000 || saveCount >= 3)) { // 5 minutos ou 3+ saves
      console.log('📦 Creating scheduled backup...');
      this.createBackup();
      this.lastBackupTime = now;
    }
    
    if (saveCount > 0) {
      console.log(`✅ Intelligent auto-save completed: ${saveCount} files saved`);
    }
  }

  private lastBackupTime = 0;

  // Criar backup com timestamp
  private createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupSubDir = `${this.backupDir}/${timestamp}`;
      
      if (!fs.existsSync(backupSubDir)) {
        fs.mkdirSync(backupSubDir, { recursive: true });
      }

      // Backup dos arquivos principais
      const filesToBackup = [
        this.contactsFilePath,
        this.chatsFilePath,
        this.messagesFilePath,
        this.configFilePath
      ];

      filesToBackup.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const fileName = filePath.split('/').pop() || filePath;
          const backupPath = `${backupSubDir}/${fileName}`;
          fs.copyFileSync(filePath, backupPath);
        }
      });

      // Manter apenas os últimos 10 backups
      this.cleanOldBackups();
      
      console.log(`📦 Backup created: ${backupSubDir}`);
    } catch (error) {
      console.error('❌ Error creating backup:', error);
    }
  }

  // Limpar backups antigos
  private cleanOldBackups() {
    try {
      const backupDirs = fs.readdirSync(this.backupDir)
        .filter(dir => fs.statSync(`${this.backupDir}/${dir}`).isDirectory())
        .sort()
        .reverse();

      if (backupDirs.length > 10) {
        const dirsToDelete = backupDirs.slice(10);
        dirsToDelete.forEach(dir => {
          fs.rmSync(`${this.backupDir}/${dir}`, { recursive: true, force: true });
          console.log(`🗑️ Old backup deleted: ${dir}`);
        });
      }
    } catch (error) {
      console.error('❌ Error cleaning old backups:', error);
    }
  }

  // Carregar contatos salvos
  private loadSavedContacts() {
    try {
      if (fs.existsSync(this.contactsFilePath)) {
        const data = fs.readFileSync(this.contactsFilePath, 'utf8');
        const contacts = JSON.parse(data);
        
        // Converter strings de data de volta para objetos Date
        contacts.forEach((contact: any) => {
          contact.dateAdded = new Date(contact.dateAdded);
          if (contact.lastInteraction) {
            contact.lastInteraction = new Date(contact.lastInteraction);
          }
          this.savedContacts.set(contact.id, contact);
        });
        
        console.log(`📋 Loaded ${contacts.length} saved contacts`);
      }
    } catch (error) {
      console.error('❌ Error loading saved contacts:', error);
    }
  }

  // Carregar chats salvos
  private loadSavedChats() {
    try {
      if (fs.existsSync(this.chatsFilePath)) {
        const data = fs.readFileSync(this.chatsFilePath, 'utf8');
        const chats = JSON.parse(data);
        
        chats.forEach((chat: RealWhatsAppChat) => {
          this.chats.set(chat.id, chat);
        });
        
        console.log(`💬 Loaded ${chats.length} saved chats`);
      }
    } catch (error) {
      console.error('❌ Error loading saved chats:', error);
    }
  }

  // Carregar mensagens salvas
  private loadSavedMessages() {
    try {
      if (fs.existsSync(this.messagesFilePath)) {
        const data = fs.readFileSync(this.messagesFilePath, 'utf8');
        const messagesData = JSON.parse(data);
        
        Object.entries(messagesData).forEach(([chatId, messages]) => {
          if (Array.isArray(messages)) {
            const parsedMessages = messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            this.messages.set(chatId, parsedMessages);
          }
        });
        
        const totalMessages = Object.values(messagesData).reduce((sum, msgs: any) => sum + msgs.length, 0);
        console.log(`💌 Loaded ${totalMessages} messages across ${Object.keys(messagesData).length} chats`);
      }
    } catch (error) {
      console.error('❌ Error loading saved messages:', error);
    }
  }

  // Carregar configurações da aplicação
  private loadAppConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const data = fs.readFileSync(this.configFilePath, 'utf8');
        const config = JSON.parse(data);
        
        // Aplicar configurações carregadas
        if (config.lastConnected) {
          console.log(`⚙️ Last connected: ${config.lastConnected}`);
        }
        
        console.log(`⚙️ App configuration loaded`);
      }
    } catch (error) {
      console.error('❌ Error loading app config:', error);
    }
  }

  // Salvar contatos
  private saveSavedContacts() {
    try {
      const contactsArray = Array.from(this.savedContacts.values());
      console.log(`💾 Saving ${contactsArray.length} contacts...`);
      
      const jsonString = JSON.stringify(contactsArray, null, 2);
      fs.writeFileSync(this.contactsFilePath, jsonString);
      console.log(`✅ Contacts saved successfully`);
    } catch (error) {
      console.error('❌ Error saving contacts:', error);
      throw error;
    }
  }

  // Salvar chats
  private saveSavedChats() {
    try {
      const chatsArray = Array.from(this.chats.values());
      console.log(`💾 Saving ${chatsArray.length} chats...`);
      
      // Validar dados antes de salvar
      const validChats = chatsArray.filter(chat => {
        if (!chat.id || !chat.name) {
          console.warn(`⚠️ Skipping invalid chat:`, chat);
          return false;
        }
        return true;
      });
      
      const jsonString = JSON.stringify(validChats, null, 2);
      fs.writeFileSync(this.chatsFilePath, jsonString);
      console.log(`✅ ${validChats.length} valid chats saved successfully`);
    } catch (error) {
      console.error('❌ Error saving chats:', error);
      // Não propagar o erro para não quebrar o fluxo
    }
  }

  // Salvar mensagens (apenas as últimas 100 por chat para performance)
  private saveSavedMessages() {
    try {
      const messagesObject: { [chatId: string]: any[] } = {};
      
      this.messages.forEach((messages, chatId) => {
        // Validar e limpar mensagens antes de salvar
        const validMessages = messages
          .slice(-100) // Últimas 100 mensagens
          .filter(msg => msg && msg.id && msg.body) // Filtrar mensagens válidas
          .map(msg => ({
            id: msg.id,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            timestamp: msg.timestamp.toISOString(), // Converter Date para string
            fromMe: msg.fromMe,
            isGroup: msg.isGroup,
            participant: msg.participant,
            chatName: msg.chatName
          }));
        
        if (validMessages.length > 0) {
          messagesObject[chatId] = validMessages;
        }
      });
      
      const totalMessages = Object.values(messagesObject).reduce((sum, msgs) => sum + msgs.length, 0);
      console.log(`💾 Saving ${totalMessages} messages across ${Object.keys(messagesObject).length} chats...`);
      
      const jsonString = JSON.stringify(messagesObject, null, 2);
      fs.writeFileSync(this.messagesFilePath, jsonString);
      console.log(`✅ Messages saved successfully`);
    } catch (error) {
      console.error('❌ Error saving messages:', error);
      // Não propagar o erro para não quebrar o fluxo
    }
  }

  // Salvar configurações da aplicação
  private saveAppConfig() {
    try {
      const config = {
        lastSaved: new Date().toISOString(),
        lastConnected: this.isConnected ? new Date().toISOString() : null,
        totalChats: this.chats.size,
        totalContacts: this.savedContacts.size,
        version: '1.0.0'
      };
      
      console.log(`💾 Saving app configuration...`);
      
      const jsonString = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configFilePath, jsonString);
      console.log(`✅ App configuration saved successfully`);
    } catch (error) {
      console.error('❌ Error saving app config:', error);
    }
  }

  // Método para salvar dados manualmente
  public forceSave() {
    console.log('🔄 Force saving all data...');
    this.saveAllData();
    this.createBackup();
  }

  // Método para marcar configurações como alteradas
  public markConfigChanged() {
    this.pendingConfigSave = true;
    console.log('⚙️ Configurações marcadas para salvamento');
  }

  // Método para marcar contatos como alterados
  public markContactsChanged() {
    this.pendingContactsSave = true;
    console.log('📇 Contatos marcados para salvamento');
  }

  // Método para marcar chats como alterados
  public markChatsChanged() {
    this.pendingChatsSave = true;
    console.log('💬 Chats marcados para salvamento');
  }

  // Método para marcar mensagens como alteradas
  public markMessagesChanged() {
    this.pendingMessagesSave = true;
    console.log('💌 Mensagens marcadas para salvamento');
  }

  // Método para restaurar backup
  public restoreBackup(backupTimestamp: string) {
    try {
      const backupPath = `${this.backupDir}/${backupTimestamp}`;
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupTimestamp}`);
      }

      // Restaurar arquivos do backup
      const filesToRestore = [
        'saved_contacts.json',
        'saved_chats.json', 
        'saved_messages.json',
        'app_config.json'
      ];

      filesToRestore.forEach(fileName => {
        const backupFilePath = `${backupPath}/${fileName}`;
        const targetFilePath = `./${fileName}`;
        
        if (fs.existsSync(backupFilePath)) {
          fs.copyFileSync(backupFilePath, targetFilePath);
          console.log(`✅ Restored: ${fileName}`);
        }
      });

      // Recarregar dados
      this.loadAllData();
      
      console.log(`✅ Backup restored successfully: ${backupTimestamp}`);
      return true;
    } catch (error) {
      console.error('❌ Error restoring backup:', error);
      return false;
    }
  }

  // Listar backups disponíveis
  public listBackups(): string[] {
    try {
      return fs.readdirSync(this.backupDir)
        .filter(dir => fs.statSync(`${this.backupDir}/${dir}`).isDirectory())
        .sort()
        .reverse();
    } catch (error) {
      console.error('❌ Error listing backups:', error);
      return [];
    }
  }

  // Sobrescrever métodos existentes para garantir persistência
  async saveContact(chatId: string, customName?: string, notes?: string, gender?: string): Promise<SavedContact> {
    console.log(`🔍 saveContact called with:`, { chatId, customName, notes });
    
    let chat = this.chats.get(chatId);
    let contactName: string;
    let phoneNumber = '';
    
    if (chat) {
      console.log(`✅ Chat encontrado:`, chat);
      contactName = customName || chat.name;
      phoneNumber = chat.phone;
    } else {
      console.log(`❌ Chat não encontrado, criando novo para chatId: ${chatId}`);
      
      if (!customName) {
        throw new Error('Nome do contato é obrigatório para novos contatos');
      }
      
      contactName = customName;
      phoneNumber = this.extractPhoneNumber(chatId);
      console.log(`📱 Telefone extraído: ${phoneNumber}`);
      
      const newChat: RealWhatsAppChat = {
        id: chatId,
        name: contactName,
        phone: phoneNumber,
        isGroup: chatId.includes('@g.us'),
        lastMessage: '',
        lastMessageTime: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        unreadCount: 0,
        isOnline: false
      };
      
      this.chats.set(chatId, newChat);
      console.log(`💬 Chat criado para novo contato:`, newChat);
      
      // Marcar para salvamento automático
      this.pendingChatsSave = true;
      this.saveSavedChats(); // Salvar imediatamente para novos chats
      
      this.emit('chat-created', newChat);
      
      chat = newChat;
    }

    const contactId = chatId;
    const now = new Date();
    const savedContact: SavedContact = {
      id: contactId,
      name: contactName,
      phone: phoneNumber,
      avatar: chat.avatar,
      dateAdded: now,
      lastInteraction: now,
      notes: notes,
      gender: gender
    };

    console.log(`📝 Created savedContact object:`, savedContact);

    this.savedContacts.set(contactId, savedContact);
    
    // Marcar para salvamento automático
    this.pendingContactsSave = true;
    console.log(`📇 Contato marcado para salvamento: ${contactName} (${phoneNumber})`);
    
    // Salvar imediatamente para operações críticas
    this.saveSavedContacts();

    console.log(`📇 Contato salvo: ${contactName} (${phoneNumber})`);
    this.emit('contact-saved', savedContact);

    return savedContact;
  }

  async updateContact(contactId: string, updates: Partial<SavedContact>): Promise<SavedContact | null> {
    const contact = this.savedContacts.get(contactId);
    if (!contact) {
      return null;
    }

    const updatedContact = { ...contact, ...updates };
    this.savedContacts.set(contactId, updatedContact);
    
    // Marcar para salvamento automático
    this.pendingContactsSave = true;
    console.log(`📝 Contato marcado para atualização: ${updatedContact.name}`);
    
    // Salvar imediatamente para operações críticas
    this.saveSavedContacts();

    console.log(`📝 Contato atualizado: ${updatedContact.name}`);
    this.emit('contact-updated', updatedContact);

    return updatedContact;
  }

  async removeContact(contactId: string): Promise<boolean> {
    const contact = this.savedContacts.get(contactId);
    if (!contact) {
      return false;
    }

    this.savedContacts.delete(contactId);
    
    // Marcar para salvamento automático
    this.pendingContactsSave = true;
    console.log(`🗑️ Contato marcado para remoção: ${contact.name}`);
    
    // Salvar imediatamente para operações críticas
    this.saveSavedContacts();

    console.log(`🗑️ Contato removido: ${contact.name}`);
    this.emit('contact-removed', contact);

    return true;
  }

  // Override do disconnect para salvar dados antes de desconectar
  async disconnect() {
    try {
      console.log('💾 Saving all data before disconnect...');
      this.saveAllData();
      this.createBackup();
      
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }

      if (this.socket && this.isConnected) {
        console.log('🔌 Logging out from WhatsApp...');
        await this.socket.logout();
      }
    } catch (error: any) {
      console.log('⚠️ Error during logout (connection may already be closed):', error.message);
    }
    
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.qrCode = null;
    console.log('🔴 WhatsApp disconnected');
    this.emit('disconnected');
  }

  async initialize() {
    try {
      console.log('Connecting to real WhatsApp...');
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: {
          level: 'silent',
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          child: () => ({
            level: 'silent',
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            child: () => ({} as any)
          })
        } as any
      });
      this.setupEventHandlers(saveCreds);
    } catch (error) {
      console.error('Real WhatsApp initialization error:', error);
      this.emit('error', error);
    }
  }

  private setupEventHandlers(saveCreds: any) {
    if (!this.socket) return;

    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log('🔄 Connection update:', { connection, qr: !!qr, error: lastDisconnect?.error?.message });

      if (qr) {
        try {
          this.qrCode = await QRCode.toDataURL(qr);
          console.log('📱 Real WhatsApp QR Code generated successfully');
          this.emit('qr', this.qrCode);
        } catch (error) {
          console.error('❌ Error generating QR code:', error);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(`🔴 Connection closed. Status: ${statusCode}, Should reconnect: ${shouldReconnect}`);
        
        this.isConnected = false;
        this.isConnecting = false;
        this.emit('disconnected');
        
        if (shouldReconnect) {
          console.log('🔄 Auto-reconnecting in 5 seconds...');
          setTimeout(() => {
            this.initialize();
          }, 5000);
        } else {
          console.log('🚪 Logged out - need new QR code');
          this.qrCode = null;
          this.emit('logged-out');
        }
      } else if (connection === 'open') {
        console.log('✅ Real WhatsApp connected successfully!');
        this.isConnected = true;
        this.isConnecting = false;
        this.qrCode = null;
        
        // Marcar configurações para salvamento
        this.pendingConfigSave = true;
        
        this.emit('connected');
        
        // Sincronizar chats reais
        await this.syncRealChats();
      } else if (connection === 'connecting') {
        console.log('🔄 WhatsApp connecting...');
        this.isConnecting = true;
        this.emit('connecting');
      }
    });

    this.socket.ev.on('creds.update', saveCreds);

    // Escutar mensagens em tempo real
    this.socket.ev.on('messages.upsert', (messageUpdate) => {
      console.log('🔥 messages.upsert event triggered!', {
        messagesCount: messageUpdate.messages.length,
        type: messageUpdate.type
      });
      
      const messages = messageUpdate.messages;
      
      messages.forEach((message) => {
        console.log('📩 Processing message:', {
          hasMessage: !!message.message,
          remoteJid: message.key.remoteJid,
          fromMe: message.key.fromMe,
          messageId: message.key.id
        });
        
        if (message.message) {
          const realMessage = this.parseRealMessage(message);
          console.log('✅ Nova mensagem real recebida:', realMessage);
          this.emit('message', realMessage);
          
          // Atualizar chat com nova mensagem e criar o chat se não existir
          this.updateChatFromMessage(realMessage);
          this.createChatFromMessage(realMessage);
        } else {
          console.log('❌ Message has no content, skipping...');
        }
      });
    });

    // Escutar histórico de mensagens (inclui chats)
    this.socket.ev.on('messaging-history.set', ({ chats, contacts, messages }) => {
      console.log(`Recebidos ${chats.length} chats do histórico do WhatsApp`);
      chats.forEach((chat: any) => {
        if (chat.id && !chat.id.includes('status@broadcast')) {
          this.syncChatFromWhatsApp(chat);
        }
      });
      this.emit('chats-synced', Array.from(this.chats.values()));
    });

    // Escutar novos chats
    this.socket.ev.on('chats.upsert', (chats: any[]) => {
      console.log(`Novos chats adicionados: ${chats.length}`);
      chats.forEach((chat: any) => {
        if (chat.id && !chat.id.includes('status@broadcast')) {
          this.syncChatFromWhatsApp(chat);
        }
      });
    });

    // Escutar atualizações de chat
    this.socket.ev.on('chats.update', (chats) => {
      chats.forEach((chat) => {
        this.updateChatInfo(chat);
      });
    });

    // Escutar status de presença
    this.socket.ev.on('presence.update', ({ id, presences }) => {
      const chat = this.chats.get(id);
      if (chat) {
        const presence = Object.values(presences)[0];
        chat.isOnline = presence?.lastKnownPresence === 'available';
        this.chats.set(id, chat);
        this.emit('presence-update', { chatId: id, isOnline: chat.isOnline });
      }
    });
  }

  private parseRealMessage(message: any): RealWhatsAppMessage {
    const messageContent = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text ||
                          message.message?.imageMessage?.caption ||
                          message.message?.videoMessage?.caption ||
                          message.message?.documentMessage?.caption ||
                          '[Mídia]';

    const chatId = message.key.remoteJid;
    const chat = this.chats.get(chatId);

    // Validar e processar timestamp
    let validTimestamp: Date;
    try {
      if (message.messageTimestamp && typeof message.messageTimestamp === 'number') {
        // Verificar se o timestamp é válido (não é NaN, 0, ou muito antigo/futuro)
        const timestampMs = message.messageTimestamp * 1000;
        const date = new Date(timestampMs);
        
        // Verificar se a data é válida e razoável (não muito antiga ou futura)
        const now = Date.now();
        const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
        const oneHourFuture = now + (60 * 60 * 1000);
        
        if (!isNaN(date.getTime()) && 
            timestampMs > oneYearAgo && 
            timestampMs < oneHourFuture) {
          validTimestamp = date;
        } else {
          console.log(`⚠️ Invalid timestamp detected: ${message.messageTimestamp}, using current time`);
          validTimestamp = new Date();
        }
      } else {
        console.log(`⚠️ Missing or invalid messageTimestamp, using current time`);
        validTimestamp = new Date();
      }
    } catch (error) {
      console.log(`❌ Error processing timestamp: ${error}, using current time`);
      validTimestamp = new Date();
    }

    // Verificar se a data final é válida
    if (isNaN(validTimestamp.getTime())) {
      console.log(`❌ Final timestamp validation failed, using current time`);
      validTimestamp = new Date();
    }

    return {
      id: message.key.id,
      from: message.key.fromMe ? 'me' : chatId,
      to: message.key.fromMe ? chatId : 'me',
      body: messageContent,
      timestamp: validTimestamp,
      fromMe: message.key.fromMe,
      isGroup: chatId.includes('@g.us'),
      participant: message.key.participant,
      chatName: chat?.name || chatId.split('@')[0]
    };
  }

  private updateChatFromMessage(message: RealWhatsAppMessage) {
    const chatId = message.fromMe ? message.to : message.from;
    let chat = this.chats.get(chatId);
    
    if (chat) {
      chat.lastMessage = message.body;
      // Garantir que o timestamp é válido antes de formatar
      try {
        if (message.timestamp && !isNaN(message.timestamp.getTime())) {
          chat.lastMessageTime = message.timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'  // Adicionar segundos para evitar duplicatas
          });
        } else {
          // Se timestamp é inválido, usar hora atual
          chat.lastMessageTime = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        }
      } catch (error) {
        console.log(`⚠️ Error formatting message timestamp, using current time:`, error);
        chat.lastMessageTime = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      if (!message.fromMe) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }
      this.chats.set(chatId, chat);
      
      // Marcar chat para salvamento
      this.pendingChatsSave = true;
      
      this.emit('chat-updated', chat);
    }

    // Verificar se a mensagem já existe para evitar duplicatas
    const chatMessages = this.messages.get(chatId) || [];
    const existingMessage = chatMessages.find(msg => 
      msg.id === message.id || 
      (msg.body === message.body && 
       Math.abs(msg.timestamp.getTime() - message.timestamp.getTime()) < 1000) // Menos de 1 segundo de diferença
    );
    
    if (!existingMessage) {
      chatMessages.push(message);
      this.messages.set(chatId, chatMessages);
      console.log(`💾 New message stored for chat ${chatId}. Total: ${chatMessages.length}`);
      
      // Marcar mensagens para salvamento
      this.pendingMessagesSave = true;
      
      // Salvar imediatamente a cada 5 mensagens ou se for a primeira do chat
      if (chatMessages.length === 1 || chatMessages.length % 5 === 0) {
        console.log(`💾 Auto-saving messages for chat ${chatId}`);
        this.saveSavedMessages();
      }
    } else {
      console.log(`🚫 Duplicate message detected and ignored for chat ${chatId}`);
    }
  }

  private createChatFromMessage(message: RealWhatsAppMessage) {
    const chatId = message.fromMe ? message.to : message.from;
    
    console.log(`🔍 Checking if chat exists: ${chatId}`);
    
    // Se o chat já existe, não criar novamente
    if (this.chats.has(chatId)) {
      console.log(`✅ Chat já existe: ${chatId}`);
      return;
    }
    
    console.log(`🆕 Criando novo chat para: ${chatId}`);
    
    // Validar timestamp da mensagem antes de formatar
    let formattedTime: string;
    try {
      if (message.timestamp && !isNaN(message.timestamp.getTime())) {
        formattedTime = message.timestamp.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'  // Adicionar segundos para identificação única
        });
      } else {
        // Se timestamp é inválido, usar hora atual
        formattedTime = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch (error) {
      console.log(`⚠️ Error formatting timestamp for new chat, using current time:`, error);
      formattedTime = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    
    // Criar novo chat baseado na mensagem
    const newChat: RealWhatsAppChat = {
      id: chatId,
      name: message.chatName || this.extractContactName(chatId),
      phone: this.extractPhoneNumber(chatId),
      isGroup: message.isGroup,
      lastMessage: message.body,
      lastMessageTime: formattedTime,
      unreadCount: message.fromMe ? 0 : 1,
      isOnline: false,
      participants: message.isGroup ? [] : undefined
    };
    
    this.chats.set(chatId, newChat);
    console.log(`🎉 Novo chat criado automaticamente:`, newChat);
    console.log(`📊 Total de chats: ${this.chats.size}`);
    
    // Marcar para salvamento automático
    this.pendingChatsSave = true;
    
    // Salvar chats imediatamente quando um novo é criado
    this.saveSavedChats();
    
    this.emit('chat-created', newChat);
  }

  private updateChatInfo(chatUpdate: any) {
    const chatId = chatUpdate.id;
    let chat = this.chats.get(chatId);
    
    if (chat) {
      if (chatUpdate.name) chat.name = chatUpdate.name;
      if (chatUpdate.unreadCount !== undefined) chat.unreadCount = chatUpdate.unreadCount;
      this.chats.set(chatId, chat);
      this.emit('chat-updated', chat);
    }
  }

  private syncChatFromWhatsApp(chat: any) {
    if (!chat.id || this.chats.has(chat.id)) return;
    
    // Função helper para validar e formatar timestamp
    const formatTimestamp = (timestamp: any): string => {
      try {
        if (!timestamp) return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Se timestamp é um número, converter para milliseconds se necessário
        let ms = timestamp;
        if (typeof timestamp === 'number') {
          // Se o timestamp é em segundos (10 dígitos), converter para ms
          if (timestamp.toString().length === 10) {
            ms = timestamp * 1000;
          }
        }
        
        const date = new Date(ms);
        
        // Verificar se a data é válida
        if (isNaN(date.getTime())) {
          console.log(`⚠️ Invalid timestamp for chat ${chat.id}: ${timestamp}, using current time`);
          return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } catch (error) {
        console.log(`❌ Error formatting timestamp for chat ${chat.id}:`, error);
        return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    };
    
    // Tentar extrair timestamp de várias propriedades
    let lastMessageTime = '';
    if (chat.conversationTimestamp) {
      lastMessageTime = formatTimestamp(chat.conversationTimestamp);
    } else if (chat.lastMessageTime) {
      lastMessageTime = formatTimestamp(chat.lastMessageTime);
    } else if (chat.t) {
      lastMessageTime = formatTimestamp(chat.t);
    } else {
      lastMessageTime = formatTimestamp(null); // Use current time
    }
    
    // Validar se o nome não contém "Invalid Date" 
    const extractedName = chat.name || chat.notify || this.extractContactName(chat.id);
    if (extractedName.toLowerCase().includes('invalid date')) {
      console.log(`⚠️ Rejecting chat with invalid name: ${extractedName}`);
      return;
    }
    
    // Validar se lastMessageTime não é "Invalid Date"
    if (lastMessageTime.toLowerCase().includes('invalid')) {
      console.log(`⚠️ Rejecting chat with invalid time: ${lastMessageTime}`);
      return;
    }
    
    const realChat: RealWhatsAppChat = {
      id: chat.id,
      name: extractedName,
      phone: this.extractPhoneNumber(chat.id),
      isGroup: chat.id.includes('@g.us'),
      lastMessage: this.getLastMessageText(chat) || 'Nova conversa',
      lastMessageTime: lastMessageTime,
      unreadCount: chat.unreadCount || 0,
      isOnline: false,
      participants: chat.id.includes('@g.us') ? this.getGroupParticipants(chat) : undefined
    };
    
    this.chats.set(chat.id, realChat);
    console.log(`✅ Chat sincronizado: ${realChat.name} - ${realChat.lastMessageTime}`);
    this.emit('chat-created', realChat);
  }

  async syncRealChats() {
    try {
      if (!this.socket) {
        console.log('Socket not available for syncing chats');
        return;
      }
      console.log('Sincronizando conversas reais do WhatsApp...');
      
      // Na versão atual do Baileys (6.7.18), o makeInMemoryStore não está disponível
      // Vamos usar os eventos do socket para capturar chats conforme chegam
      // Por enquanto, apenas preparar para receber chats via eventos
      
      console.log('Sistema preparado para receber conversas em tempo real');
      console.log('Os chats aparecerão automaticamente quando mensagens chegarem');
      
      this.emit('chats-synced', Array.from(this.chats.values()));
    } catch (error) {
      console.error('Error syncing real chats:', error);
      this.emit('sync-error', error);
    }
  }

  private extractContactName(jid: string): string {
    if (jid.includes('@g.us')) {
      // Para grupos, usar o ID como nome base
      return `Grupo ${jid.split('@')[0]}`;
    }
    
    // Para contatos individuais, tentar obter nome do contato ou usar número formatado
    const rawPhone = jid.split('@')[0];
    
    // Se for um número brasileiro, formatar melhor
    if (rawPhone.startsWith('55') && rawPhone.length >= 12) {
      const areaCode = rawPhone.substring(2, 4);
      const number = rawPhone.substring(4);
      return `(${areaCode}) ${number.substring(0, 5)}-${number.substring(5)}`;
    }
    
    // Fallback para número simples
    return rawPhone;
  }

  private getGroupParticipants(chat: any): string[] {
    try {
      if (chat.participants) {
        return Object.keys(chat.participants);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  private async syncMessagesForChat(chatId: string) {
    try {
      if (!this.socket) return;
      
      // Por enquanto, não sincronizar mensagens históricas
      // Apenas escutar novas mensagens em tempo real
      console.log(`Chat ${chatId} prepared for real-time messages`);
      
    } catch (error) {
      console.error(`Error syncing messages for chat ${chatId}:`, error);
    }
  }

  private extractPhoneNumber(jid: string): string {
    console.log(`🔍 extractPhoneNumber called with: ${jid}`);
    
    if (jid.includes('@g.us')) {
      const result = jid.split('@')[0];
      console.log(`📱 Group number extracted: ${result}`);
      return result;
    }
    
    const rawPhone = jid.split('@')[0];
    console.log(`📱 Raw phone: ${rawPhone}`);
    
    // Se já começa com 55 (código do Brasil)
    if (rawPhone.startsWith('55') && rawPhone.length >= 12) {
      // Formato: 55DDNNNNNNNNN -> +55 DD NNNNN-NNNN
      const countryCode = rawPhone.substring(0, 2);
      const areaCode = rawPhone.substring(2, 4);
      const firstPart = rawPhone.substring(4, 9);
      const secondPart = rawPhone.substring(9);
      const result = `+${countryCode} ${areaCode} ${firstPart}-${secondPart}`;
      console.log(`📱 Formatted BR phone: ${result}`);
      return result;
    }
    
    // Se não tem código do país, adicionar +55
    if (rawPhone.length >= 10) {
      const areaCode = rawPhone.substring(0, 2);
      const firstPart = rawPhone.substring(2, 7);
      const secondPart = rawPhone.substring(7);
      const result = `+55 ${areaCode} ${firstPart}-${secondPart}`;
      console.log(`📱 Added BR code: ${result}`);
      return result;
    }
    
    // Fallback para números que não seguem o padrão
    const result = `+55 ${rawPhone}`;
    console.log(`📱 Fallback format: ${result}`);
    return result;
  }

  private getLastMessageText(chat: any): string {
    if (chat.lastMessage) {
      const msg = chat.lastMessage;
      return msg.message?.conversation || 
             msg.message?.extendedTextMessage?.text ||
             msg.message?.imageMessage?.caption ||
             '[Mídia]';
    }
    return '';
  }

  async sendRealMessage(to: string, message: string): Promise<boolean> {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('Real WhatsApp not connected');
      }

      console.log(`📤 Sending real message to ${to}: ${message}`);
      
      // Enviar mensagem real
      await this.socket.sendMessage(to, { text: message });
      console.log(`✅ Message sent successfully to WhatsApp`);
      
      // Criar objeto da mensagem enviada
      const sentMessage: RealWhatsAppMessage = {
        id: Date.now().toString(),
        from: 'me',
        to: to,
        body: message,
        timestamp: new Date(),
        fromMe: true,
        isGroup: to.includes('@g.us'),
        chatName: this.chats.get(to)?.name
      };

      console.log(`📨 Emitting message-sent event:`, sentMessage);
      this.emit('message-sent', sentMessage);
      
      console.log(`🔄 Updating chat from sent message`);
      this.updateChatFromMessage(sentMessage);
      
      console.log(`💾 Message stored. Total messages for chat ${to}: ${(this.messages.get(to) || []).length}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error sending real message:', error);
      this.emit('send-error', error);
      return false;
    }
  }

  async markAsRead(chatId: string, messageId: string): Promise<void> {
    try {
      if (!this.socket || !this.isConnected) return;
      
      await this.socket.readMessages([{ remoteJid: chatId, id: messageId }]);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  getRealChats(): RealWhatsAppChat[] {
    return Array.from(this.chats.values());
  }

  getRealMessages(chatId: string): RealWhatsAppMessage[] {
    return this.messages.get(chatId) || [];
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  getConnectionStatus(): { connected: boolean; connecting: boolean } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting
    };
  }

  async restartConnection() {
    console.log('🔄 Restarting WhatsApp connection...');
    
    // Disconnect without clearing auth data first
    await this.disconnect();
    
    // Wait a bit then try to initialize again
    console.log('🚀 Re-initializing WhatsApp connection...');
    setTimeout(async () => {
      await this.initialize();
    }, 2000);
  }

  async forceNewQRCode() {
    console.log('🔄 Forcing new QR Code generation...');
    
    // Disconnect cleanly
    await this.disconnect();
    
    // Clear auth data to force new QR
    console.log('🗑️ Clearing auth data for new QR...');
    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
    }
    
    // Recreate auth directory and initialize
    this.setupAuthDir();
    console.log('🚀 Initializing with fresh auth state...');
    await this.initialize();
  }

  clearCorruptedData() {
    console.log('🧹 Clearing corrupted conversation data...');
    this.chats.clear();
    this.messages.clear();
    console.log('✅ All conversation data cleared from memory');
  }

  sanitizeChats(): number {
    console.log('🧹 Starting chat sanitization...');
    let removedCount = 0;
    
    // Coletar chats a serem removidos
    const chatsToRemove: string[] = [];
    
    this.chats.forEach((chat, chatId) => {
      const hasInvalidName = chat.name.toLowerCase().includes('invalid date');
      const hasInvalidTime = chat.lastMessageTime.toLowerCase().includes('invalid');
      
      if (hasInvalidName || hasInvalidTime) {
        console.log(`🚫 Marking corrupted chat for removal: ${chatId} - ${chat.name} - ${chat.lastMessageTime}`);
        chatsToRemove.push(chatId);
      }
    });
    
    // Remover chats corrompidos
    chatsToRemove.forEach(chatId => {
      this.chats.delete(chatId);
      this.messages.delete(chatId); // Remover mensagens também
      removedCount++;
    });
    
    console.log(`✅ Sanitization complete: ${removedCount} corrupted chats removed`);
    console.log(`📊 Remaining valid chats: ${this.chats.size}`);
    
    return removedCount;
  }

  clearChatMessages(chatId: string): number {
    console.log(`🧹 Clearing messages for chat: ${chatId}`);
    const messages = this.messages.get(chatId);
    const messageCount = messages ? messages.length : 0;
    
    if (messages) {
      this.messages.set(chatId, []); // Limpar todas as mensagens
      console.log(`✅ Cleared ${messageCount} messages from chat ${chatId}`);
    } else {
      console.log(`⚠️ No messages found for chat ${chatId}`);
    }
    
    return messageCount;
  }

  // ===== MÉTODOS PARA CONTATOS SALVOS =====

  getSavedContacts(): SavedContact[] {
    return Array.from(this.savedContacts.values()).sort((a, b) => 
      b.dateAdded.getTime() - a.dateAdded.getTime()
    );
  }

  getSavedContact(contactId: string): SavedContact | null {
    return this.savedContacts.get(contactId) || null;
  }

  isContactSaved(chatId: string): boolean {
    return this.savedContacts.has(chatId);
  }

  async updateContactLastInteraction(contactId: string): Promise<void> {
    const contact = this.savedContacts.get(contactId);
    if (contact) {
      contact.lastInteraction = new Date();
      this.savedContacts.set(contactId, contact);
      
      // Marcar para salvamento automático (não salvar imediatamente para performance)
      this.pendingContactsSave = true;
      console.log(`🕒 Última interação atualizada para: ${contact.name}`);
    }
  }

  async startChatWithContact(contactId: string): Promise<boolean> {
    const contact = this.savedContacts.get(contactId);
    if (!contact) {
      console.error(`❌ Contato não encontrado: ${contactId}`);
      return false;
    }

    // Atualizar última interação
    await this.updateContactLastInteraction(contactId);

    // Verificar se já existe um chat para este contato
    let chat = this.chats.get(contactId);
    
    if (!chat) {
      // Criar um chat temporário para este contato
      chat = {
        id: contactId,
        name: contact.name,
        phone: contact.phone,
        isGroup: contactId.includes('@g.us'),
        lastMessage: '',
        lastMessageTime: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        unreadCount: 0,
        isOnline: false,
        avatar: contact.avatar
      };
      
      this.chats.set(contactId, chat);
      console.log(`💬 Chat criado para contato salvo: ${contact.name}`);
      this.emit('chat-created', chat);
    }

    console.log(`✅ Chat iniciado com contato: ${contact.name}`);
    return true;
  }
}

// Instância singleton
export const realWhatsappManager = new RealWhatsAppManager();