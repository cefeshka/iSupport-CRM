import { useState, useEffect } from 'react';
import { Search, CheckCircle, AlertCircle, Camera, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { lookupByTAC, validateIMEI, formatSerialNumber } from '../../lib/tacDatabase';
import { toast } from '../../lib/toast';

interface DeviceInfo {
  brand: string;
  model: string;
  color: string;
  imei?: string;
  serialNumber?: string;
}

interface SmartDeviceRecognitionProps {
  onDeviceRecognized: (device: DeviceInfo) => void;
  initialIMEI?: string;
  initialSerialNumber?: string;
}

interface RecognitionSource {
  type: 'history' | 'tac' | 'manual';
  confidence: 'high' | 'medium' | 'low';
}

const COMMON_COLORS = [
  'Black',
  'White',
  'Silver',
  'Gold',
  'Blue',
  'Green',
  'Red',
  'Purple',
  'Pink',
  'Gray',
  'Graphite',
  'Midnight',
  'Starlight',
  'Space Gray',
  'Rose Gold',
  'Coral',
];

export default function SmartDeviceRecognition({
  onDeviceRecognized,
  initialIMEI = '',
  initialSerialNumber = '',
}: SmartDeviceRecognitionProps) {
  const [imei, setIMEI] = useState(initialIMEI);
  const [serialNumber, setSerialNumber] = useState(initialSerialNumber);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [isValidIMEI, setIsValidIMEI] = useState<boolean | null>(null);
  const [recognitionSource, setRecognitionSource] = useState<RecognitionSource | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (imei.length >= 8) {
      performDeviceRecognition(imei);
    }
  }, [imei]);

  useEffect(() => {
    if (imei.length === 15) {
      const isValid = validateIMEI(imei);
      setIsValidIMEI(isValid);
      if (!isValid) {
        toast.error('Invalid IMEI (Luhn check failed)');
      }
    } else {
      setIsValidIMEI(null);
    }
  }, [imei]);

  useEffect(() => {
    const device: DeviceInfo = {
      brand,
      model,
      color,
      imei: imei || undefined,
      serialNumber: serialNumber || undefined,
    };
    onDeviceRecognized(device);
  }, [brand, model, color, imei, serialNumber]);

  async function performDeviceRecognition(imeiValue: string) {
    setIsLookingUp(true);

    try {
      // Step 1: Check internal history first
      const historyResult = await lookupInternalHistory(imeiValue);
      if (historyResult) {
        setBrand(historyResult.brand);
        setModel(historyResult.model);
        setColor(historyResult.color || '');
        setRecognitionSource({ type: 'history', confidence: 'high' });
        toast.success('Device recognized from order history');
        setIsLookingUp(false);
        return;
      }

      // Step 2: Try TAC database lookup
      if (imeiValue.length >= 8) {
        const tacResult = lookupByTAC(imeiValue);
        if (tacResult) {
          setBrand(tacResult.brand);
          setModel(tacResult.model);
          setRecognitionSource({ type: 'tac', confidence: 'medium' });
          toast.success(`Device identified: ${tacResult.brand} ${tacResult.model}`);
        }
      }
    } catch (error) {
      console.error('Device recognition error:', error);
    } finally {
      setIsLookingUp(false);
    }
  }

  async function lookupInternalHistory(imeiValue: string): Promise<DeviceInfo | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('device_brand, device_model, device_color')
        .eq('imei', imeiValue)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.device_brand && data.device_model) {
        return {
          brand: data.device_brand,
          model: data.device_model,
          color: data.device_color || '',
        };
      }

      return null;
    } catch (error) {
      console.error('History lookup error:', error);
      return null;
    }
  }

  async function lookupBySerialNumber() {
    if (!serialNumber) {
      toast.error('Please enter a serial number');
      return;
    }

    setIsLookingUp(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('device_brand, device_model, device_color, imei')
        .eq('serial_number', formatSerialNumber(serialNumber))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data && data.device_brand && data.device_model) {
        setBrand(data.device_brand);
        setModel(data.device_model);
        setColor(data.device_color || '');
        if (data.imei) {
          setIMEI(data.imei);
        }
        setRecognitionSource({ type: 'history', confidence: 'high' });
        toast.success('Device recognized from order history');
      } else {
        toast.info('No previous orders found for this serial number');
      }
    } catch (error) {
      console.error('Serial number lookup error:', error);
      toast.error('Failed to lookup serial number');
    } finally {
      setIsLookingUp(false);
    }
  }

  function handleColorSelect(selectedColor: string) {
    setColor(selectedColor);
    setShowColorPicker(false);
  }

  function handleSerialNumberChange(value: string) {
    setSerialNumber(formatSerialNumber(value));
  }

  return (
    <div className="space-y-4">
      {/* IMEI Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          IMEI
          {isValidIMEI === true && (
            <CheckCircle className="inline-block w-4 h-4 text-green-600 ml-2" />
          )}
          {isValidIMEI === false && (
            <AlertCircle className="inline-block w-4 h-4 text-red-600 ml-2" />
          )}
        </label>
        <div className="relative">
          <input
            type="text"
            value={imei}
            onChange={(e) => setIMEI(e.target.value.replace(/\D/g, '').slice(0, 15))}
            placeholder="Enter 15-digit IMEI"
            maxLength={15}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isValidIMEI === false
                ? 'border-red-300 bg-red-50'
                : isValidIMEI === true
                ? 'border-green-300 bg-green-50'
                : 'border-neutral-300'
            }`}
          />
          {isLookingUp && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          {imei.length}/15 digits • Auto-validates with Luhn algorithm
        </p>
      </div>

      {/* Serial Number Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Serial Number
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => handleSerialNumberChange(e.target.value)}
            placeholder="Enter serial number"
            className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
          />
          <button
            type="button"
            onClick={lookupBySerialNumber}
            disabled={!serialNumber || isLookingUp}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            Lookup
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-1">Automatically formatted to UPPERCASE</p>
      </div>

      {/* Recognition Badge */}
      {recognitionSource && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            recognitionSource.type === 'history'
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <Sparkles
            className={`w-4 h-4 ${
              recognitionSource.type === 'history' ? 'text-green-600' : 'text-blue-600'
            }`}
          />
          <span
            className={`text-sm font-medium ${
              recognitionSource.type === 'history' ? 'text-green-700' : 'text-blue-700'
            }`}
          >
            {recognitionSource.type === 'history'
              ? 'Auto-filled from order history'
              : 'Identified from TAC database'}
          </span>
        </div>
      )}

      {/* Brand Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Brand <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="e.g., Apple, Samsung, Xiaomi"
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Model Input */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Model <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g., iPhone 15 Pro, Galaxy S23 Ultra"
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Color Input with Quick Picker */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          Color <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Select or type color"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />

          {/* Quick Color Picker Toggle */}
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {showColorPicker ? 'Hide' : 'Show'} Quick Color Picker
          </button>

          {/* Quick Color Picker */}
          {showColorPicker && (
            <div className="grid grid-cols-4 gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
              {COMMON_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => handleColorSelect(colorOption)}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                    color === colorOption
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  {colorOption}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Optional: Camera Scan Button (placeholder for future implementation) */}
      <div className="pt-2 border-t border-neutral-200">
        <button
          type="button"
          onClick={() => toast.info('Camera scanning feature coming soon')}
          className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Camera className="w-4 h-4" />
          Scan with Camera (Coming Soon)
        </button>
      </div>
    </div>
  );
}
