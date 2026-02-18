import { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { numberToLatvianWords } from '../../lib/numberToLatvianWords';

interface DefektacijasAktsProps {
  order: {
    order_number: string;
    device_name: string;
    imei_serial: string;
    problem_description: string;
    final_cost: number;
  };
  masterName: string;
  onClose: () => void;
}

export default function DefektacijasAkts({ order, masterName, onClose }: DefektacijasAktsProps) {
  const [defectReason, setDefectReason] = useState('Lietošanas laikā radušies bojājumi');

  const currentDate = new Date().toLocaleDateString('lv-LV', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const amountInWords = numberToLatvianWords(order.final_cost || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #defektacijas-akts-print-area,
          #defektacijas-akts-print-area * {
            visibility: visible;
          }

          #defektacijas-akts-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          @page {
            size: A4;
            margin: 2cm;
          }
        }

        .print-only {
          display: none;
        }

        .digital-stamp {
          position: absolute;
          width: 180px;
          height: 180px;
          border: 3px solid rgba(37, 99, 235, 0.6);
          border-radius: 50%;
          transform: rotate(-15deg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: rgba(37, 99, 235, 0.6);
          font-weight: bold;
          text-align: center;
          line-height: 1.3;
          padding: 15px;
          bottom: 80px;
          right: 100px;
        }

        @media print {
          .digital-stamp {
            border-color: rgba(37, 99, 235, 0.5);
            color: rgba(37, 99, 235, 0.5);
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 no-print">
            <h2 className="text-xl font-bold text-neutral-900">Defektācijas akts</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Drukāt
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div id="defektacijas-akts-print-area" className="max-w-[21cm] mx-auto bg-white">
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.6', color: '#000' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
                    DEFEKTĀCIJAS AKTS Nr. {order.order_number}
                  </h1>
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    Rīga, {currentDate}
                  </p>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
                    1. INFORMĀCIJA PAR IERĪCI
                  </h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold', width: '30%' }}>
                          Modelis:
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd' }}>
                          {order.device_name || 'Nav norādīts'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                          IMEI/SN:
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd' }}>
                          {order.imei_serial || 'Nav norādīts'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
                    2. KONSTATĒTAIS DEFEKTS
                  </h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold', width: '30%' }}>
                          Defekts:
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd' }}>
                          {order.problem_description || 'Nav norādīts'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                          Defekta iemesls:
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd' }}>
                          <div className="no-print">
                            <textarea
                              value={defectReason}
                              onChange={(e) => setDefectReason(e.target.value)}
                              className="w-full p-2 border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                              placeholder="Ievadiet defekta iemeslu..."
                            />
                          </div>
                          <div className="print-only" style={{ minHeight: '60px' }}>
                            {defectReason}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
                    3. FINANŠU INFORMĀCIJA
                  </h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold', width: '30%' }}>
                          Remonta izmaksas:
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '16px' }}>
                          {(order.final_cost || 0).toFixed(2)} EUR
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                          Vārdiem:
                        </td>
                        <td style={{ padding: '8px 12px', border: '1px solid #ddd', fontStyle: 'italic' }}>
                          {amountInWords}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '60px', position: 'relative', minHeight: '200px' }}>
                  <div style={{ marginBottom: '50px' }}>
                    <p style={{ margin: '0 0 30px 0', fontSize: '14px' }}>
                      <strong>Servisa pārstāvis:</strong>
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}></div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>(Paraksts)</p>
                      </div>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>
                          {masterName}
                        </p>
                        <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>(Vārds, Uzvārds)</p>
                      </div>
                    </div>
                  </div>

                  <div className="digital-stamp">
                    <div>SIA iSupport serviss</div>
                    <div style={{ margin: '8px 0' }}>★</div>
                    <div>Reģ. Nr.</div>
                    <div>40203539592</div>
                  </div>

                  <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}>
                    <p style={{ margin: '0', fontSize: '12px', textAlign: 'center', lineHeight: '1.5' }}>
                      <strong>SIA iSupport serviss</strong><br />
                      Reģistrācijas Nr.: 40203539592<br />
                      Adrese: Rīga, Latvija<br />
                      Tālrunis: +371 XXXXXXXX | E-pasts: info@isupport.lv
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
