import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import { UserPlus, Edit, Trash2, Users, Phone, X, Check, Mail, Lock, Briefcase, Percent } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  commission_rate: number | null;
  role_id: string | null;
  roles?: {
    name: string;
    description: string;
  };
}

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface NewUser {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role_id: string;
  specialization: string;
  commission_rate: number;
}

export default function UsersManagement() {
  const { currentLocation } = useLocation();
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role_id: '',
    specialization: '',
    commission_rate: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [usersRes, rolesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          phone,
          avatar_url,
          created_at,
          commission_rate,
          role_id,
          roles:role_id (
            name,
            description
          )
        `)
        .order('created_at', { ascending: false }),
      supabase.from('roles').select('*').order('name', { ascending: true })
    ]);

    if (usersRes.data) setUsers(usersRes.data as any);
    if (rolesRes.data) {
      setRoles(rolesRes.data);
      if (rolesRes.data.length > 0) {
        setNewUser(prev => ({ ...prev, role_id: rolesRes.data[0].id }));
      }
    }
    setLoading(false);
  }

  async function handleAddUser() {
    if (!newUser.email || !newUser.password || !newUser.full_name || !newUser.role_id) {
      alert('Заполните все обязательные поля (Email, Пароль, Имя, Роль)');
      return;
    }

    if (!currentLocation) {
      alert('Ошибка: Не выбран филиал. Пожалуйста, выберите филиал перед созданием пользователя.');
      return;
    }

    if (newUser.password.length < 6) {
      alert('Пароль должен содержать минимум 6 символов');
      return;
    }

    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: newUser.full_name,
            phone: newUser.phone,
            role_id: newUser.role_id,
            commission_rate: newUser.commission_rate,
            location_id: currentLocation.id
          }
        }
      });

      if (authError) {
        let errorMessage = 'Ошибка при создании пользователя: ';

        if (authError.message.includes('User already registered')) {
          errorMessage += 'Пользователь с таким email уже существует';
        } else if (authError.message.includes('Password')) {
          errorMessage += 'Неверный формат пароля (минимум 6 символов)';
        } else if (authError.message.includes('Invalid email')) {
          errorMessage += 'Неверный формат email адреса';
        } else {
          errorMessage += authError.message;
        }

        alert(errorMessage);
        console.error('Auth error:', authError);
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: newUser.full_name,
            phone: newUser.phone || null,
            role_id: newUser.role_id,
            commission_rate: newUser.commission_rate || 0,
            location_id: currentLocation.id,
            role: 'master'
          });

        if (profileError) {
          let profileErrorMessage = 'Ошибка при создании профиля: ';

          if (profileError.message.includes('duplicate key')) {
            profileErrorMessage += 'Профиль с таким ID уже существует';
          } else if (profileError.message.includes('foreign key')) {
            profileErrorMessage += 'Неверный ID роли или филиала';
          } else if (profileError.message.includes('RLS')) {
            profileErrorMessage += 'Недостаточно прав для создания профиля (RLS Policy)';
          } else {
            profileErrorMessage += profileError.message;
          }

          console.error('Profile error details:', profileError);
          alert(profileErrorMessage);
          return;
        }
      }

      alert('Пользователь успешно создан! На email отправлено письмо для подтверждения.');
      setShowAddModal(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role_id: roles[0]?.id || '',
        specialization: '',
        commission_rate: 0
      });
      loadData();
    } catch (error: any) {
      console.error('Unexpected error creating user:', error);
      alert('Неожиданная ошибка: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Удалить этого пользователя?')) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      alert('Ошибка при удалении');
    } else {
      loadData();
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  function getRoleColor(roleName: string) {
    const colors: Record<string, string> = {
      'Админ': 'bg-red-100 text-red-700 border-red-200',
      'Главный мастер': 'bg-blue-100 text-blue-700 border-blue-200',
      'Мастер': 'bg-green-100 text-green-700 border-green-200',
      admin: 'bg-red-100 text-red-700 border-red-200',
      manager: 'bg-blue-100 text-blue-700 border-blue-200',
      master: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[roleName] || 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Сотрудники</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Добавляйте и управляйте доступом сотрудников
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Добавить сотрудника
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-700">
                    {getInitials(user.full_name)}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">{user.full_name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    {user.phone && (
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {user.phone}
                      </span>
                    )}
                    {user.commission_rate !== null && user.commission_rate > 0 && (
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {user.commission_rate}% комиссия
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 border text-xs font-medium rounded-full ${getRoleColor((user.roles as any)?.name || user.role)}`}>
                  {(user.roles as any)?.name || user.role}
                </span>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              Нет сотрудников. Добавьте первого сотрудника.
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Добавить сотрудника</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Полное имя *
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Пароль *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Минимум 6 символов"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Телефон
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Роль *
                </label>
                <select
                  value={newUser.role_id}
                  onChange={(e) => setNewUser({ ...newUser, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Специализация
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={newUser.specialization}
                    onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="iPhone, Samsung..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Комиссия (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newUser.commission_rate}
                    onChange={(e) => setNewUser({ ...newUser, commission_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 text-neutral-700"
              >
                Отмена
              </button>
              <button
                onClick={handleAddUser}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">Совет</h4>
            <p className="text-xs text-blue-700">
              Назначайте роли сотрудникам в соответствии с их обязанностями.
              Это обеспечит безопасность данных и правильное распределение задач.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
