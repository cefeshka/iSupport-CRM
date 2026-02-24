import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../lib/toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  created_at: string;
  expires_at: string;
  creator_name: string;
  is_read: boolean;
}

interface AnnouncementWidgetProps {
  onUrgentAnnouncement?: (announcement: Announcement) => void;
}

export default function AnnouncementWidget({ onUrgentAnnouncement }: AnnouncementWidgetProps) {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, [profile?.id]);

  const loadAnnouncements = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .rpc('get_active_announcements_for_user', {
        p_user_id: profile.id
      });

    if (error) {
      console.error('Error loading announcements:', error);
      setLoading(false);
      return;
    }

    const announcementData = (data || []) as Announcement[];
    setAnnouncements(announcementData);
    setLoading(false);

    const urgentUnread = announcementData.find(
      a => (a.priority === 'urgent' || a.priority === 'high') && !a.is_read
    );

    if (urgentUnread && onUrgentAnnouncement) {
      onUrgentAnnouncement(urgentUnread);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!profile?.id) return;

    const { error } = await supabase
      .rpc('mark_announcement_read', {
        p_announcement_id: announcementId,
        p_user_id: profile.id
      });

    if (error) {
      console.error('Error marking as read:', error);
      toast.error('Neizdevās atzīmēt kā izlasītu');
      return;
    }

    setAnnouncements(announcements.map(a =>
      a.id === announcementId ? { ...a, is_read: true } : a
    ));
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Info className="w-4 h-4 text-green-600" />;
    }
  };

  const getPriorityStyles = (priority: string, isRead: boolean) => {
    if (isRead) {
      return 'bg-neutral-50 border-neutral-200';
    }

    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-300 border-2';
      case 'high':
        return 'bg-amber-50 border-amber-300 border-2';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">!</span>;
      case 'high':
        return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-semibold">!</span>;
      default:
        return null;
    }
  };

  const unreadAnnouncements = announcements.filter(a => !a.is_read);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Bell className="w-4 h-4" />
          <h2 className="text-sm font-bold">Уведомления</h2>
          {unreadAnnouncements.length > 0 && (
            <div className="ml-auto w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-xs">{unreadAnnouncements.length}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`rounded-xl p-2.5 border transition-all ${getPriorityStyles(announcement.priority, announcement.is_read)} ${
              announcement.is_read ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                {getPriorityIcon(announcement.priority)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h3 className={`text-xs font-bold ${announcement.is_read ? 'text-neutral-600' : 'text-neutral-900'}`}>
                    {announcement.title}
                  </h3>
                  {getPriorityBadge(announcement.priority)}
                </div>

                <p className={`text-[10px] mb-1.5 line-clamp-2 ${announcement.is_read ? 'text-neutral-500' : 'text-neutral-700'}`}>
                  {announcement.content}
                </p>

                <div className="flex items-center justify-between">
                  <div className="text-[9px] text-neutral-400">
                    {announcement.creator_name}
                  </div>

                  {!announcement.is_read && (
                    <button
                      onClick={() => markAsRead(announcement.id)}
                      className="px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-[10px] font-medium flex items-center gap-0.5"
                    >
                      <CheckCircle className="w-2.5 h-2.5" />
                      OK
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
