import { makeWASocket, DisconnectReason, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  fromMe: boolean;
  isGroup: boolean;
  groupName?: string;
  participant?: string;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  isGroup: boolean;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface WhatsAppConversation {
  id: string;
  name: string;
  phone: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  avatar?: string;
}

export class WhatsAppManager extends EventEmitter {
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private isConnected = false;
  private isConnecting = false;
  private authDir = './auth_info';
  private contacts: Map<string, WhatsAppContact> = new Map();
  private conversations: Map<string, WhatsAppConversation> = new Map();

  constructor() {
    super();
    this.setupAuthDir();
  }

  private setupAuthDir() {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        defaultQueryTimeoutMs: 60000,
        logger: {
          level: 'silent',
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          fatal: () => {},
          child: () => ({
            level: 'silent',
            trace: () => {},
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
            fatal: () => {}
          })
        }
      });

      this.setupEventHandlers(saveCreds);
      
    } catch (error) {
      console.error('WhatsApp initialization error:', error);
      this.emit('error', error);
    }
  }

  private setupEventHandlers(saveCreds: any) {
    if (!this.socket) return;

    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = await QRCode.toDataURL(qr);
        this.emit('qr', this.qrCode);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log('WhatsApp disconnected, attempting to reconnect...');
          this.isConnected = false;
          this.isConnecting = false;
          this.emit('disconnected');
          
          setTimeout(() => {
            this.initialize();
          }, 5000);
        } else {
          console.log('WhatsApp logged out, please scan QR code again');
          this.isConnected = false;
          this.isConnecting = false;
          this.emit('logged-out');
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connected successfully');
        this.isConnected = true;
        this.isConnecting = false;
        this.qrCode = null;
        this.emit('connected');
        
        // Sincronizar contatos e conversas
        await this.syncContactsAndConversations();
      } else if (connection === 'connecting') {
        this.isConnecting = true;
        this.emit('connecting');
      }
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('messages.upsert', (messageUpdate) => {
      const messages = messageUpdate.messages;
      
      messages.forEach((message) => {
        if (message.message) {
          const whatsappMessage = this.parseMessage(message);
          this.emit('message', whatsappMessage);
          
          // Atualizar conversas
          this.updateConversationFromMessage(whatsappMessage);
        }
      });
    });

    this.socket.ev.on('contacts.update', (contacts) => {
      contacts.forEach((contact) => {
        if (contact.id) {
          const whatsappContact: WhatsAppContact = {
            id: contact.id,
            name: contact.name || contact.id.split('@')[0],
            phone: contact.id.split('@')[0],
            isGroup: contact.id.includes('@g.us'),
            avatar: (contact as any).imgUrl || undefined
          };
          
          this.contacts.set(contact.id, whatsappContact);
        }
      });
      
      this.emit('contacts-updated', Array.from(this.contacts.values()));
    });
  }

  private parseMessage(message: any): WhatsAppMessage {
    const messageContent = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text ||
                          message.message?.imageMessage?.caption ||
                          message.message?.videoMessage?.caption ||
                          '[Mídia]';

    return {
      id: message.key.id,
      from: message.key.remoteJid,
      to: message.key.fromMe ? message.key.remoteJid : 'me',
      body: messageContent,
      timestamp: new Date(message.messageTimestamp * 1000),
      fromMe: message.key.fromMe,
      isGroup: message.key.remoteJid.includes('@g.us'),
      groupName: message.key.remoteJid.includes('@g.us') ? this.contacts.get(message.key.remoteJid)?.name : undefined,
      participant: message.key.participant
    };
  }

  private updateConversationFromMessage(message: WhatsAppMessage) {
    const conversationId = message.from;
    const contact = this.contacts.get(conversationId);
    
    const conversation: WhatsAppConversation = {
      id: conversationId,
      name: contact?.name || conversationId.split('@')[0],
      phone: conversationId.split('@')[0],
      isGroup: message.isGroup,
      lastMessage: message.body,
      lastMessageTime: message.timestamp.toLocaleTimeString(),
      unreadCount: message.fromMe ? 0 : 1,
      isOnline: false,
      avatar: contact?.avatar
    };

    this.conversations.set(conversationId, conversation);
    this.emit('conversation-updated', conversation);
  }

  async syncContactsAndConversations() {
    try {
      if (!this.socket) return;

      // Usar dados simulados por enquanto (substituir por chats reais quando conectado)
      const sampleChats = [
        { id: '5511999990001@s.whatsapp.net', name: 'João Silva', lastMessage: 'Olá!', t: Date.now() / 1000, unreadCount: 0 },
        { id: '5511999990002@g.us', name: 'Grupo Trabalho', lastMessage: 'Reunião amanhã', t: Date.now() / 1000, unreadCount: 2 }
      ];
      
      sampleChats.forEach((chat: any) => {
        const whatsappContact: WhatsAppContact = {
          id: chat.id,
          name: chat.name || chat.id.split('@')[0],
          phone: chat.id.split('@')[0],
          isGroup: chat.id.includes('@g.us'),
          avatar: undefined
        };
        
        this.contacts.set(chat.id, whatsappContact);

        const conversation: WhatsAppConversation = {
          id: chat.id,
          name: chat.name || chat.id.split('@')[0],
          phone: chat.id.split('@')[0],
          isGroup: chat.id.includes('@g.us'),
          lastMessage: chat.lastMessage || '',
          lastMessageTime: new Date(chat.t * 1000).toLocaleTimeString(),
          unreadCount: chat.unreadCount || 0,
          isOnline: false,
          avatar: undefined
        };

        this.conversations.set(chat.id, conversation);
      });

      this.emit('sync-complete', {
        contacts: Array.from(this.contacts.values()),
        conversations: Array.from(this.conversations.values())
      });

    } catch (error) {
      console.error('Sync error:', error);
      this.emit('sync-error', error);
    }
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp not connected');
      }

      // Garantir que o número tenha o formato correto
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      
      await this.socket.sendMessage(jid, { text: message });
      
      // Criar mensagem enviada para atualizar a conversa
      const sentMessage: WhatsAppMessage = {
        id: Date.now().toString(),
        from: 'me',
        to: jid,
        body: message,
        timestamp: new Date(),
        fromMe: true,
        isGroup: jid.includes('@g.us'),
        groupName: jid.includes('@g.us') ? this.contacts.get(jid)?.name : undefined
      };

      this.emit('message-sent', sentMessage);
      this.updateConversationFromMessage(sentMessage);
      
      return true;
    } catch (error) {
      console.error('Send message error:', error);
      this.emit('send-error', error);
      return false;
    }
  }

  async sendBulkMessages(contacts: string[], message: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const contact of contacts) {
      try {
        const result = await this.sendMessage(contact, message);
        if (result) {
          success++;
        } else {
          failed++;
        }
        
        // Aguardar 1 segundo entre mensagens para evitar spam
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
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

  getContacts(): WhatsAppContact[] {
    return Array.from(this.contacts.values());
  }

  getConversations(): WhatsAppConversation[] {
    return Array.from(this.conversations.values());
  }

  async disconnect() {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
      this.qrCode = null;
      this.emit('disconnected');
    }
  }

  async restartConnection() {
    await this.disconnect();
    
    // Limpar dados de autenticação
    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
    }
    
    this.setupAuthDir();
    await this.initialize();
  }
}

// Instância singleton
export const whatsappManager = new WhatsAppManager();