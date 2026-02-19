import { useState } from 'react';
import { X, FileText, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { toast } from '../../lib/toast';
import { numberToLatvianWords } from '../../lib/numberToLatvianWords';
import InvoicePrint from './InvoicePrint';

interface InvoiceModalProps {
  order: any;
  onClose: () => void;
}

interface InvoiceData {
  clientCompanyName: string;
  clientRegistrationNumber: string;
  clientPvnNumber: string;
  clientLegalAddress: string;
  serviceType: string;
  serviceDescription: string;
  unitPrice: number;
  vatRate: number;
  paymentDueDays: number;
  bankName: string;
  bankIban: string;
  notes: string;
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const { profile } = useAuth();
  const { currentLocation } = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);

  const [formData, setFormData] = useState<InvoiceData>({
    clientCompanyName: '',
    clientRegistrationNumber: '',
    clientPvnNumber: '',
    clientLegalAddress: '',
    serviceType: 'Telefona remonts',
    serviceDescription: `${order.device_type || ''} ${order.device_model || ''} remonts`.trim(),
    unitPrice: parseFloat(order.total_cost || '0'),
    vatRate: 21,
    paymentDueDays: 3,
    bankName: 'Swedbank',
    bankIban: 'LV12HABA0551234567890',
    notes: ''
  });

  const calculateTotals = () => {
    const subtotal = formData.unitPrice;
    const vatAmount = subtotal * (formData.vatRate / 100);
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  const handleGenerate = async () => {
    if (!formData.clientCompanyName.trim()) {
      toast.error('Lūdzu, ievadiet firmas nosaukumu');
      return;
    }
    if (!formData.clientRegistrationNumber.trim()) {
      toast.error('Lūdzu, ievadiet reģistrācijas numuru');
      return;
    }
    if (!formData.clientLegalAddress.trim()) {
      toast.error('Lūdzu, ievadiet juridisko adresi');
      return;
    }
    if (formData.unitPrice <= 0) {
      toast.error('Summai jābūt lielākai par 0');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');

      if (numberError) throw numberError;

      const paymentDueDate = new Date();
      paymentDueDate.setDate(paymentDueDate.getDate() + formData.paymentDueDays);

      const totalInWords = numberToLatvianWords(total);

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          order_id: order.id,
          location_id: currentLocation?.id,
          client_company_name: formData.clientCompanyName,
          client_registration_number: formData.clientRegistrationNumber,
          client_pvn_number: formData.clientPvnNumber || null,
          client_legal_address: formData.clientLegalAddress,
          service_type: formData.serviceType,
          service_description: formData.serviceDescription,
          quantity: 1,
          unit_price: formData.unitPrice,
          vat_rate: formData.vatRate,
          total_in_words: totalInWords,
          payment_due_date: paymentDueDate.toISOString().split('T')[0],
          bank_name: formData.bankName,
          bank_iban: formData.bankIban,
          notes: formData.notes || null,
          created_by: profile?.id
        } as any)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      setGeneratedInvoice(invoice);
      setShowPrintView(true);
      toast.success('Rēķins sagatavots veiksmīgi!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Neizdevās sagatavot rēķinu');
    } finally {
      setIsGenerating(false);
    }
  };

  if (showPrintView && generatedInvoice) {
    return (
      <InvoicePrint
        invoice={generatedInvoice}
        onClose={() => {
          setShowPrintView(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Sagatavot rēķinu</h2>
              <p className="text-sm text-neutral-500">Pasūtījums: {order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Klienta informācija</h3>
            <p className="text-sm text-blue-700">Ievadiet juridisko informāciju B2B klientiem</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Firmas nosaukums <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clientCompanyName}
                onChange={(e) => setFormData({ ...formData, clientCompanyName: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SIA Piemērs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Reģistrācijas numurs <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clientRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, clientRegistrationNumber: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="40103123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                PVN numurs (ja ir)
              </label>
              <input
                type="text"
                value={formData.clientPvnNumber}
                onChange={(e) => setFormData({ ...formData, clientPvnNumber: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="LV40103123456"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Juridiskā adrese <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.clientLegalAddress}
                onChange={(e) => setFormData({ ...formData, clientLegalAddress: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brīvības iela 1, Rīga, LV-1010"
              />
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Pakalpojuma informācija</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Pakalpojuma veids
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Telefona remonts">Telefona remonts</option>
                  <option value="Datora remonts">Datora remonts</option>
                  <option value="Planšetdatora remonts">Planšetdatora remonts</option>
                  <option value="Cits">Cits</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Summa (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Pakalpojuma apraksts
                </label>
                <textarea
                  value={formData.serviceDescription}
                  onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalizēts pakalpojuma apraksts"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6">
            <h3 className="font-semibold text-neutral-900 mb-4">Apmaksas informācija</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  PVN likme (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.vatRate}
                  onChange={(e) => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Apmaksas termiņš (dienas)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.paymentDueDays}
                  onChange={(e) => setFormData({ ...formData, paymentDueDays: parseInt(e.target.value) || 3 })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Bankas nosaukums
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.bankIban}
                  onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Piezīmes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Papildu informācija..."
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
            <h3 className="font-semibold text-neutral-900 mb-3">Rēķina kopsavilkums</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Summa bez PVN:</span>
                <span className="font-medium text-neutral-900">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">PVN {formData.vatRate}%:</span>
                <span className="font-medium text-neutral-900">€{vatAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-300 pt-2 flex justify-between">
                <span className="font-semibold text-neutral-900">Kopā apmaksai:</span>
                <span className="font-bold text-lg text-blue-600">€{total.toFixed(2)}</span>
              </div>
              <div className="text-xs text-neutral-500 italic mt-2">
                Summa vārdiem: {numberToLatvianWords(total)}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium"
          >
            Atcelt
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            {isGenerating ? 'Sagatavo...' : 'Sagatavot un drukāt'}
          </button>
        </div>
      </div>
    </div>
  );
}
