import { AlertTriangle, CheckCircle } from 'lucide-react';

interface UrgentAnnouncementModalProps {
  announcement: {
    id: string;
    title: string;
    content: string;
    priority: string;
    creator_name: string;
    created_at: string;
  };
  onAcknowledge: () => void;
}

export default function UrgentAnnouncementModal({ announcement, onAcknowledge }: UrgentAnnouncementModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className={`${
          announcement.priority === 'urgent'
            ? 'bg-gradient-to-r from-red-600 to-red-700'
            : 'bg-gradient-to-r from-amber-600 to-amber-700'
        } px-8 py-6`}>
          <div className="flex items-center gap-4 text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">
                  {announcement.priority === 'urgent' ? 'STEIDZAMS PAZIŅOJUMS' : 'SVARĪGS PAZIŅOJUMS'}
                </h2>
              </div>
              <p className="text-red-100 text-sm">Lūdzu, izlasiet un apstipriniet</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className={`rounded-xl p-6 mb-6 border-2 ${
            announcement.priority === 'urgent'
              ? 'bg-red-50 border-red-300'
              : 'bg-amber-50 border-amber-300'
          }`}>
            <h3 className="text-xl font-bold text-neutral-900 mb-3">
              {announcement.title}
            </h3>

            <div className="prose prose-sm max-w-none">
              <p className="text-neutral-800 whitespace-pre-wrap leading-relaxed">
                {announcement.content}
              </p>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 mb-6 border border-neutral-200">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>
                <strong>No:</strong> {announcement.creator_name}
              </span>
              <span>
                <strong>Datums:</strong> {new Date(announcement.created_at).toLocaleString('lv-LV')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={onAcknowledge}
              className={`px-8 py-4 rounded-xl text-white font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg ${
                announcement.priority === 'urgent'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
              }`}
            >
              <CheckCircle className="w-6 h-6" />
              OK - Izlasīju un sapratu
            </button>
          </div>

          <p className="text-center text-xs text-neutral-500 mt-4">
            Pēc apstiprināšanas šis paziņojums tiks atzīmēts kā izlasīts
          </p>
        </div>
      </div>
    </div>
  );
}
