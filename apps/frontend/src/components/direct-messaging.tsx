'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { Clock, ExternalLink, MessageSquare, Send, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Message {
  _id: string;
  from: string;
  to: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface DirectMessagingProps {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  isEnabled: boolean;
}

export default function DirectMessaging({ 
  applicationId, 
  candidateId, 
  candidateName, 
  isEnabled 
}: DirectMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState({ subject: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!isEnabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/messaging/conversation/${applicationId}/${candidateId}`);
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, applicationId, candidateId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.subject.trim() || !newMessage.message.trim()) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      const response = await api.post('/messaging/send', {
        candidateId,
        applicationId,
        subject: newMessage.subject,
        message: newMessage.message,
      });
      
      if (response.data.success) {
        setMessages(prev => [...prev, response.data.data]);
        setNewMessage({ subject: '', message: '' });
        toast({
          title: "Message Sent",
          description: "Your message has been sent successfully!",
        });
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (isEnabled && applicationId && candidateId) {
      fetchMessages();
    }
  }, [isEnabled, applicationId, candidateId, fetchMessages]);

  const handleUpgradePlan = () => {
    router.push('/pricing');
    toast({
      title: "Upgrade Required",
      description: "Redirecting to pricing page...",
    });
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Direct Messaging
            <Badge variant="secondary">Premium Feature</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4 mb-4">
            Upgrade your plan to message candidates directly.
          </p>
          <Button onClick={handleUpgradePlan} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Direct Messaging
          <Badge variant="default">Active</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Message {candidateName} directly about this application
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div key={message._id} className="flex gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">You</span>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-1">{message.subject}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Send Message Form */}
        <form onSubmit={sendMessage} className="space-y-4">
          <div>
            <Input
              placeholder="Message subject"
              value={newMessage.subject}
              onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Type your message..."
              value={newMessage.message}
              onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
              rows={4}
              required
            />
          </div>
          <Button type="submit" disabled={isSending} className="w-full">
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
