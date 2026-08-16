import { useEffect, useState } from 'react';
import { WebSocketMessage } from '../types/game.types';

export function useWebSocket(url: string) {
  const [data, setData] = useState<WebSocketMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!url) {
      setData(null);
      setIsConnected(false);
      return;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (disposed) return;

      try {
        socket = new WebSocket(url);

        socket.onopen = () => {
          if (disposed || !socket) return;
          setIsConnected(true);
          socket.send(JSON.stringify({ type: 'web' }));
        };

        socket.onmessage = (event) => {
          if (disposed) return;
          try {
            setData(JSON.parse(event.data) as WebSocketMessage);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        socket.onerror = () => {
          if (!disposed) {
            setData(null);
            setIsConnected(false);
          }
        };

        socket.onclose = () => {
          if (disposed) return;
          setData(null);
          setIsConnected(false);
          reconnectTimer = setTimeout(connect, 3000);
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        if (!disposed) reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    };
  }, [url]);

  return { data, isConnected };
}
