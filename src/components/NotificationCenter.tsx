import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bell, Heart, MessageCircle, Calendar, Users, Settings } from 'lucide-react';

interface Notification {
  id: string;
  type: 'match' | 'message' | 'event' | 'like';
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar?: string;
}

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'match',
      title: 'New Match! 💕',
      message: 'You and Alex matched! Start a conversation.',
      time: '2 min ago',
      read: false,
      avatar: '👩‍🦰'
    },
    {
      id: '2',
      type: 'message',
      title: 'New Message',
      message: 'Sam: "Hey! How was your weekend?"',
      time: '5 min ago',
      read: false,
      avatar: '👩‍🦱'
    },
    {
      id: '3',
      type: 'event',
      title: 'Pride Brunch Tomorrow',
      message: 'Don\'t forget about the community brunch!',
      time: '1 hour ago',
      read: true
    },
    {
      id: '4',
      type: 'like',
      title: 'Someone liked you!',
      message: 'You have a new admirer 😊',
      time: '3 hours ago',
      read: true
    }
  ]);

  const [pushEnabled, setPushEnabled] = useState(true);

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'message': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'event': return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'like': return <Heart className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-6 h-6 text-purple-600" />
          <h2 className="wedding-heading rainbow-header">Notifications</h2>
          {unreadCount > 0 && (
            <Badge className="bg-pink-500">{unreadCount}</Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/profile')}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Push Notifications</CardTitle>
            <Button
              variant={pushEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setPushEnabled(!pushEnabled)}
              className={pushEnabled ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {pushEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card 
            key={notification.id}
            className={`cursor-pointer transition-all ${
              !notification.read ? 'border-pink-200 bg-pink-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => markAsRead(notification.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {notification.avatar ? (
                    <div className="text-2xl">{notification.avatar}</div>
                  ) : (
                    getIcon(notification.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-gray-900">
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-500">
                      {notification.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-pink-500 rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;
