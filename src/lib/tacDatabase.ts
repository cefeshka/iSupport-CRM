export interface TACRecord {
  tac: string;
  brand: string;
  model: string;
  deviceType?: string;
}

export const TAC_DATABASE: TACRecord[] = [
  // Apple iPhone
  { tac: '35328609', brand: 'Apple', model: 'iPhone 15 Pro Max' },
  { tac: '35328509', brand: 'Apple', model: 'iPhone 15 Pro' },
  { tac: '35328409', brand: 'Apple', model: 'iPhone 15 Plus' },
  { tac: '35328309', brand: 'Apple', model: 'iPhone 15' },
  { tac: '35171715', brand: 'Apple', model: 'iPhone 14 Pro Max' },
  { tac: '35171615', brand: 'Apple', model: 'iPhone 14 Pro' },
  { tac: '35171515', brand: 'Apple', model: 'iPhone 14 Plus' },
  { tac: '35171415', brand: 'Apple', model: 'iPhone 14' },
  { tac: '35921811', brand: 'Apple', model: 'iPhone 13 Pro Max' },
  { tac: '35921711', brand: 'Apple', model: 'iPhone 13 Pro' },
  { tac: '35921611', brand: 'Apple', model: 'iPhone 13' },
  { tac: '35921511', brand: 'Apple', model: 'iPhone 13 Mini' },
  { tac: '35380911', brand: 'Apple', model: 'iPhone 12 Pro Max' },
  { tac: '35380811', brand: 'Apple', model: 'iPhone 12 Pro' },
  { tac: '35380711', brand: 'Apple', model: 'iPhone 12' },
  { tac: '35380611', brand: 'Apple', model: 'iPhone 12 Mini' },
  { tac: '35314510', brand: 'Apple', model: 'iPhone 11 Pro Max' },
  { tac: '35314410', brand: 'Apple', model: 'iPhone 11 Pro' },
  { tac: '35314310', brand: 'Apple', model: 'iPhone 11' },
  { tac: '35746209', brand: 'Apple', model: 'iPhone XS Max' },
  { tac: '35746109', brand: 'Apple', model: 'iPhone XS' },
  { tac: '35746009', brand: 'Apple', model: 'iPhone XR' },
  { tac: '35350309', brand: 'Apple', model: 'iPhone X' },
  { tac: '35398708', brand: 'Apple', model: 'iPhone 8 Plus' },
  { tac: '35398608', brand: 'Apple', model: 'iPhone 8' },

  // Samsung Galaxy S Series
  { tac: '35592881', brand: 'Samsung', model: 'Galaxy S23 Ultra' },
  { tac: '35592781', brand: 'Samsung', model: 'Galaxy S23 Plus' },
  { tac: '35592681', brand: 'Samsung', model: 'Galaxy S23' },
  { tac: '35729211', brand: 'Samsung', model: 'Galaxy S22 Ultra' },
  { tac: '35729111', brand: 'Samsung', model: 'Galaxy S22 Plus' },
  { tac: '35729011', brand: 'Samsung', model: 'Galaxy S22' },
  { tac: '35872509', brand: 'Samsung', model: 'Galaxy S21 Ultra' },
  { tac: '35872409', brand: 'Samsung', model: 'Galaxy S21 Plus' },
  { tac: '35872309', brand: 'Samsung', model: 'Galaxy S21' },
  { tac: '35600910', brand: 'Samsung', model: 'Galaxy S20 Ultra' },
  { tac: '35600810', brand: 'Samsung', model: 'Galaxy S20 Plus' },
  { tac: '35600710', brand: 'Samsung', model: 'Galaxy S20' },
  { tac: '35714610', brand: 'Samsung', model: 'Galaxy S10 Plus' },
  { tac: '35714510', brand: 'Samsung', model: 'Galaxy S10' },
  { tac: '35714410', brand: 'Samsung', model: 'Galaxy S10e' },

  // Samsung Galaxy Note Series
  { tac: '35384409', brand: 'Samsung', model: 'Galaxy Note 20 Ultra' },
  { tac: '35384309', brand: 'Samsung', model: 'Galaxy Note 20' },
  { tac: '35616610', brand: 'Samsung', model: 'Galaxy Note 10 Plus' },
  { tac: '35616510', brand: 'Samsung', model: 'Galaxy Note 10' },

  // Samsung Galaxy A Series
  { tac: '35965811', brand: 'Samsung', model: 'Galaxy A54' },
  { tac: '35965711', brand: 'Samsung', model: 'Galaxy A34' },
  { tac: '35965611', brand: 'Samsung', model: 'Galaxy A14' },
  { tac: '35885810', brand: 'Samsung', model: 'Galaxy A53' },
  { tac: '35885710', brand: 'Samsung', model: 'Galaxy A33' },
  { tac: '35885610', brand: 'Samsung', model: 'Galaxy A13' },
  { tac: '35778310', brand: 'Samsung', model: 'Galaxy A52' },
  { tac: '35778210', brand: 'Samsung', model: 'Galaxy A32' },
  { tac: '35778110', brand: 'Samsung', model: 'Galaxy A12' },

  // Samsung Galaxy Z Series (Foldable)
  { tac: '35824911', brand: 'Samsung', model: 'Galaxy Z Fold 5' },
  { tac: '35824811', brand: 'Samsung', model: 'Galaxy Z Flip 5' },
  { tac: '35930010', brand: 'Samsung', model: 'Galaxy Z Fold 4' },
  { tac: '35929910', brand: 'Samsung', model: 'Galaxy Z Flip 4' },
  { tac: '35686309', brand: 'Samsung', model: 'Galaxy Z Fold 3' },
  { tac: '35686209', brand: 'Samsung', model: 'Galaxy Z Flip 3' },

  // Xiaomi
  { tac: '86819905', brand: 'Xiaomi', model: 'Xiaomi 13 Pro' },
  { tac: '86819805', brand: 'Xiaomi', model: 'Xiaomi 13' },
  { tac: '86819705', brand: 'Xiaomi', model: 'Xiaomi 12 Pro' },
  { tac: '86819605', brand: 'Xiaomi', model: 'Xiaomi 12' },
  { tac: '86935604', brand: 'Xiaomi', model: 'Redmi Note 12 Pro' },
  { tac: '86935504', brand: 'Xiaomi', model: 'Redmi Note 12' },
  { tac: '86935404', brand: 'Xiaomi', model: 'Redmi Note 11 Pro' },
  { tac: '86935304', brand: 'Xiaomi', model: 'Redmi Note 11' },
  { tac: '86831804', brand: 'Xiaomi', model: 'POCO F5 Pro' },
  { tac: '86831704', brand: 'Xiaomi', model: 'POCO F5' },
  { tac: '86831604', brand: 'Xiaomi', model: 'POCO X5 Pro' },

  // Huawei
  { tac: '86851005', brand: 'Huawei', model: 'P60 Pro' },
  { tac: '86850905', brand: 'Huawei', model: 'P60' },
  { tac: '86850805', brand: 'Huawei', model: 'Mate 50 Pro' },
  { tac: '86850705', brand: 'Huawei', model: 'Mate 50' },
  { tac: '86027704', brand: 'Huawei', model: 'P50 Pro' },
  { tac: '86027604', brand: 'Huawei', model: 'P50' },
  { tac: '86027504', brand: 'Huawei', model: 'P40 Pro' },
  { tac: '86027404', brand: 'Huawei', model: 'P40' },

  // Google Pixel
  { tac: '35344113', brand: 'Google', model: 'Pixel 8 Pro' },
  { tac: '35344013', brand: 'Google', model: 'Pixel 8' },
  { tac: '35349812', brand: 'Google', model: 'Pixel 7 Pro' },
  { tac: '35349712', brand: 'Google', model: 'Pixel 7' },
  { tac: '35349612', brand: 'Google', model: 'Pixel 7a' },
  { tac: '35374011', brand: 'Google', model: 'Pixel 6 Pro' },
  { tac: '35373911', brand: 'Google', model: 'Pixel 6' },
  { tac: '35373811', brand: 'Google', model: 'Pixel 6a' },

  // OnePlus
  { tac: '86614005', brand: 'OnePlus', model: 'OnePlus 11' },
  { tac: '86613905', brand: 'OnePlus', model: 'OnePlus 10 Pro' },
  { tac: '86613805', brand: 'OnePlus', model: 'OnePlus 10T' },
  { tac: '86613705', brand: 'OnePlus', model: 'OnePlus 9 Pro' },
  { tac: '86613605', brand: 'OnePlus', model: 'OnePlus 9' },
  { tac: '86613505', brand: 'OnePlus', model: 'OnePlus Nord 3' },
  { tac: '86613405', brand: 'OnePlus', model: 'OnePlus Nord 2' },

  // Oppo
  { tac: '86720205', brand: 'Oppo', model: 'Find X6 Pro' },
  { tac: '86720105', brand: 'Oppo', model: 'Find X6' },
  { tac: '86720005', brand: 'Oppo', model: 'Reno 10 Pro' },
  { tac: '86719905', brand: 'Oppo', model: 'Reno 10' },
  { tac: '86719805', brand: 'Oppo', model: 'Reno 9 Pro' },
  { tac: '86719705', brand: 'Oppo', model: 'A98' },

  // Vivo
  { tac: '86750805', brand: 'Vivo', model: 'X90 Pro' },
  { tac: '86750705', brand: 'Vivo', model: 'X90' },
  { tac: '86750605', brand: 'Vivo', model: 'V29 Pro' },
  { tac: '86750505', brand: 'Vivo', model: 'V29' },
  { tac: '86750405', brand: 'Vivo', model: 'Y78' },

  // Motorola
  { tac: '35838305', brand: 'Motorola', model: 'Edge 40 Pro' },
  { tac: '35838205', brand: 'Motorola', model: 'Edge 40' },
  { tac: '35838105', brand: 'Motorola', model: 'Moto G73' },
  { tac: '35838005', brand: 'Motorola', model: 'Moto G53' },

  // Sony
  { tac: '35918605', brand: 'Sony', model: 'Xperia 1 V' },
  { tac: '35918505', brand: 'Sony', model: 'Xperia 5 V' },
  { tac: '35918405', brand: 'Sony', model: 'Xperia 10 V' },
];

export function lookupByTAC(imei: string): TACRecord | null {
  if (!imei || imei.length < 8) {
    return null;
  }

  const tac = imei.substring(0, 8);
  return TAC_DATABASE.find(record => record.tac === tac) || null;
}

export function validateIMEI(imei: string): boolean {
  if (!imei || imei.length !== 15) {
    return false;
  }

  if (!/^\d+$/.test(imei)) {
    return false;
  }

  // Luhn Algorithm
  let sum = 0;
  let shouldDouble = false;

  for (let i = imei.length - 1; i >= 0; i--) {
    let digit = parseInt(imei.charAt(i));

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function formatSerialNumber(sn: string): string {
  return sn.toUpperCase().trim();
}
