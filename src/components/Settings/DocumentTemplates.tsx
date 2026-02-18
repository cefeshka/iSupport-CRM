import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Edit, Eye, X } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  template_type: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export default function DocumentTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('receipt');
  const [templateContent, setTemplateContent] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    const { data } = await supabase
      .from('document_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!templateName.trim() || !templateContent.trim()) return;

    if (editingTemplate) {
      await supabase
        .from('document_templates')
        .update({
          name: templateName,
          template_type: templateType,
          content: templateContent
        })
        .eq('id', editingTemplate.id);
    } else {
      await supabase
        .from('document_templates')
        .insert({
          name: templateName,
          template_type: templateType,
          content: templateContent,
          is_active: true
        });
    }

    setShowModal(false);
    resetForm();
    loadTemplates();
  }

  function openEditModal(template: Template) {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateType(template.template_type);
    setTemplateContent(template.content);
    setShowModal(true);
  }

  function openPreview(template: Template) {
    setEditingTemplate(template);
    setTemplateContent(template.content);
    setShowPreview(true);
  }

  function resetForm() {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateType('receipt');
    setTemplateContent('');
  }

  const typeLabels: Record<string, string> = {
    receipt: 'Квитанция',
    warranty: 'Гарантийный талон',
    invoice: 'Счет',
    act: 'Акт приема-передачи'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Шаблоны документов</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Настройте шаблоны для печати документов
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Новый шаблон
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Загрузка...</div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">{template.name}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {typeLabels[template.template_type] || template.template_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openPreview(template)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Просмотр
                </button>
                <button
                  onClick={() => openEditModal(template)}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Редактировать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Доступные переменные:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
          <div>{"{{order_number}}"} - Номер заказа</div>
          <div>{"{{client_name}}"} - Имя клиента</div>
          <div>{"{{client_phone}}"} - Телефон клиента</div>
          <div>{"{{device_type}}"} - Тип устройства</div>
          <div>{"{{device_model}}"} - Модель устройства</div>
          <div>{"{{issue_description}}"} - Описание проблемы</div>
          <div>{"{{estimated_cost}}"} - Стоимость</div>
          <div>{"{{due_date}}"} - Срок выполнения</div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Название шаблона</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Например: Квитанция о приемке"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Тип документа</label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="receipt">Квитанция</option>
                  <option value="warranty">Гарантийный талон</option>
                  <option value="invoice">Счет</option>
                  <option value="act">Акт приема-передачи</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">HTML содержимое</label>
                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm h-64 resize-none"
                  placeholder="<html>...</html>"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex gap-3">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingTemplate ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Предпросмотр: {editingTemplate.name}</h3>
              <button onClick={() => { setShowPreview(false); setEditingTemplate(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="border rounded-lg p-6"
                dangerouslySetInnerHTML={{ __html: templateContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
