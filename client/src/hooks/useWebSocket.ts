import { useEffect, useState, useCallback } from "react";
import { websocketManager } from "@/lib/websocket";

export interface UseWebSocketReturn {
  connectionStatus: string;
  sendMessage: (data: any) => void;
  subscribe: (event: string, callback: Function) => void;
  unsubscribe: (event: string, callback: Function) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  useEffect(() => {
    // Set initial connection status
    setConnectionStatus(websocketManager.getConnectionState());

    // Listen for connection status changes
    const handleConnectionStatus = (status: string) => {
      setConnectionStatus(status);
    };

    websocketManager.onConnectionStatus(handleConnectionStatus);

    // Connect if not already connected
    if (websocketManager.getConnectionState() === "disconnected") {
      websocketManager.connect();
    }

    return () => {
      websocketManager.offConnectionStatus(handleConnectionStatus);
    };
  }, []);

  const sendMessage = useCallback((data: any) => {
    websocketManager.send(data);
  }, []);

  const subscribe = useCallback((event: string, callback: Function) => {
    websocketManager.on(event, callback);
  }, []);

  const unsubscribe = useCallback((event: string, callback: Function) => {
    websocketManager.off(event, callback);
  }, []);

  return {
    connectionStatus,
    sendMessage,
    subscribe,
    unsubscribe
  };
}

// Hook for specific event subscriptions
export function useWebSocketEvent(event: string, callback: Function) {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    subscribe(event, callback);
    
    return () => {
      unsubscribe(event, callback);
    };
  }, [event, callback, subscribe, unsubscribe]);
}

// Hook for real-time data updates
export function useRealTimeUpdates() {
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    const handleUpdate = (data: any) => {
      setLastUpdate({
        type: data.type,
        data: data.data,
        timestamp: new Date()
      });
    };

    // Subscribe to all real-time events
    const events = [
      'contact_created',
      'contact_updated',
      'contact_deleted',
      'automation_created',
      'automation_updated',
      'automation_deleted',
      'broadcast_created',
      'broadcast_updated',
      'broadcast_deleted',
      'flow_created',
      'flow_updated',
      'flow_deleted',
      'whatsapp_status_updated',
      'setting_updated'
    ];

    events.forEach(event => {
      subscribe(event, handleUpdate);
    });

    return () => {
      events.forEach(event => {
        unsubscribe(event, handleUpdate);
      });
    };
  }, [subscribe, unsubscribe]);

  return lastUpdate;
}
