import { useEffect } from 'react';

interface OrderReceiptProps {
  order: {
    order_number: string;
    client_name: string;
    client_phone: string;
    device_type: string;
    device_model: string;
    issue_description: string;
    estimated_cost: number;
    due_date: string;
    imei: string | null;
    appearance: string | null;
    prepayment: number;
    created_at: string;
  };
  onClose: () => void;
}

export default function OrderReceipt({ order, onClose }: OrderReceiptProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const ReceiptContent = () => (
    <div className="receipt-content bg-white p-8 max-w-[210mm] mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-neutral-200 rounded flex items-center justify-center">
            <span className="text-2xl font-bold text-neutral-600">iS</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">iSupport</h1>
            <p className="text-sm text-neutral-600 mt-1">Rīga, Latvija</p>
            <p className="text-sm text-neutral-600">Tel.: (+371) 233 033 37</p>
            <p className="text-xs text-neutral-500 mt-1">
              Darba laiks: Pirm.-Svētd. 10:00-21:00
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-neutral-900">
            Kvīts № {order.order_number}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            no {formatDate(order.created_at)}
          </p>
        </div>
      </div>

      <div className="border-t-2 border-b-2 border-neutral-300 py-6 mb-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase">Klients</span>
            <p className="text-sm font-medium text-neutral-900 mt-1">{order.client_name}</p>
            <p className="text-sm text-neutral-600">{order.client_phone}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase">Ierīce</span>
            <p className="text-sm font-medium text-neutral-900 mt-1">
              {order.device_type} {order.device_model}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase">S/N / IMEI</span>
            <p className="text-sm text-neutral-900 mt-1">{order.imei || 'Nav norādīts'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase">Ārējais izskats</span>
            <p className="text-sm text-neutral-900 mt-1">{order.appearance || 'Nav apraksta'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase">Defekts</span>
            <p className="text-sm text-neutral-900 mt-1">{order.issue_description}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase">Orientējoša cena</span>
            <p className="text-base font-bold text-neutral-900 mt-1">{order.estimated_cost.toFixed(2)} EUR</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase">Priekšapmaksa</span>
            <p className="text-base font-bold text-neutral-900 mt-1">{order.prepayment.toFixed(2)} EUR</p>
          </div>
        </div>
      </div>

      <div className="mb-6 bg-neutral-50 p-4 rounded-lg">
        <h3 className="text-xs font-bold text-neutral-700 uppercase mb-2">Noteikumi</h3>
        <ol className="text-[8pt] text-neutral-600 space-y-1 leading-relaxed">
          <li>1. Ierīce tiek pieņemta remontam ar visiem pieejamajiem piederumiem. Serviss neatbild par klientam piederošām lietām.</li>
          <li>2. Diagnostika ir bezmaksas. Remonta darbi tiek veikti pēc klienta apstiprinājuma.</li>
          <li>3. Ja klients neatvēlē ierīci 30 dienu laikā pēc remonta pabeigšanas, serviss patur tiesības realizēt ierīci.</li>
          <li>4. Garantija uz veiktajiem darbiem ir 3 mēneši. Garantija neattiecas uz mehāniskiem bojājumiem.</li>
          <li>5. Serviss neatbild par datu zudumu remonta laikā. Klients ir atbildīgs par datu rezerves kopiju izveidošanu.</li>
          <li>6. Kvīts uzrādīšana ir obligāta, atgriežot ierīci. Bez kvīts ierīce netiek izdota.</li>
        </ol>
      </div>

      <div className="flex justify-between items-end mt-8 pt-6 border-t border-neutral-300">
        <div className="text-center">
          <div className="border-t border-neutral-400 w-48 mb-1"></div>
          <p className="text-xs text-neutral-600">Pieņēma (Paraksts)</p>
        </div>
        <div className="text-center">
          <div className="border-t border-neutral-400 w-48 mb-1"></div>
          <p className="text-xs text-neutral-600">Klients (Paraksts)</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible;
          }
          .receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .receipt-content {
            padding: 20mm !important;
            max-width: 210mm !important;
            box-shadow: none !important;
          }
          .perforation-line {
            border-top: 2px dashed #999 !important;
            margin: 20mm 0 !important;
            page-break-after: always;
          }
        }
        @page {
          size: A4;
          margin: 0;
        }
      `}</style>

      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-neutral-100 rounded-lg shadow-2xl w-full max-w-[230mm] max-h-[95vh] overflow-y-auto">
          <div className="no-print sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-lg">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Priekšskatījums kvītij</h2>
              <p className="text-sm text-neutral-500 mt-0.5">Kvīts № {order.order_number}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Drukāt kvīti
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
              >
                Aizvērt
              </button>
            </div>
          </div>

          <div className="receipt-print-area p-8">
            <ReceiptContent />

            <div className="perforation-line my-8 border-t-2 border-dashed border-neutral-400 relative">
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-100 px-3 text-xs text-neutral-500 no-print">
                SERVISA KOPIJA
              </span>
            </div>

            <ReceiptContent />
          </div>
        </div>
      </div>
    </>
  );
}
