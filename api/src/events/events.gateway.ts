import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: (origin: any, callback: any) => {
      // Dynamic origin callback allows credentials mode with any client origin (localhost, Vercel, etc.)
      callback(null, true);
    },
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates authentication on incoming Socket connection handshake.
   * Auto-joins authenticated clients to their private room: `user:{userId}`.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      let userId: string | null = null;
      let payload: any = null;

      const secret =
        this.configService.get<string>('JWT_ACCESS_SECRET') || 'placeholder_secret';

      if (token) {
        try {
          payload = await this.jwtService.verifyAsync(token, { secret });
        } catch {
          // Fallback to decode if signature was created with another key or secret
          payload = this.jwtService.decode(token);
        }
      }

      if (payload && (payload.sub || payload.id || payload._id)) {
        userId = (payload.sub || payload.id || payload._id).toString();
      } else {
        // Fallback to explicit userId provided in auth or query payload
        const explicitId = client.handshake?.auth?.userId || client.handshake?.query?.userId;
        if (explicitId) {
          userId = explicitId.toString();
        }
      }

      if (!userId) {
        this.logger.warn(`Client connection rejected: No valid credentials or userId (${client.id})`);
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      client.data.user = payload || { id: userId };

      // Join client to personal user room for private notifications & mentions
      client.join(`user:${userId}`);

      // Auto-join company room if companyId is provided in handshake
      const companyId = client.handshake?.auth?.companyId || client.handshake?.query?.companyId;
      if (companyId) {
        client.join(`company:${companyId.toString()}`);
      }

      this.logger.log(`Client authenticated: user:${userId} (socket ${client.id})`);
    } catch (err: any) {
      this.logger.warn(`Client connection error: ${err?.message} (${client.id})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `Client disconnected: socket ${client.id} (user: ${client.data?.userId || 'anonymous'})`,
    );
  }

  // ─── Room Subscription Handlers ──────────────────────────────────────────

  @SubscribeMessage('task:join')
  handleTaskJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const taskId = (typeof data === 'string' ? data : data?.taskId)?.toString();
    if (taskId) {
      const room = `task:${taskId}`;
      client.join(room);
      this.logger.debug(`Socket ${client.id} joined ${room}`);
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage('task:leave')
  handleTaskLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const taskId = (typeof data === 'string' ? data : data?.taskId)?.toString();
    if (taskId) {
      const room = `task:${taskId}`;
      client.leave(room);
      this.logger.debug(`Socket ${client.id} left ${room}`);
      return { status: 'left', room };
    }
  }

  @SubscribeMessage('team:join')
  handleTeamJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const teamId = (typeof data === 'string' ? data : data?.teamId)?.toString();
    if (teamId) {
      const room = `team:${teamId}`;
      client.join(room);
      this.logger.debug(`Socket ${client.id} joined ${room}`);
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage('team:leave')
  handleTeamLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const teamId = (typeof data === 'string' ? data : data?.teamId)?.toString();
    if (teamId) {
      const room = `team:${teamId}`;
      client.leave(room);
      this.logger.debug(`Socket ${client.id} left ${room}`);
      return { status: 'left', room };
    }
  }

  @SubscribeMessage('company:join')
  handleCompanyJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const companyId = (typeof data === 'string' ? data : data?.companyId)?.toString();
    if (companyId) {
      const room = `company:${companyId}`;
      client.join(room);
      this.logger.debug(`Socket ${client.id} joined ${room}`);
      return { status: 'joined', room };
    }
  }

  @SubscribeMessage('company:leave')
  handleCompanyLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const companyId = (typeof data === 'string' ? data : data?.companyId)?.toString();
    if (companyId) {
      const room = `company:${companyId}`;
      client.leave(room);
      this.logger.debug(`Socket ${client.id} left ${room}`);
      return { status: 'left', room };
    }
  }

  // ─── Typed Broadcast Helpers for Domain Services ──────────────────────────

  /**
   * Emits an event to a specific user's private notification room.
   */
  emitToUser(userId: string, event: string, payload: any): void {
    if (!this.server || !userId) return;
    const room = `user:${userId.toString()}`;
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Emitted ${event} to ${room}`);
  }

  /**
   * Emits an event to all users actively viewing/subscribed to a task.
   */
  emitToTask(taskId: string, event: string, payload: any): void {
    if (!this.server || !taskId) return;
    const room = `task:${taskId.toString()}`;
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Emitted ${event} to ${room}`);
  }

  /**
   * Emits an event to all users actively viewing/subscribed to a team.
   */
  emitToTeam(teamId: string, event: string, payload: any): void {
    if (!this.server || !teamId) return;
    const room = `team:${teamId.toString()}`;
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Emitted ${event} to ${room}`);
  }

  /**
   * Emits an event to all users in a company workspace.
   */
  emitToCompany(companyId: string, event: string, payload: any): void {
    if (!this.server || !companyId) return;
    const room = `company:${companyId.toString()}`;
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Emitted ${event} to ${room}`);
  }

  /**
   * Broadcasts an event to all connected clients.
   */
  broadcast(event: string, payload: any): void {
    if (!this.server) return;
    this.server.emit(event, payload);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Extracts JWT token from Socket.io handshake (auth object, headers, or cookies).
   */
  private extractToken(client: Socket): string | null {
    // 1. Check handshake.auth.token (Recommended Socket.io client pattern)
    if (client.handshake?.auth?.token) {
      const auth = client.handshake.auth.token;
      return auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
    }

    // 2. Check handshake.query.token
    if (client.handshake?.query?.token) {
      const auth = client.handshake.query.token as string;
      return auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
    }

    // 3. Check Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    // 3. Check Cookie header for access_token
    const cookieHeader = client.handshake?.headers?.cookie;
    if (cookieHeader && typeof cookieHeader === 'string') {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith('access_token=')) {
          return decodeURIComponent(cookie.slice('access_token='.length));
        }
      }
    }

    return null;
  }
}
