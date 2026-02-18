import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Calendar, Clock, X, CheckCircle2, Square, CheckSquare, Package, AlertCircle, AlertTriangle, Minus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import type { Database } from '../../lib/database.types';

type Task = Database['public']['Tables']['tasks']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface TaskManagerProps {
  tasks: Task[];
  onRefresh: () => void;
}

interface TaskWithOrder extends Task {
  order?: {
    id: string;
    device_type: string;
    device_model: string | null;
    client?: {
      full_name: string;
    } | null;
  } | null;
}

export default function TaskManager({ tasks, onRefresh }: TaskManagerProps) {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [showNewTask, setShowNewTask] = useState(false);
  const [showDetailTask, setShowDetailTask] = useState<TaskWithOrder | null>(null);
  const [showPostpone, setShowPostpone] = useState<Task | null>(null);
  const [postponeDate, setPostponeDate] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskOrderId, setNewTaskOrderId] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [tasksWithOrders, setTasksWithOrders] = useState<TaskWithOrder[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const exampleTasks = [
    'Помыть полы',
    'Вынести мусор',
    'Выслать телефон',
    'Отзвонить клиенту',
    'Заказать деталь'
  ];

  useEffect(() => {
    if (showNewTask || showDetailTask) {
      loadOrders();
      loadProfiles();
    }
  }, [showNewTask, showDetailTask]);

  useEffect(() => {
    loadTasksWithOrders();
  }, [tasks]);

  async function loadOrders() {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        clients (
          full_name
        )
      `)
      .eq('location_id', currentLocation.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setOrders(data as any);
    }
  }

  async function loadProfiles() {
    if (!currentLocation) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('location_id', currentLocation.id)
      .order('full_name');

    if (data) {
      setProfiles(data);
    }
  }

  async function loadTasksWithOrders() {
    const tasksWithOrderIds = tasks.filter(t => t.order_id);

    if (tasksWithOrderIds.length === 0) {
      setTasksWithOrders(tasks.map(t => ({ ...t, order: null })));
      return;
    }

    const orderIds = tasksWithOrderIds.map(t => t.order_id).filter(Boolean) as string[];

    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id,
        device_type,
        device_model,
        clients (
          full_name
        )
      `)
      .in('id', orderIds);

    const ordersMap = new Map(ordersData?.map(o => [o.id, o]) || []);

    setTasksWithOrders(tasks.map(t => ({
      ...t,
      order: t.order_id ? ordersMap.get(t.order_id) : null
    })));
  }

  async function createTask(title: string, description?: string) {
    if (!profile || !title.trim() || !currentLocation) return;

    await supabase.from('tasks').insert({
      user_id: profile.id,
      title: title,
      description: description || null,
      due_date: newTaskDate,
      due_time: newTaskTime || null,
      order_id: newTaskOrderId || null,
      priority: newTaskPriority,
      assigned_to: newTaskAssignee || profile.id,
      location_id: currentLocation.id
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskTime('');
    setNewTaskOrderId('');
    setNewTaskPriority('medium');
    setNewTaskAssignee('');
    setShowNewTask(false);
    onRefresh();
  }

  async function toggleTask(taskId: string, currentStatus: boolean) {
    await supabase
      .from('tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', taskId);

    onRefresh();
  }

  async function postponeTask() {
    if (!showPostpone || !postponeDate) return;

    await supabase
      .from('tasks')
      .update({ due_date: postponeDate })
      .eq('id', showPostpone.id);

    setShowPostpone(null);
    setPostponeDate('');
    onRefresh();
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId);
    setShowDetailTask(null);
    onRefresh();
  }

  const incompleteTasks = tasksWithOrders.filter(t => !t.is_completed);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Задачи на сегодня</h3>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            {tasksWithOrders.filter(t => t.is_completed).length} / {tasksWithOrders.length} выполнено
          </p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="px-2.5 py-1 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg text-xs hover:from-fuchsia-600 hover:to-pink-600 transition-all shadow-sm shadow-fuchsia-500/20 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Новая
        </button>
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {tasksWithOrders.length === 0 ? (
          <div className="py-4">
            <p className="text-xs text-neutral-500 text-center mb-3">
              Нет задач. Вот несколько примеров:
            </p>
            <div className="space-y-1.5">
              {exampleTasks.map((example, index) => (
                <button
                  key={index}
                  onClick={() => createTask(example)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors text-left"
                >
                  <span className="text-xs text-neutral-700">{example}</span>
                  <Plus className="w-3.5 h-3.5 text-neutral-400 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {incompleteTasks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
                  Активные задачи
                </p>
                {incompleteTasks.map((task) => {
                  const priorityConfig = {
                    high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle, label: 'Высокий' },
                    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertTriangle, label: 'Средний' },
                    low: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: Minus, label: 'Низкий' }
                  };
                  const priority = priorityConfig[task.priority as 'high' | 'medium' | 'low'] || priorityConfig.medium;
                  const PriorityIcon = priority.icon;

                  return (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 p-2 rounded-lg border border-neutral-200 hover:border-neutral-300 bg-white transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id, task.is_completed)}
                      className="mt-0.5 hover:bg-neutral-100 rounded transition-colors flex-shrink-0"
                      title="Отметить выполненной"
                    >
                      <Square className="w-4 h-4 text-neutral-400 hover:text-black transition-colors" />
                    </button>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setShowDetailTask(task)}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-medium text-neutral-900">
                          {task.title}
                        </h4>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 ${priority.bg} ${priority.text} border ${priority.border} rounded text-[9px] font-medium`}>
                          <PriorityIcon className="w-2.5 h-2.5" />
                          {priority.label}
                        </span>
                        {task.order && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-medium">
                            <Package className="w-2.5 h-2.5" />
                            Заказ
                          </span>
                        )}
                      </div>
                      {task.order && (
                        <p className="text-[10px] text-blue-600 mt-0.5">
                          {task.order.device_type} {task.order.device_model || ''}
                          {task.order.client && ` — ${task.order.client.full_name}`}
                        </p>
                      )}
                      {task.description && (
                        <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-400">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(task.due_date).toLocaleDateString('ru-RU')}
                        {task.due_time && (
                          <>
                            <span className="mx-0.5">•</span>
                            <Clock className="w-2.5 h-2.5" />
                            {task.due_time.substring(0, 5)}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPostpone(task)}
                      className="p-1 hover:bg-neutral-100 rounded transition-colors"
                      title="Отложить"
                    >
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}

            {tasksWithOrders.filter(t => t.is_completed).length > 0 && (
              <div className="space-y-1.5 pt-2 mt-2 border-t border-neutral-200">
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">
                  Выполненные
                </p>
                {tasksWithOrders.filter(t => t.is_completed).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200"
                  >
                    <button
                      onClick={() => toggleTask(task.id, task.is_completed)}
                      className="mt-0.5 hover:bg-neutral-200 rounded transition-colors flex-shrink-0"
                      title="Отметить невыполненной"
                    >
                      <CheckSquare className="w-4 h-4 text-black" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-neutral-400 line-through">
                        {task.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showNewTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Новая задача</h3>
              <button
                onClick={() => setShowNewTask(false)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Название задачи
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Например: Отзвонить клиенту"
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Описание (необязательно)
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Подробности задачи..."
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Исполнитель
                  </label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    <option value="">Я</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Приоритет
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Связать с заказом (необязательно)
                </label>
                <select
                  value={newTaskOrderId}
                  onChange={(e) => setNewTaskOrderId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="">Без привязки к заказу</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.device_type} {order.device_model || ''}
                      {(order as any).clients?.full_name && ` — ${(order as any).clients.full_name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Дата выполнения
                  </label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Время
                  </label>
                  <input
                    type="time"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  onClick={() => setShowNewTask(false)}
                  className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => createTask(newTaskTitle, newTaskDescription)}
                  disabled={!newTaskTitle.trim()}
                  className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg hover:from-fuchsia-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Создать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Детали задачи</h3>
              <button
                onClick={() => setShowDetailTask(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-neutral-900 mb-1.5">{showDetailTask.title}</h4>
                {showDetailTask.description && (
                  <p className="text-xs text-neutral-600 whitespace-pre-wrap">
                    {showDetailTask.description}
                  </p>
                )}
              </div>

              {showDetailTask.order && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-900 mb-1">
                    <Package className="w-3.5 h-3.5" />
                    Связанный заказ
                  </div>
                  <p className="text-xs text-blue-700">
                    {showDetailTask.order.device_type} {showDetailTask.order.device_model || ''}
                  </p>
                  {showDetailTask.order.client && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Клиент: {showDetailTask.order.client.full_name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(showDetailTask.due_date).toLocaleDateString('ru-RU')}
                {showDetailTask.due_time && (
                  <>
                    <span className="mx-1">•</span>
                    <Clock className="w-3.5 h-3.5" />
                    {showDetailTask.due_time.substring(0, 5)}
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  onClick={() => deleteTask(showDetailTask.id)}
                  className="flex-1 px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Удалить
                </button>
                <button
                  onClick={() => {
                    toggleTask(showDetailTask.id, showDetailTask.is_completed);
                    setShowDetailTask(null);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg hover:from-fuchsia-600 hover:to-pink-600 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Выполнено
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPostpone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Отложить задачу</h3>
              <button
                onClick={() => setShowPostpone(null)}
                className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-3">{showPostpone.title}</p>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Перенести на дату
                </label>
                <input
                  type="date"
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPostpone(null)}
                  className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={postponeTask}
                  disabled={!postponeDate}
                  className="flex-1 px-3 py-1.5 text-xs bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-lg hover:from-fuchsia-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отложить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
