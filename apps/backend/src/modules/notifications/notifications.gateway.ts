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
    console.log(`✅ Notifications WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Notifications WebSocket client disconnected: ${client.id}`);
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
    console.log(`User ${userId} joined notifications room`);
  }

  // Method to send notification to specific user
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('newNotification', notification);
    console.log(`📢 Sent notification to user ${userId}:`, notification.title);
  }

  // Method to send notification to multiple users
  sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach(userId => {
      this.server.to(`user:${userId}`).emit('newNotification', notification);
    });
    console.log(`📢 Sent notification to ${userIds.length} users:`, notification.title);
  }

  // Method to update unread count for user
  updateUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCountUpdate', { count });
    console.log(`📊 Updated unread count for user ${userId}: ${count}`);
  }
}
