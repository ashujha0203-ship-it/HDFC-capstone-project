import { createWorker } from 'tesseract.js';

export interface ExtractedData {
  name: string;
  address: string;
  documentNumber: string;
}

/**
 * Extract text from an image using OCR
 */
export const extractTextFromImage = async (imageDataUrl: string): Promise<string> => {
  const worker = await createWorker('eng');
  
  try {
    const { data: { text } } = await worker.recognize(imageDataUrl);
    return text;
  } finally {
    await worker.terminate();
  }
};

/**
 * Parse name from Aadhaar or PAN card text
 */
export const parseNameFromDocument = (ocrText: string): string => {
  // Remove extra whitespace and newlines
  const cleanText = ocrText.replace(/\s+/g, ' ').trim();
  
  // Try to find name patterns common in Aadhaar/PAN cards
  const namePatterns = [
    /(?:Name|NAME|name)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /([A-Z][A-Z\s]+)(?:\s*DOB|\s*Date)/i,
  ];

  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback: try to find any capitalized name-like text
  const words = cleanText.split(' ');
  const capitalizedWords = words.filter(word => 
    word.length > 2 && 
    /^[A-Z][a-z]+$/.test(word)
  );

  if (capitalizedWords.length >= 2) {
    return capitalizedWords.slice(0, 3).join(' ');
  }

  return '';
};

/**
 * Parse address from address proof document
 */
export const parseAddressFromDocument = (ocrText: string): string => {
  // Clean the text
  const cleanText = ocrText.replace(/\s+/g, ' ').trim();
  
  // Try to find address patterns
  const addressPatterns = [
    /(?:Address|ADDRESS|address)\s*:?\s*(.+?)(?:Pin|PIN|Pincode|PINCODE|$)/s,
  ];

  for (const pattern of addressPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback: look for text with common address keywords
  const addressKeywords = ['street', 'road', 'city', 'pin', 'house', 'flat', 'building'];
  const sentences = cleanText.split(/[.;]/);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (addressKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return sentence.trim();
    }
  }

  // Last fallback: return first few lines if they look like an address
  const lines = ocrText.split('\n').filter(line => line.trim().length > 5);
  if (lines.length > 0) {
    return lines.slice(0, 3).join(', ');
  }

  return '';
};

/**
 * Parse document number (Aadhaar or PAN)
 */
export const parseDocumentNumber = (ocrText: string): string => {
  // Remove all spaces for easier matching
  const cleanText = ocrText.replace(/\s/g, '');
  
  // Aadhaar pattern: 12 digits
  const aadhaarMatch = cleanText.match(/\d{12}/);
  if (aadhaarMatch) {
    return aadhaarMatch[0];
  }

  // PAN pattern: 5 letters, 4 digits, 1 letter
  const panMatch = cleanText.match(/[A-Z]{5}\d{4}[A-Z]/);
  if (panMatch) {
    return panMatch[0];
  }

  return '';
};

/**
 * Extract all relevant data from identity and address documents
 */
export const extractDocumentData = async (
  identityDocUrl: string,
  addressDocUrl: string,
  existingDocNumber: string
): Promise<ExtractedData> => {
  let name = '';
  let address = '';
  let documentNumber = existingDocNumber;

  try {
    // Extract from identity document
    const identityText = await extractTextFromImage(identityDocUrl);
    name = parseNameFromDocument(identityText);
    
    // Try to extract document number if not already available
    if (!documentNumber) {
      documentNumber = parseDocumentNumber(identityText);
    }
  } catch (error) {
    console.error('Error extracting from identity document:', error);
  }

  try {
    // Extract from address document
    const addressText = await extractTextFromImage(addressDocUrl);
    address = parseAddressFromDocument(addressText);
  } catch (error) {
    console.error('Error extracting from address document:', error);
  }

  return {
    name: name || 'Unable to extract name',
    address: address || '',
    documentNumber: documentNumber || 'Unable to extract document number',
  };
};
