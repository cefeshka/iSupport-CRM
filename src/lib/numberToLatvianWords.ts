export function numberToLatvianWords(amount: number): string {
  const ones = [
    '', 'viens', 'divi', 'trīs', 'četri', 'pieci', 'seši', 'septiņi', 'astoņi', 'deviņi'
  ];

  const teens = [
    'desmit', 'vienpadsmit', 'divpadsmit', 'trīspadsmit', 'četrpadsmit',
    'piecpadsmit', 'sešpadsmit', 'septiņpadsmit', 'astoņpadsmit', 'deviņpadsmit'
  ];

  const tens = [
    '', '', 'divdesmit', 'trīsdesmit', 'četrdesmit', 'piecdesmit',
    'sešdesmit', 'septiņdesmit', 'astoņdesmit', 'deviņdesmit'
  ];

  const hundreds = [
    '', 'viens simts', 'divi simti', 'trīs simti', 'četri simti', 'pieci simti',
    'seši simti', 'septiņi simti', 'astoņi simti', 'deviņi simti'
  ];

  const thousands = [
    '', 'viens tūkstotis', 'divi tūkstoši', 'trīs tūkstoši', 'četri tūkstoši',
    'pieci tūkstoši', 'seši tūkstoši', 'septiņi tūkstoši', 'astoņi tūkstoši', 'deviņi tūkstoši'
  ];

  if (amount === 0) return 'nulle euro';

  const euros = Math.floor(amount);
  const cents = Math.round((amount - euros) * 100);

  let result = '';

  if (euros >= 1000) {
    const thousandsPart = Math.floor(euros / 1000);
    if (thousandsPart >= 1 && thousandsPart <= 9) {
      result += thousands[thousandsPart] + ' ';
    } else if (thousandsPart >= 10 && thousandsPart <= 19) {
      result += teens[thousandsPart - 10] + ' tūkstoši ';
    } else if (thousandsPart >= 20 && thousandsPart <= 99) {
      const tensDigit = Math.floor(thousandsPart / 10);
      const onesDigit = thousandsPart % 10;
      result += tens[tensDigit];
      if (onesDigit > 0) {
        result += ' ' + ones[onesDigit];
      }
      result += ' tūkstoši ';
    } else if (thousandsPart >= 100) {
      const hundredsDigit = Math.floor(thousandsPart / 100);
      const remainder = thousandsPart % 100;
      result += hundreds[hundredsDigit] + ' ';

      if (remainder >= 10 && remainder <= 19) {
        result += teens[remainder - 10] + ' tūkstoši ';
      } else if (remainder > 0) {
        const tensDigit = Math.floor(remainder / 10);
        const onesDigit = remainder % 10;
        if (tensDigit > 0) {
          result += tens[tensDigit] + ' ';
        }
        if (onesDigit > 0) {
          result += ones[onesDigit] + ' ';
        }
        result += 'tūkstoši ';
      } else {
        result += 'tūkstoši ';
      }
    }
  }

  const remainder = euros % 1000;

  if (remainder >= 100) {
    const hundredsDigit = Math.floor(remainder / 100);
    result += hundreds[hundredsDigit] + ' ';
  }

  const lastTwo = remainder % 100;

  if (lastTwo >= 10 && lastTwo <= 19) {
    result += teens[lastTwo - 10] + ' ';
  } else if (lastTwo > 0 || remainder === 0) {
    const tensDigit = Math.floor(lastTwo / 10);
    const onesDigit = lastTwo % 10;

    if (tensDigit > 0) {
      result += tens[tensDigit] + ' ';
    }

    if (onesDigit > 0) {
      result += ones[onesDigit] + ' ';
    }
  }

  result += 'euro';

  if (cents > 0) {
    result += ' un ';

    if (cents >= 10 && cents <= 19) {
      result += teens[cents - 10];
    } else {
      const centsTens = Math.floor(cents / 10);
      const centsOnes = cents % 10;

      if (centsTens > 0) {
        result += tens[centsTens];
      }

      if (centsOnes > 0) {
        if (centsTens > 0) result += ' ';
        result += ones[centsOnes];
      }
    }

    result += ' centi';
  }

  result = result.trim();

  return result.charAt(0).toUpperCase() + result.slice(1);
}
