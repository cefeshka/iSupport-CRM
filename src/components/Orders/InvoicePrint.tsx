import { X, Printer } from 'lucide-react';

interface InvoicePrintProps {
  invoice: any;
  onClose: () => void;
}

export default function InvoicePrint({ invoice, onClose }: InvoicePrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('lv-LV', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible;
          }
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-neutral-100 z-50 overflow-auto">
        <div className="no-print sticky top-0 bg-white border-b border-neutral-300 shadow-sm z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Rēķins: {invoice.invoice_number}</h2>
              <p className="text-sm text-neutral-500">Gatavs drukāšanai</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Drukāt
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-8">
          <div
            id="invoice-print-area"
            className="bg-white shadow-lg"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '20mm',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <div className="relative">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/isupport_png.png"
                      alt="iSupport"
                      className="h-12 w-auto"
                    />
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="font-bold text-lg">SIA iSupport serviss</div>
                    <div>Reģ. Nr. 40203539592</div>
                    <div>Rīga, Latvija</div>
                    <div>Tālrunis: +371 20123456</div>
                    <div>E-pasts: info@isupport.lv</div>
                  </div>
                </div>

                <div className="text-right">
                  <h1 className="text-3xl font-bold text-neutral-900 mb-4">RĒĶINS</h1>
                  <div className="text-sm space-y-1">
                    <div className="font-semibold">Nr. {invoice.invoice_number}</div>
                    <div>Datums: {formatDate(invoice.issued_date)}</div>
                    <div className="text-red-600 font-medium">
                      Apmaksas termiņš: {formatDate(invoice.payment_due_date)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-b-2 border-neutral-900 py-4 mb-8">
                <div className="font-bold text-sm mb-2">SAŅĒMĒJS:</div>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-base">{invoice.client_company_name}</div>
                  <div>Reģ. Nr.: {invoice.client_registration_number}</div>
                  {invoice.client_pvn_number && (
                    <div>PVN Nr.: {invoice.client_pvn_number}</div>
                  )}
                  <div>Juridiskā adrese: {invoice.client_legal_address}</div>
                </div>
              </div>

              <table className="w-full mb-8 text-sm border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-t-2 border-b-2 border-neutral-900">
                    <th className="text-left py-3 px-4 font-semibold">Nr.</th>
                    <th className="text-left py-3 px-4 font-semibold">Pakalpojuma apraksts</th>
                    <th className="text-center py-3 px-4 font-semibold">Daudzums</th>
                    <th className="text-right py-3 px-4 font-semibold">Cena (EUR)</th>
                    <th className="text-right py-3 px-4 font-semibold">Summa (EUR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-300">
                    <td className="py-3 px-4">1</td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{invoice.service_type}</div>
                      <div className="text-xs text-neutral-600 mt-1">{invoice.service_description}</div>
                    </td>
                    <td className="text-center py-3 px-4">{invoice.quantity}</td>
                    <td className="text-right py-3 px-4">{parseFloat(invoice.unit_price).toFixed(2)}</td>
                    <td className="text-right py-3 px-4 font-medium">
                      {parseFloat(invoice.subtotal).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-80">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-neutral-300">
                      <span>Summa bez PVN:</span>
                      <span className="font-medium">€{parseFloat(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-300">
                      <span>PVN {parseFloat(invoice.vat_rate).toFixed(0)}%:</span>
                      <span className="font-medium">€{parseFloat(invoice.vat_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 border-t-2 border-b-2 border-neutral-900 bg-neutral-50">
                      <span className="font-bold text-base">KOPĀ APMAKSAI:</span>
                      <span className="font-bold text-lg">€{parseFloat(invoice.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs italic text-neutral-600 border-l-4 border-blue-500 pl-3 py-2">
                    Summa vārdiem: {invoice.total_in_words}
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-4 mb-8">
                <div className="font-bold text-sm mb-3">MAKSĀJUMA INFORMĀCIJA:</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-neutral-600 text-xs mb-1">Banka:</div>
                    <div className="font-medium">{invoice.bank_name}</div>
                  </div>
                  <div>
                    <div className="text-neutral-600 text-xs mb-1">IBAN:</div>
                    <div className="font-mono font-medium">{invoice.bank_iban}</div>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="mb-8 text-sm">
                  <div className="font-semibold mb-2">Piezīmes:</div>
                  <div className="text-neutral-700 bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    {invoice.notes}
                  </div>
                </div>
              )}

              <div className="border-t border-neutral-300 pt-6 mt-12">
                <div className="flex justify-between items-end">
                  <div className="text-xs text-neutral-500 space-y-1">
                    <div>Dokuments sagatavots elektroniski un ir derīgs bez paraksta</div>
                    <div>Sagatavots: {formatDate(invoice.created_at)}</div>
                  </div>
                  <div className="text-center">
                    <div className="border-t-2 border-neutral-900 w-48 mb-2"></div>
                    <div className="text-xs text-neutral-600">Paraksts un zīmogs</div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none">
                <img
                  src="/isupport_png.png"
                  alt="Watermark"
                  className="w-64 h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
