import { useState, useEffect } from 'react';
import { Notification, NotificationState } from '../types/Notification';

export function useNotifications(userEmail?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage
  const loadNotifications = () => {
    if (!userEmail) return;
    
    const stored = localStorage.getItem(`notifications_${userEmail}`);
    if (stored) {
      const notificationData = JSON.parse(stored);
      setNotifications(notificationData);
      setUnreadCount(notificationData.filter((n: Notification) => !n.read).length);
    }
  };

  // Save notifications to localStorage
  const saveNotifications = (newNotifications: Notification[]) => {
    if (!userEmail) return;
    
    localStorage.setItem(`notifications_${userEmail}`, JSON.stringify(newNotifications));
    setNotifications(newNotifications);
    setUnreadCount(newNotifications.filter(n => !n.read).length);
  };

  useEffect(() => {
    loadNotifications();
  }, [userEmail]);

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'userId'>) => {
    if (!userEmail) return;
    
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      userId: userEmail,
      read: false
    };

    const updatedNotifications = [newNotification, ...notifications].slice(0, 50); // Keep only last 50
    saveNotifications(updatedNotifications);
  };

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updatedNotifications);
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updatedNotifications);
  };

  const deleteNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    saveNotifications(updatedNotifications);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refetch: loadNotifications
  };
}