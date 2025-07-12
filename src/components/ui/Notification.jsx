import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const Notification = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 max-w-sm";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-100 border border-green-300 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-100 border border-red-300 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-100 border border-yellow-300 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-100 border border-blue-300 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-100 border border-gray-300 text-gray-800`;
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <div className={`${getStyles()} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{getIcon()}</span>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="text-gray-500 hover:text-gray-700 text-lg"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
};

export const NotificationContainer = ({ notifications, onRemove }) => {
  return (
    <>
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </>
  );
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
};

export default Notification;