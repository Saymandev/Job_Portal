import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    
    
    // Handle authentication if needed
    // You can add JWT verification here if required
  }

  handleDisconnect(client: Socket) {
    
    // Remove user from connected users
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    
    this.connectedUsers.set(userId, client.id);
    client.join(`user:${userId}`);
    
  }

  // Method to send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    const isUserConnected = this.connectedUsers.has(userId);

    
    this.server.to(`user:${userId}`).emit('newNotification', notification);
    
    if (!isUserConnected) {
    }
  }

  // Method to send notification to multiple users
  sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach(userId => {
      this.server.to(`user:${userId}`).emit('newNotification', notification);
    });
  }

  // Method to update unread count for user
  updateUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCountUpdate', { count });
    
  }
}
