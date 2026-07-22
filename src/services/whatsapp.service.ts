import { ValidationError } from '../utils/errors';

interface SendWhatsappInput {
  target: string;
  message: string;
}

interface SendWhatsappResult {
  success: boolean;
  target: string;
  fonnteId?: string;
  response?: unknown;
  error?: string;
}

function normalizeWhatsappTarget(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export class WhatsappService {
  async send(input: SendWhatsappInput): Promise<SendWhatsappResult> {
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      throw new ValidationError('Layanan WhatsApp belum dikonfigurasi');
    }

    const target = normalizeWhatsappTarget(input.target);
    if (!target) {
      throw new ValidationError('Nomor WhatsApp tidak valid');
    }

    const body = new URLSearchParams({
      target,
      message: input.message,
      countryCode: '62',
    });

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => null);
    }

    // Fonnte mengembalikan array "id" (message id) per target saat sukses.
    let fonnteId: string | undefined;
    const parsed = responseBody as { id?: unknown } | null;
    if (parsed && Array.isArray(parsed.id) && parsed.id.length > 0) {
      fonnteId = String(parsed.id[0]);
    }

    if (!response.ok) {
      return {
        success: false,
        target,
        response: responseBody,
        error: 'Gagal mengirim WhatsApp',
      };
    }

    return {
      success: true,
      target,
      fonnteId,
      response: responseBody,
    };
  }
}

export const whatsappService = new WhatsappService();
