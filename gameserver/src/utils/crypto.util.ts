// utils/crypto.util.ts
import crypto from 'crypto';

export const generateSignature = (secretKey: string, payload: string): string => {
  return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
};
