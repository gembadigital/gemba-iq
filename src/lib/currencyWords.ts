export function convertNumberToTurkishWords(num: number): string {
  if (isNaN(num) || num === null) return "";
  if (num === 0) return "Sıfır";
  
  const birler = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
  const onlar = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const binler = ["", "Bin", "Milyon", "Milyar", "Trilyon"];
  
  let count = 0;
  let wordResult = "";
  
  let tempNum = Math.floor(Math.abs(num));
  
  while (tempNum > 0) {
    let subNum = tempNum % 1000;
    if (subNum > 0) {
      let subWord = "";
      
      let y = Math.floor(subNum / 100);
      let o = Math.floor((subNum % 100) / 10);
      let b = subNum % 10;
      
      if (y > 0) {
        if (y === 1) {
          subWord += "Yüz ";
        } else {
          subWord += birler[y] + " Yüz ";
        }
      }
      
      if (o > 0) {
        subWord += onlar[o] + " ";
      }
      
      if (b > 0) {
        if (count === 1 && subNum === 1) {
          // Skip "Bir Bin", just write "Bin"
        } else {
          subWord += birler[b] + " ";
        }
      }
      
      wordResult = subWord + binler[count] + " " + wordResult;
    }
    
    tempNum = Math.floor(tempNum / 1000);
    count++;
  }
  
  return wordResult.trim();
}

export function convertCurrencyToTurkishWords(value: number, currency: string = "TRY"): string {
  if (isNaN(value) || value === null || value <= 0) return "";
  const lira = Math.floor(value);
  const kurus = Math.round((value - lira) * 100);
  
  let currencyUnit = "TürkLirası";
  let subUnit = "Kuruş";
  
  if (currency === "USD") {
    currencyUnit = "Amerikan Doları";
    subUnit = "Sent";
  } else if (currency === "EUR") {
    currencyUnit = "Euro";
    subUnit = "Sent";
  } else if (currency === "GBP") {
    currencyUnit = "İngiliz Sterlini";
    subUnit = "Pence";
  }

  let text = "Yalnız " + convertNumberToTurkishWords(lira) + " " + currencyUnit;
  if (kurus > 0) {
    text += " " + convertNumberToTurkishWords(kurus) + " " + subUnit;
  }
  
  return text + " Adır.";
}

