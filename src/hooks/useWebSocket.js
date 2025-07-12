import { useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url, options = {}) => {
  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectInterval = options.reconnectInterval || 3000;

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        if (options.onOpen) options.onOpen();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (options.onMessage) options.onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        if (options.onClose) options.onClose(event);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (options.onError) options.onError(error);
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [url, options, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws.current) {
      ws.current.close(1000, 'Component unmounting');
    }
  }, []);

  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { sendMessage, disconnect };
};

export default useWebSocket;