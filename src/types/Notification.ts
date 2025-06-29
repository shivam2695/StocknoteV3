export interface Notification {
  id: string;
  type: 'trade_added' | 'focus_taken' | 'team_invite' | 'team_trade' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  userId: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}