import { useState, useEffect } from 'react';
import { Search, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateIMEI, lookupByTAC, formatSerialNumber } from '../../lib/tacDatabase';
import { supabase } from '../../lib/supabase';

interface DeviceInfo {
  brand: string;
  model: string;
  color: string;
  source: 'history' | 'tac' | 'manual';
}

interface SmartDeviceInputProps {
  type: 'imei' | 'serial';
  value: string;
  onChange: (value: string) => void;
  onDeviceDetected?: (info: DeviceInfo | null) => void;
  placeholder?: string;
  locationId?: number;
}

export function SmartDeviceInput({
  type,
  value,
  onChange,
  onDeviceDetected,
  placeholder,
  locationId
}: SmartDeviceInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [detectedDevice, setDetectedDevice] = useState<DeviceInfo | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (type === 'imei' && value.length >= 8) {
      handleIMEILookup(value);
    } else if (type === 'serial' && value.length >= 6) {
      handleSerialLookup(value);
    }

    if (type === 'imei' && value.length === 15) {
      validateIMEIValue(value);
    } else if (type === 'imei' && value.length > 0 && value.length !== 15) {
      setValidationError(null);
    }
  }, [value, type]);

  const validateIMEIValue = (imei: string) => {
    if (imei.length === 15) {
      const isValid = validateIMEI(imei);
      if (!isValid) {
        setValidationError('Nepareizs IMEI formāts');
        setShowTooltip(true);
      } else {
        setValidationError(null);
        setShowTooltip(false);
      }
    }
  };

  const handleIMEILookup = async (imei: string) => {
    if (imei.length < 8) return;

    setIsValidating(true);

    try {
      const { data: historyData, error: historyError } = await supabase
        .from('orders')
        .select('device_brand, device_model, device_color')
        .eq('imei', imei)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!historyError && historyData) {
        const deviceInfo: DeviceInfo = {
          brand: historyData.device_brand || '',
          model: historyData.device_model || '',
          color: historyData.device_color || '',
          source: 'history'
        };
        setDetectedDevice(deviceInfo);
        if (onDeviceDetected) {
          onDeviceDetected(deviceInfo);
        }
        setIsValidating(false);
        return;
      }

      if (imei.length >= 8) {
        const tacInfo = lookupByTAC(imei);
        if (tacInfo) {
          const deviceInfo: DeviceInfo = {
            brand: tacInfo.brand,
            model: tacInfo.model,
            color: '',
            source: 'tac'
          };
          setDetectedDevice(deviceInfo);
          if (onDeviceDetected) {
            onDeviceDetected(deviceInfo);
          }
        } else {
          setDetectedDevice(null);
          if (onDeviceDetected) {
            onDeviceDetected(null);
          }
        }
      }
    } catch (error) {
      console.error('Device lookup error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSerialLookup = async (serial: string) => {
    if (serial.length < 6) return;

    setIsValidating(true);

    try {
      const { data: historyData, error: historyError } = await supabase
        .from('orders')
        .select('device_brand, device_model, device_color')
        .eq('serial_number', serial.toUpperCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!historyError && historyData) {
        const deviceInfo: DeviceInfo = {
          brand: historyData.device_brand || '',
          model: historyData.device_model || '',
          color: historyData.device_color || '',
          source: 'history'
        };
        setDetectedDevice(deviceInfo);
        if (onDeviceDetected) {
          onDeviceDetected(deviceInfo);
        }
      } else {
        setDetectedDevice(null);
        if (onDeviceDetected) {
          onDeviceDetected(null);
        }
      }
    } catch (error) {
      console.error('Serial lookup error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    if (type === 'imei') {
      newValue = newValue.replace(/\D/g, '').substring(0, 15);
    } else if (type === 'serial') {
      newValue = formatSerialNumber(newValue);
    }

    onChange(newValue);
  };

  const handleClear = () => {
    onChange('');
    setDetectedDevice(null);
    setValidationError(null);
    setShowTooltip(false);
    if (onDeviceDetected) {
      onDeviceDetected(null);
    }
  };

  const hasError = validationError !== null;
  const hasSuccess = type === 'imei' && value.length === 15 && !hasError;

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-20 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
            hasError
              ? 'border-red-500 focus:ring-red-200'
              : hasSuccess
              ? 'border-green-500 focus:ring-green-200'
              : 'border-gray-300 focus:ring-blue-200'
          }`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isValidating && (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}

          {hasError && (
            <div
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              {showTooltip && (
                <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap z-10">
                  {validationError}
                </div>
              )}
            </div>
          )}

          {hasSuccess && (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Notīrīt"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {detectedDevice && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          {detectedDevice.source === 'history' ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Atrasts vēsturē
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <Search className="w-3 h-3" />
              Atpazīts pēc TAC
            </span>
          )}
          <span className="text-gray-600">
            {detectedDevice.brand} {detectedDevice.model}
            {detectedDevice.color && ` - ${detectedDevice.color}`}
          </span>
        </div>
      )}
    </div>
  );
}
