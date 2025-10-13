import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>();

  constructor(private chatService: ChatService) {}

  afterInit(server: Server) {
    
    this.server = server;
  }

  handleConnection(client: Socket) {
    
  }

  // Debug method to check room membership
  private debugRoomMembership(conversationId: string) {
    try {
      if (!this.server || !this.server.sockets || !this.server.sockets.adapter) {
        
        return;
      }
      
      const room = this.server.sockets.adapter.rooms.get(`conversation:${conversationId}`);
      
    } catch (error) {
      
    }
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

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    
    
    this.connectedUsers.set(userId, client.id);
    client.join(`user:${userId}`);
    
    
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    
    client.join(`conversation:${conversationId}`);
    client.emit('joinedConversation', { conversationId, success: true });
    
    
    // Debug room membership after joining (with safety check)
    setTimeout(() => {
      if (this.server && this.server.sockets && this.server.sockets.adapter) {
        this.debugRoomMembership(conversationId);
      }
    }, 100);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; senderId: string; content: string },
  ) {
   
    
    const { conversationId, senderId, content } = data;

    // Check if sender is admin - if so, don't create message here as it's handled by API
    const { User } = await import('../users/schemas/user.schema');
    const UserModel = this.chatService['messageModel'].db.model('User');
    const sender = await UserModel.findById(senderId);
    
    if (sender?.role === 'admin') {
      
     
      return { error: 'Admin messages should be sent via API endpoint' };
    }

    
    const message = await this.chatService.createMessage(conversationId, senderId, content);
    
   

    // Emit to all users in the conversation
    
    this.debugRoomMembership(conversationId);
    
    // Emit to the conversation room
    this.server.to(`conversation:${conversationId}`).emit('newMessage', message);
    
    
    // Also emit to individual user
   
    this.server.to(`user:${senderId}`).emit('newMessage', message);

    return message;
  }

  @SubscribeMessage('sendAdminMessage')
  async handleAdminMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; adminId: string; content: string },
  ) {
   
    const { conversationId, adminId, content } = data;

    const message = await this.chatService.createAdminMessage(conversationId, adminId, content);
    

    // Emit to all users in the conversation
    this.debugRoomMembership(conversationId);
    this.server.to(`conversation:${conversationId}`).emit('newMessage', message);
    

    return message;
  }

  @SubscribeMessage('sendUserToAdminMessage')
  async handleUserToAdminMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; content: string },
  ) {
    
    
    const { conversationId, userId, content } = data;

    
    const message = await this.chatService.createMessage(conversationId, userId, content);
    

    // Emit to all users in the conversation
    
    this.debugRoomMembership(conversationId);
    this.server.to(`conversation:${conversationId}`).emit('newMessage', message);
    

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string; isTyping: boolean },
  ) {
    client.to(`conversation:${data.conversationId}`).emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    await this.chatService.markAsRead(data.conversationId, data.userId);
    this.server.to(`conversation:${data.conversationId}`).emit('messagesRead', data.conversationId);
  }
}

