import { useEffect, useMemo, useState } from 'react';
import { SensorReading, isFreshSensorReading, normalizeSensorReading } from '../live/sensorState';

export function useWebSocket(url: string) {
  const [data, setData] = useState<SensorReading | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sensorOnline, setSensorOnline] = useState(false);
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!url) {
      setData(null);
      setIsConnected(false);
      setSensorOnline(false);
      setLastReceivedAt(null);
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
            const message = JSON.parse(event.data) as Record<string, unknown>;
            if (message.type === 'status') {
              setSensorOnline(message.sensor_online === true);
              return;
            }
            const reading = normalizeSensorReading(message);
            if (reading) {
              setData(reading);
              setLastReceivedAt(Date.now());
              setSensorOnline(true);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        socket.onerror = () => {
          if (!disposed) {
            setData(null);
            setIsConnected(false);
            setSensorOnline(false);
          }
        };

        socket.onclose = () => {
          if (disposed) return;
          setData(null);
          setIsConnected(false);
          setSensorOnline(false);
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const hasFreshReading = useMemo(
    () => isFreshSensorReading(lastReceivedAt, now),
    [lastReceivedAt, now]
  );

  return { data, isConnected, sensorOnline: sensorOnline && hasFreshReading, lastReceivedAt };
}
