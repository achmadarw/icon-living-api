import { Server as HttpServer } from 'http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { verifyAccessToken } from './jwt';
import { config } from '../config';

let io: SocketServer | null = null;

// Map: userId → Set<socketId>
const userSockets = new Map<string, Set<string>>();

export function initSocketIO(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Track user's socket connections
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's private room
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

// ─── Emit helpers ─────────────────────────────────────

export function emitToUser(userId: string, event: string, data: unknown) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToUsers(userIds: string[], event: string, data: unknown) {
  if (!io) return;
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: unknown) {
  if (!io) return;
  // Broadcast to all connected sockets with the given role
  for (const [, socket] of io.sockets.sockets) {
    if (socket.data.role === role) {
      socket.emit(event, data);
    }
  }
}
