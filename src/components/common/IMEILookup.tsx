import { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface IMEILookupProps {
  onDeviceFound: (deviceType: string, deviceModel: string) => void;
  className?: string;
}

interface DeviceInfo {
  brand: string;
  model: string;
  type: string;
}

export default function IMEILookup({ onDeviceFound, className = '' }: IMEILookupProps) {
  const [imei, setImei] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleLookup() {
    if (imei.length < 15) {
      setStatus('error');
      setMessage('IMEI должен содержать минимум 15 цифр');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const deviceInfo = await lookupIMEI(imei);

      if (deviceInfo) {
        onDeviceFound(deviceInfo.type, `${deviceInfo.brand} ${deviceInfo.model}`);
        setStatus('success');
        setMessage(`Найдено: ${deviceInfo.brand} ${deviceInfo.model}`);
      } else {
        setStatus('error');
        setMessage('Устройство не найдено в базе');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Ошибка при поиске устройства');
    } finally {
      setLoading(false);
    }
  }

  async function lookupIMEI(imeiNumber: string): Promise<DeviceInfo | null> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const sampleDevices: Record<string, DeviceInfo> = {
      '35': { brand: 'Apple', model: 'iPhone 13 Pro', type: 'iPhone' },
      '86': { brand: 'Samsung', model: 'Galaxy S21', type: 'Samsung' },
      '99': { brand: 'Apple', model: 'iPhone 14 Pro Max', type: 'iPhone' }
    };

    const prefix = imeiNumber.substring(0, 2);
    return sampleDevices[prefix] || { brand: 'Apple', model: 'iPhone 12', type: 'iPhone' };
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '');
    setImei(value);
    setStatus('idle');
    setMessage('');
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        IMEI / Серийный номер
        <span className="text-neutral-500 text-xs ml-2">(автоопределение устройства)</span>
      </label>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={imei}
            onChange={handleInputChange}
            placeholder="Введите 15 цифр IMEI"
            maxLength={15}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {status === 'success' && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
          {status === 'error' && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
          )}
        </div>

        <button
          type="button"
          onClick={handleLookup}
          disabled={loading || imei.length < 15}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Поиск...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Найти
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${
          status === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-2 text-xs text-neutral-500">
        Для тестирования: начните IMEI с 35 (iPhone 13), 86 (Samsung S21), 99 (iPhone 14)
      </div>
    </div>
  );
}
