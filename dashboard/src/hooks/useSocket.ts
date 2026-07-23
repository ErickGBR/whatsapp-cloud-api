import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";

export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;

    const wrapped = (data: T) => {
      handlerRef.current(data);
    };

    socket.on(event, wrapped);
    return () => {
      socket.off(event, wrapped);
    };
  }, [socket, event]);
}

export function useSocketEmit() {
  const { socket } = useSocket();

  const emit = useCallback(
    (event: string, data?: unknown) => {
      if (socket) {
        socket.emit(event, data);
      }
    },
    [socket]
  );

  return { emit, connected: socket?.connected ?? false };
}
