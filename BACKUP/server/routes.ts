import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertContactSchema, insertAutomationSchema, insertBroadcastSchema, insertConversationFlowSchema } from "@shared/schema";
import { realWhatsappManager, RealWhatsAppMessage, RealWhatsAppChat } from "./whatsapp-real";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer });
  
  // Store connected clients
  const clients = new Set<WebSocket>();
  
  // Store SSE clients
  const sseClients = new Map<number, (data: any) => void>();
  
  // Usar a instância singleton do WhatsApp Real Manager
  // (já importada no topo do arquivo)

  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
    
    // Also broadcast to SSE clients
    sseClients.forEach((sendUpdate) => {
      sendUpdate(data);
    });
  }

  // Contacts routes
  app.get("/api/contacts", async (req, res) => {
    try {
      const { tag } = req.query;
      let contacts;
      
      if (tag) {
        contacts = await storage.getContactsByTag(tag as string);
      } else {
        contacts = await storage.getContacts();
      }
      
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const contactData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(contactData);
      broadcast({ type: 'contact_created', data: contact });
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.updateContact(id, req.body);
      broadcast({ type: 'contact_updated', data: contact });
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContact(id);
      broadcast({ type: 'contact_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete contact" });
    }
  });

  app.post("/api/contacts/sync", async (req, res) => {
    try {
      console.log('Syncing real WhatsApp contacts and conversations...');
      
      // Forçar sincronização com WhatsApp real
      await realWhatsappManager.syncRealChats();
      
      // Buscar todas as conversas reais sincronizadas
      const realChats = realWhatsappManager.getRealChats();
      
      console.log(`Found ${realChats.length} real WhatsApp chats to sync`);
      
      let importedCount = 0;
      let conversationsCount = realChats.length;

      // Importar cada conversa real como contato
      for (const chat of realChats) {
        try {
          // Verificar se o contato já existe
          const existingContact = await storage.getContactByPhone(chat.phone);
          
          if (!existingContact) {
            await storage.createContact({
              name: chat.name,
              phone: chat.phone,
              tag: chat.isGroup ? "grupo" : "contato",
              isActive: true
            });
            importedCount++;
          }
        } catch (error) {
          console.error(`Error importing contact ${chat.name}:`, error);
        }
      }

      // Broadcast da sincronização
      broadcast({
        type: "contacts_synced",
        data: {
          imported: importedCount,
          conversations: conversationsCount,
          timestamp: new Date().toISOString()
        }
      });

      res.json({
        success: true,
        imported: importedCount,
        conversations: conversationsCount,
        message: `${importedCount} novos contatos importados de ${conversationsCount} conversas reais`
      });
    } catch (error) {
      console.error("Error syncing contacts:", error);
      res.status(500).json({ error: "Failed to sync contacts" });
    }
  });

  // ===== ROTAS PARA CONTATOS SALVOS =====

  app.get("/api/saved-contacts", async (req, res) => {
    try {
      const savedContacts = realWhatsappManager.getSavedContacts();
      res.json(savedContacts);
    } catch (error) {
      console.error("Error fetching saved contacts:", error);
      res.status(500).json({ error: "Failed to fetch saved contacts" });
    }
  });

  app.post("/api/saved-contacts", async (req, res) => {
    try {
      console.log('📝 POST /api/saved-contacts called with body:', req.body);
      
      const { chatId, name, notes, gender } = req.body;
      
      if (!chatId) {
        console.error('❌ Missing chatId in request');
        return res.status(400).json({ error: "chatId é obrigatório" });
      }

      if (!name) {
        console.error('❌ Missing name in request');
        return res.status(400).json({ error: "name é obrigatório" });
      }

      console.log('✅ Calling realWhatsappManager.saveContact...');
      const savedContact = await realWhatsappManager.saveContact(chatId, name, notes, gender);
      console.log('✅ Contact saved successfully:', savedContact);
      
      // Marcar dados para salvamento automático
      realWhatsappManager.markContactsChanged();
      realWhatsappManager.markConfigChanged();
      
      broadcast({
        type: "contact_saved",
        data: savedContact
      });

      res.json(savedContact);
    } catch (error) {
      console.error("❌ Error saving contact:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save contact" });
    }
  });

  app.get("/api/saved-contacts/:contactId", async (req, res) => {
    try {
      const { contactId } = req.params;
      const contact = realWhatsappManager.getSavedContact(contactId);
      
      if (!contact) {
        return res.status(404).json({ error: "Contato não encontrado" });
      }

      res.json(contact);
    } catch (error) {
      console.error("Error fetching saved contact:", error);
      res.status(500).json({ error: "Failed to fetch saved contact" });
    }
  });

  app.put("/api/saved-contacts/:contactId", async (req, res) => {
    try {
      const { contactId } = req.params;
      const updates = req.body;
      
      const updatedContact = await realWhatsappManager.updateContact(contactId, updates);
      
      if (!updatedContact) {
        return res.status(404).json({ error: "Contato não encontrado" });
      }

      // Marcar dados para salvamento automático
      realWhatsappManager.markContactsChanged();

      broadcast({
        type: "contact_updated",
        data: updatedContact
      });

      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating saved contact:", error);
      res.status(400).json({ error: "Failed to update saved contact" });
    }
  });

  app.delete("/api/saved-contacts/:contactId", async (req, res) => {
    try {
      const { contactId } = req.params;
      const success = await realWhatsappManager.removeContact(contactId);
      
      if (!success) {
        return res.status(404).json({ error: "Contato não encontrado" });
      }

      // Marcar dados para salvamento automático
      realWhatsappManager.markContactsChanged();

      broadcast({
        type: "contact_removed",
        data: { contactId }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing saved contact:", error);
      res.status(400).json({ error: "Failed to remove saved contact" });
    }
  });

  app.post("/api/saved-contacts/:contactId/start-chat", async (req, res) => {
    try {
      const { contactId } = req.params;
      const success = await realWhatsappManager.startChatWithContact(contactId);
      
      if (!success) {
        return res.status(404).json({ error: "Contato não encontrado ou falha ao iniciar chat" });
      }

      res.json({ success: true, message: "Chat iniciado com sucesso" });
    } catch (error) {
      console.error("Error starting chat with saved contact:", error);
      res.status(400).json({ error: "Failed to start chat with saved contact" });
    }
  });

  app.get("/api/saved-contacts/:contactId/is-saved", async (req, res) => {
    try {
      const { contactId } = req.params;
      const isSaved = realWhatsappManager.isContactSaved(contactId);
      res.json({ isSaved });
    } catch (error) {
      console.error("Error checking if contact is saved:", error);
      res.status(500).json({ error: "Failed to check contact status" });
    }
  });

  // Eventos do WhatsApp Real Manager para contatos salvos
  realWhatsappManager.on('contact-saved', (contact) => {
    console.log('📇 Contact saved, broadcasting to frontend:', contact);
    broadcast({
      type: "contact_saved",
      data: contact
    });
  });

  realWhatsappManager.on('contact-updated', (contact) => {
    console.log('📝 Contact updated, broadcasting to frontend:', contact);
    broadcast({
      type: "contact_updated",
      data: contact
    });
  });

  realWhatsappManager.on('contact-removed', (contact) => {
    console.log('🗑️ Contact removed, broadcasting to frontend:', contact);
    broadcast({
      type: "contact_removed",
      data: contact
    });
  });

  // Rotas para gerenciamento de backup e persistência
  app.post("/api/system/force-save", async (req, res) => {
    try {
      console.log('🔄 Force save requested via API');
      realWhatsappManager.forceSave();
      res.json({ success: true, message: "Dados salvos com sucesso" });
    } catch (error) {
      console.error("Error force saving data:", error);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  app.get("/api/system/backups", async (req, res) => {
    try {
      const backups = realWhatsappManager.listBackups();
      res.json({ backups });
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  app.post("/api/system/restore-backup", async (req, res) => {
    try {
      const { backupTimestamp } = req.body;
      
      if (!backupTimestamp) {
        return res.status(400).json({ error: "backupTimestamp é obrigatório" });
      }

      const success = realWhatsappManager.restoreBackup(backupTimestamp);
      
      if (success) {
        res.json({ success: true, message: `Backup ${backupTimestamp} restaurado com sucesso` });
      } else {
        res.status(400).json({ error: "Falha ao restaurar backup" });
      }
    } catch (error) {
      console.error("Error restoring backup:", error);
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  app.get("/api/system/status", async (req, res) => {
    try {
      const status = {
        whatsappConnected: realWhatsappManager.getConnectionStatus().connected,
        totalChats: realWhatsappManager.getRealChats().length,
        totalContacts: realWhatsappManager.getSavedContacts().length,
        availableBackups: realWhatsappManager.listBackups().length,
        lastBackup: realWhatsappManager.listBackups()[0] || null,
        autoSaveEnabled: true,
        uptime: process.uptime()
      };
      
      res.json(status);
    } catch (error) {
      console.error("Error getting system status:", error);
      res.status(500).json({ error: "Failed to get system status" });
    }
  });

  // ===== FIM DAS ROTAS DE CONTATOS SALVOS =====

  // Eventos do WhatsApp Real Manager
  realWhatsappManager.on('connected', async () => {
    console.log('🟢 WhatsApp connected, updating status');
    await storage.updateWhatsappStatus({ 
      isConnected: true, 
      lastConnected: new Date() 
    });
    broadcast({
      type: "whatsapp_connected",
      data: { isConnected: true }
    });
  });

  realWhatsappManager.on('disconnected', async () => {
    console.log('🔴 WhatsApp disconnected, updating status');
    await storage.updateWhatsappStatus({ 
      isConnected: false 
    });
    broadcast({
      type: "whatsapp_disconnected", 
      data: { isConnected: false }
    });
  });

  realWhatsappManager.on('qr', (qrCode: string) => {
    console.log('📱 New QR Code generated');
    broadcast({
      type: "whatsapp_qr",
      data: { qrCode }
    });
  });

  realWhatsappManager.on('message', (message: RealWhatsAppMessage) => {
    console.log('New real WhatsApp message:', message);
    broadcast({
      type: "whatsapp_message",
      data: message
    });
  });

  realWhatsappManager.on('message-sent', (message: RealWhatsAppMessage) => {
    console.log('🚀 Broadcasting message-sent event to frontend:', message);
    broadcast({
      type: "message_sent",
      data: message
    });
    console.log('✅ Message-sent broadcast completed');
  });

  realWhatsappManager.on('chats-synced', (chats: RealWhatsAppChat[]) => {
    console.log(`Real WhatsApp synced ${chats.length} chats`);
    broadcast({
      type: "chats_synced",
      data: { chats }
    });
  });

  realWhatsappManager.on('chat-created', (chat: RealWhatsAppChat) => {
    console.log('🎉 New chat created, broadcasting to frontend:', chat);
    broadcast({
      type: "chat_created",
      data: { chat }
    });
  });

  realWhatsappManager.on('chat-updated', (chat: RealWhatsAppChat) => {
    console.log('📝 Chat updated, broadcasting to frontend:', chat);
    broadcast({
      type: "chat_updated", 
      data: { chat }
    });
  });

  // Conversations routes
  app.post("/api/conversations/send", async (req, res) => {
    try {
      const { conversationId, message } = req.body;
      
      // Enviar mensagem real através do WhatsApp
      const success = await realWhatsappManager.sendRealMessage(conversationId, message);
      
      if (success) {
        // Marcar dados para salvamento automático
        realWhatsappManager.markMessagesChanged();
        realWhatsappManager.markChatsChanged();
        
        res.json({
          success: true,
          message: "Mensagem enviada com sucesso pelo WhatsApp real",
          data: {
            id: Date.now().toString(),
            conversationId,
            text: message,
            timestamp: new Date().toISOString(),
            isFromMe: true,
            isRead: false
          }
        });
      } else {
        res.status(500).json({ 
          error: "Falha ao enviar mensagem. Verifique se o WhatsApp está conectado." 
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      // Retornar conversas reais do WhatsApp
      const allConversations = realWhatsappManager.getRealChats();
      
      // Filtrar conversas com dados inválidos
      const validConversations = allConversations.filter(conv => {
        const hasInvalidName = conv.name.toLowerCase().includes('invalid date');
        const hasInvalidTime = conv.lastMessageTime.toLowerCase().includes('invalid');
        
        if (hasInvalidName || hasInvalidTime) {
          console.log(`🚫 API: Filtering out conversation with invalid data:`, conv);
          return false;
        }
        
        return true;
      });
      
      console.log(`📋 API: Returning ${validConversations.length} valid conversations (filtered from ${allConversations.length})`);
      res.json(validConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages from a specific conversation
  app.get("/api/conversations/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const allMessages = realWhatsappManager.getRealMessages(chatId);
      
      // Filtrar mensagens com timestamps inválidos
      const validMessages = allMessages.filter(msg => {
        try {
          // Verificar se o timestamp é válido
          if (!msg.timestamp || isNaN(new Date(msg.timestamp).getTime())) {
            console.log(`🚫 API: Filtering out message with invalid timestamp:`, msg);
            return false;
          }
          
          // Verificar se o body não está vazio
          if (!msg.body || msg.body.trim() === '') {
            console.log(`🚫 API: Filtering out message with empty body:`, msg);
            return false;
          }
          
          return true;
        } catch (error) {
          console.log(`🚫 API: Error validating message, filtering out:`, msg, error);
          return false;
        }
      });
      
      console.log(`📋 API: Returning ${validMessages.length} valid messages for chat ${chatId} (filtered from ${allMessages.length})`);
      res.json(validMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Force sync all real chats and messages
  app.post("/api/conversations/sync", async (req, res) => {
    try {
      console.log('Force syncing real WhatsApp conversations...');
      await realWhatsappManager.syncRealChats();
      
      const conversations = realWhatsappManager.getRealChats();
      
      broadcast({
        type: "conversations_synced",
        data: { conversations }
      });

      res.json({
        success: true,
        conversations: conversations.length,
        message: `${conversations.length} conversas sincronizadas`
      });
    } catch (error) {
      console.error("Error syncing conversations:", error);
      res.status(500).json({ error: "Failed to sync conversations" });
    }
  });

  // WhatsApp QR Code endpoint
  app.get("/api/whatsapp/qr", async (req, res) => {
    try {
      const qrCode = realWhatsappManager.getQRCode();
      res.json({ qrCode });
    } catch (error) {
      console.error("Error getting QR code:", error);
      res.status(500).json({ error: "Failed to get QR code" });
    }
  });

  // WhatsApp restart connection
  app.post("/api/whatsapp/restart", async (req, res) => {
    try {
      await realWhatsappManager.restartConnection();
      res.json({ success: true, message: "Conexão reiniciada" });
    } catch (error) {
      console.error("Error restarting connection:", error);
      res.status(500).json({ error: "Failed to restart connection" });
    }
  });

  // Clear corrupted conversations and restart WhatsApp manager
  app.post("/api/whatsapp/clear-data", async (req, res) => {
    try {
      console.log('🧹 Clearing corrupted conversation data...');
      
      // Use the public method to clear data
      realWhatsappManager.clearCorruptedData();
      
      res.json({ success: true, message: "Dados corrompidos limpos com sucesso" });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Sanitize chats - remove Invalid Date entries
  app.post("/api/whatsapp/sanitize-chats", async (req, res) => {
    try {
      console.log('🧹 Sanitizing chats - removing Invalid Date entries...');
      
      const sanitizedCount = realWhatsappManager.sanitizeChats();
      
      res.json({ 
        success: true, 
        message: `${sanitizedCount} chats corrompidos foram removidos`,
        sanitized: sanitizedCount
      });
    } catch (error) {
      console.error("Error sanitizing chats:", error);
      res.status(500).json({ error: "Failed to sanitize chats" });
    }
  });

  // Clear messages for a specific chat
  app.post("/api/conversations/:chatId/clear", async (req, res) => {
    try {
      const { chatId } = req.params;
      console.log(`🧹 Clearing messages for chat: ${chatId}`);
      
      const clearedCount = realWhatsappManager.clearChatMessages(chatId);
      
      res.json({ 
        success: true, 
        message: `${clearedCount} mensagens removidas do chat`,
        cleared: clearedCount
      });
    } catch (error) {
      console.error("Error clearing chat messages:", error);
      res.status(500).json({ error: "Failed to clear chat messages" });
    }
  });

  // Force WhatsApp initialization (when QR code is not appearing)
  app.post("/api/whatsapp/force-init", async (req, res) => {
    try {
      console.log('🚀 Force initializing WhatsApp connection...');
      
      // Use the new force method that clears auth data
      await realWhatsappManager.forceNewQRCode();
      
      res.json({ success: true, message: "QR Code forçado - aguarde alguns segundos" });
    } catch (error) {
      console.error("Error force initializing:", error);
      res.status(500).json({ error: "Failed to force initialize" });
    }
  });

  // Automations routes
  app.get("/api/automations", async (req, res) => {
    try {
      const automations = await storage.getAutomations();
      res.json(automations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch automations" });
    }
  });

  app.post("/api/automations", async (req, res) => {
    try {
      const automationData = insertAutomationSchema.parse(req.body);
      const automation = await storage.createAutomation(automationData);
      broadcast({ type: 'automation_created', data: automation });
      res.json(automation);
    } catch (error) {
      res.status(400).json({ error: "Invalid automation data" });
    }
  });

  app.put("/api/automations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const automation = await storage.updateAutomation(id, req.body);
      broadcast({ type: 'automation_updated', data: automation });
      res.json(automation);
    } catch (error) {
      res.status(400).json({ error: "Failed to update automation" });
    }
  });

  app.delete("/api/automations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAutomation(id);
      broadcast({ type: 'automation_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete automation" });
    }
  });

  // Broadcasts routes
  app.get("/api/broadcasts", async (req, res) => {
    try {
      const broadcasts = await storage.getBroadcasts();
      res.json(broadcasts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch broadcasts" });
    }
  });

  app.post("/api/broadcasts", async (req, res) => {
    try {
      console.log('📤 Dados recebidos para criar broadcast:', req.body);
      const broadcastData = insertBroadcastSchema.parse(req.body);
      console.log('✅ Dados validados com sucesso:', broadcastData);
      const newBroadcast = await storage.createBroadcast(broadcastData);
      console.log('✅ Broadcast criado:', newBroadcast);
      broadcast({ type: 'broadcast_created', data: newBroadcast });
      res.json(newBroadcast);
    } catch (error) {
      console.error('❌ Erro ao criar broadcast:', error);
      if (error instanceof Error) {
        res.status(400).json({ 
          error: "Dados inválidos para o broadcast",
          details: error.message,
          data: req.body
        });
      } else {
        res.status(400).json({ error: "Invalid broadcast data" });
      }
    }
  });

  app.put("/api/broadcasts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedBroadcast = await storage.updateBroadcast(id, req.body);
      broadcast({ type: 'broadcast_updated', data: updatedBroadcast });
      res.json(updatedBroadcast);
    } catch (error) {
      res.status(400).json({ error: "Failed to update broadcast" });
    }
  });

  app.delete("/api/broadcasts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBroadcast(id);
      broadcast({ type: 'broadcast_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete broadcast" });
    }
  });

  // Execute broadcast campaign
  app.post("/api/broadcasts/:id/execute", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const broadcastCampaign = await storage.getBroadcast(id);
      
      if (!broadcastCampaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (broadcastCampaign.status !== "draft") {
        return res.status(400).json({ error: "Campaign is not in draft status" });
      }

      console.log(`🚀 Starting broadcast campaign: ${broadcastCampaign.name}`);
      console.log(`📋 Target tags: ${broadcastCampaign.targetTags.join(", ")}`);
      console.log(`👥 Total contacts: ${broadcastCampaign.total}`);
      console.log(`⏱️ Interval: ${broadcastCampaign.interval} seconds`);

      // Update campaign status to active
      const updatedCampaign = await storage.updateBroadcast(id, { 
        status: "active" 
      });

      // Get saved contacts that match the target tags
      const savedContacts = realWhatsappManager.getSavedContacts();
      const targetContacts = savedContacts.filter(contact => 
        broadcastCampaign.targetTags.some(tag => {
          const contactCategory = contact.notes?.trim().toLowerCase() || "";
          return contactCategory === tag.toLowerCase();
        })
      );

      console.log(`📱 Found ${targetContacts.length} matching contacts`);

      // Start sending messages with interval
      let sentCount = 0;
      const intervalMs = (broadcastCampaign.interval || 5) * 1000;
      
      const sendMessage = async () => {
        if (sentCount >= targetContacts.length) {
          // Campaign completed
          await storage.updateBroadcast(id, { 
            status: "completed",
            sent: sentCount 
          });
          console.log(`✅ Campaign ${broadcastCampaign.name} completed. Sent: ${sentCount}/${targetContacts.length}`);
          broadcast({ type: 'broadcast_completed', data: { id, sent: sentCount, total: targetContacts.length } });
          return;
        }

        const contact = targetContacts[sentCount];
        const currentIndex = sentCount + 1; // For display purposes
        
        try {
          console.log(`📤 Sending message to ${contact.name || contact.id} (${currentIndex}/${targetContacts.length}) - waiting ${broadcastCampaign.interval}s before next...`);
          
          const success = await realWhatsappManager.sendRealMessage(contact.id, broadcastCampaign.message);
          if (success) {
            sentCount++;
            console.log(`✅ Message sent to ${contact.name || contact.id} (${sentCount}/${targetContacts.length})`);
            
            // Update progress
            await storage.updateBroadcast(id, { sent: sentCount });
            broadcast({ type: 'broadcast_progress', data: { id, sent: sentCount, total: targetContacts.length } });
          } else {
            console.log(`❌ Failed to send message to ${contact.name || contact.id}`);
            sentCount++; // Still increment to avoid infinite loop
          }
        } catch (error) {
          console.log(`❌ Error sending message to ${contact.name || contact.id}:`, error);
          sentCount++; // Still increment to avoid infinite loop
        }

        // Schedule next message with the specified interval
        if (sentCount < targetContacts.length) {
          console.log(`⏰ Waiting ${broadcastCampaign.interval} seconds before sending next message...`);
          setTimeout(sendMessage, intervalMs);
        } else {
          // If we've sent all messages, trigger completion check
          setTimeout(sendMessage, 100);
        }
      };

      // Start sending messages immediately
      setTimeout(sendMessage, 1000); // Start after 1 second

      broadcast({ type: 'broadcast_started', data: updatedCampaign });
      res.json({ 
        success: true, 
        message: `Campaign started. Will send ${targetContacts.length} messages with ${broadcastCampaign.interval}s interval.`,
        campaign: updatedCampaign,
        targetContacts: targetContacts.length
      });

    } catch (error) {
      console.error('❌ Error executing broadcast:', error);
      res.status(500).json({ error: "Failed to execute broadcast" });
    }
  });

  // Conversation flows routes
  app.get("/api/flows", async (req, res) => {
    try {
      const flows = await storage.getConversationFlows();
      res.json(flows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation flows" });
    }
  });

  app.post("/api/flows", async (req, res) => {
    try {
      const flowData = insertConversationFlowSchema.parse(req.body);
      const flow = await storage.createConversationFlow(flowData);
      broadcast({ type: 'flow_created', data: flow });
      res.json(flow);
    } catch (error) {
      res.status(400).json({ error: "Invalid flow data" });
    }
  });

  app.put("/api/flows/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const flow = await storage.updateConversationFlow(id, req.body);
      broadcast({ type: 'flow_updated', data: flow });
      res.json(flow);
    } catch (error) {
      res.status(400).json({ error: "Failed to update flow" });
    }
  });

  app.delete("/api/flows/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversationFlow(id);
      broadcast({ type: 'flow_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete flow" });
    }
  });

  // WhatsApp status routes
  app.get("/api/whatsapp/status", async (req, res) => {
    try {
      // Return real WhatsApp connection status instead of storage status
      const realStatus = realWhatsappManager.getConnectionStatus();
      const storageStatus = await storage.getWhatsappStatus();
      const status = {
        id: 1,
        isConnected: realStatus.connected,
        lastConnected: realStatus.connected ? (storageStatus.lastConnected || new Date()) : storageStatus.lastConnected,
        autoReconnect: true
      };
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch WhatsApp status" });
    }
  });

  app.put("/api/whatsapp/status", async (req, res) => {
    try {
      const status = await storage.updateWhatsappStatus(req.body);
      broadcast({ type: 'whatsapp_status_updated', data: status });
      res.json(status);
    } catch (error) {
      res.status(400).json({ error: "Failed to update WhatsApp status" });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const { value } = req.body;
      const setting = await storage.updateSetting(key, value);
      broadcast({ type: 'setting_updated', data: setting });
      res.json(setting);
    } catch (error) {
      res.status(400).json({ error: "Failed to update setting" });
    }
  });

  // Export contacts
  app.get("/api/contacts/export", async (req, res) => {
    try {
      const { format = 'csv' } = req.query;
      const contacts = await storage.getContacts();
      
      if (format === 'csv') {
        const csv = [
          'ID,Nome,Telefone,Tag,Ultima Conversa,Ativo',
          ...contacts.map(c => 
            `${c.id},"${c.name}","${c.phone}","${c.tag}","${c.lastConversation || ''}","${c.isActive}"`
          )
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
        res.send(csv);
      } else if (format === 'txt') {
        const txt = contacts.map(c => `${c.name} - ${c.phone} (${c.tag})`).join('\n');
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.txt');
        res.send(txt);
      } else {
        res.json(contacts);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export contacts" });
    }
  });

  // Stats endpoint for dashboard - ONLY REAL WHATSAPP DATA
  app.get("/api/stats", async (req, res) => {
    try {
      // Get ONLY real WhatsApp data
      const realChats = realWhatsappManager.getRealChats();
      const connectionStatus = realWhatsappManager.getConnectionStatus();
      
      const stats = {
        activeContacts: realChats.length, // Only real WhatsApp contacts
        messagesSent: 0, // Reset since we're only using real data
        activeAutomations: 0, // Reset since we're only using real data  
        conversionRate: 0, // Reset since we're only using real data
        whatsappConnected: connectionStatus.connected,
        whatsappConnecting: connectionStatus.connecting,
        realChatsCount: realChats.length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
