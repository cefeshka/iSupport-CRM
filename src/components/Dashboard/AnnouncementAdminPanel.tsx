import { useState, useEffect } from 'react';
import { Megaphone, Plus, X, Users, Eye, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { toast } from '../../lib/toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'high' | 'urgent';
  expires_at: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
}

interface AnnouncementStats {
  id: string;
  title: string;
  priority: string;
  total_users: number;
  read_count: number;
  read_by_users: string[];
}

export default function AnnouncementAdminPanel() {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showReaders, setShowReaders] = useState<string | null>(null);
  const [readers, setReaders] = useState<any[]>([]);
  const [stats, setStats] = useState<AnnouncementStats[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent',
    pinDuration: 1,
    targetAudience: 'all' as 'all' | 'specific',
    specificUserId: ''
  });

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadAnnouncements();
    loadStats();
    loadUsers();
  }, [currentLocation]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['technician', 'manager', 'admin']);

    if (data) setUsers(data);
  };

  const loadAnnouncements = async () => {
    if (!currentLocation?.id) return;

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading announcements:', error);
      return;
    }

    setAnnouncements(data || []);
  };

  const loadStats = async () => {
    if (!currentLocation?.id) return;

    const { data, error } = await supabase
      .from('announcement_stats')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stats:', error);
      return;
    }

    setStats(data || []);
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Lūdzu, aizpildiet visus laukus');
      return;
    }

    if (!currentLocation?.id || !profile?.id) {
      toast.error('Kļūda: Nav profila datu');
      return;
    }

    if (formData.targetAudience === 'specific' && !formData.specificUserId) {
      toast.error('Lūdzu, izvēlieties lietotāju');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + formData.pinDuration);

    const { error } = await supabase
      .from('announcements')
      .insert({
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        expires_at: expiresAt.toISOString(),
        location_id: currentLocation.id,
        created_by: profile.id,
        target_user_id: formData.targetAudience === 'specific' ? formData.specificUserId : null,
        is_active: true
      });

    if (error) {
      console.error('Error creating announcement:', error);
      toast.error(`Neizdevās izveidot paziņojumu: ${error.message}`);
      return;
    }

    toast.success('Paziņojums izveidots!');
    setFormData({ title: '', content: '', priority: 'normal', pinDuration: 1, targetAudience: 'all', specificUserId: '' });
    setShowCreateForm(false);
    loadAnnouncements();
    loadStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vai tiešām dzēst šo paziņojumu?')) return;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Neizdevās dzēst paziņojumu');
      return;
    }

    toast.success('Paziņojums dzēsts');
    loadAnnouncements();
    loadStats();
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      console.error('Error updating announcement:', error);
      toast.error('Neizdevās atjaunināt paziņojumu');
      return;
    }

    toast.success(currentState ? 'Paziņojums deaktivizēts' : 'Paziņojums aktivizēts');
    loadAnnouncements();
  };

  const showReadDetails = async (announcementId: string) => {
    const { data, error } = await supabase
      .from('announcement_reads')
      .select(`
        *,
        profiles:user_id(full_name, role)
      `)
      .eq('announcement_id', announcementId);

    if (error) {
      console.error('Error loading readers:', error);
      return;
    }

    setReaders(data || []);
    setShowReaders(announcementId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'URGENT';
      case 'high':
        return 'Augsta';
      default:
        return 'Normāla';
    }
  };

  const getStatForAnnouncement = (announcementId: string) => {
    return stats.find(s => s.id === announcementId);
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Paziņojumi (Admin)</h2>
            <p className="text-sm text-neutral-500">Pārvaldīt komandas paziņojumus</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          Jauns paziņojums
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Izveidot jaunu paziņojumu</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Virsraksts
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Paziņojuma virsraksts"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Saturs
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Paziņojuma teksts..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Adresāts
              </label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any, specificUserId: '' })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Visiem māsteriem</option>
                <option value="specific">Konkrētam māsterim</option>
              </select>
            </div>

            {formData.targetAudience === 'specific' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Izvēlēties māsteri
                </label>
                <select
                  value={formData.specificUserId}
                  onChange={(e) => setFormData({ ...formData, specificUserId: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Izvēlēties --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Prioritāte
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="normal">Normāla</option>
                  <option value="high">Augsta</option>
                  <option value="urgent">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Piespraust uz
                </label>
                <select
                  value={formData.pinDuration}
                  onChange={(e) => setFormData({ ...formData, pinDuration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="1">1 diena</option>
                  <option value="2">2 dienas</option>
                  <option value="7">1 nedēļa</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Izveidot
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
              >
                Atcelt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            Nav paziņojumu. Izveidojiet pirmo!
          </div>
        ) : (
          announcements.map((announcement) => {
            const stat = getStatForAnnouncement(announcement.id);
            const expired = isExpired(announcement.expires_at);

            return (
              <div
                key={announcement.id}
                className={`border-2 rounded-lg p-4 ${
                  expired ? 'bg-neutral-50 border-neutral-300 opacity-60' : getPriorityColor(announcement.priority)
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-neutral-900">{announcement.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        announcement.priority === 'urgent' || announcement.priority === 'high'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}>
                        {getPriorityBadge(announcement.priority)}
                      </span>
                      {!announcement.is_active && (
                        <span className="text-xs px-2 py-1 rounded font-medium bg-neutral-200 text-neutral-600">
                          Deaktivizēts
                        </span>
                      )}
                      {expired && (
                        <span className="text-xs px-2 py-1 rounded font-medium bg-neutral-300 text-neutral-700">
                          Beidzies
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-700 mb-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Beidzas: {new Date(announcement.expires_at).toLocaleDateString('lv-LV')}
                      </div>
                      {stat && (
                        <button
                          onClick={() => showReadDetails(announcement.id)}
                          className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Izlasīja: {stat.read_count}/{stat.total_users}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        announcement.is_active
                          ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                          : 'bg-green-200 text-green-700 hover:bg-green-300'
                      }`}
                    >
                      {announcement.is_active ? 'Deaktivizēt' : 'Aktivizēt'}
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showReaders && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Izlasījuši
              </h3>
              <button
                onClick={() => setShowReaders(null)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {readers.length === 0 ? (
                <div className="text-center py-4 text-neutral-500">
                  Neviens vēl nav izlasījis
                </div>
              ) : (
                readers.map((reader) => (
                  <div
                    key={reader.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-neutral-900">
                        {reader.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {reader.profiles?.role || 'N/A'}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(reader.read_at).toLocaleString('lv-LV')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
