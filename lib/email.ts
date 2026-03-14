import { Resend } from "resend";

// Lazy — only instantiated when an email is actually sent
function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY!);
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@agendalo.app";

interface ConfirmacionCitaParams {
  toEmail: string;
  toName: string;
  businessName: string;
  serviceName: string;
  professionalName: string;
  date: string;      // "Lunes 20 de marzo de 2026"
  startTime: string; // "10:00"
  endTime: string;   // "10:30"
  businessPhone?: string | null;
  businessAddress?: string | null;
}

export async function enviarConfirmacionCliente(params: ConfirmacionCitaParams) {
  if (!process.env.RESEND_API_KEY) return; // skip si no hay API key configurada

  const { toEmail, toName, businessName, serviceName, professionalName, date, startTime, endTime, businessPhone, businessAddress } = params;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Tu cita en ${businessName} está confirmada`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; color: #111827;">
        <h2 style="color: #111827;">¡Tu cita está confirmada!</h2>
        <p>Hola ${toName},</p>
        <p>Tu cita en <strong>${businessName}</strong> ha sido registrada exitosamente.</p>

        <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Servicio</td>
              <td style="padding: 6px 0; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Profesional</td>
              <td style="padding: 6px 0;">${professionalName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Fecha</td>
              <td style="padding: 6px 0;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Hora</td>
              <td style="padding: 6px 0;">${startTime} – ${endTime}</td>
            </tr>
            ${businessAddress ? `
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Dirección</td>
              <td style="padding: 6px 0;">${businessAddress}</td>
            </tr>` : ""}
            ${businessPhone ? `
            <tr>
              <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Teléfono</td>
              <td style="padding: 6px 0;">${businessPhone}</td>
            </tr>` : ""}
          </table>
        </div>

        <p style="color: #6B7280; font-size: 14px;">Si necesitas cancelar o cambiar tu cita, contáctanos directamente.</p>
      </div>
    `,
  });
}

export async function enviarNotificacionNegocio(params: {
  toEmail: string;
  businessName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  professionalName: string;
  date: string;
  startTime: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const { toEmail, businessName, clientName, clientEmail, clientPhone, serviceName, professionalName, date, startTime } = params;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Nueva cita: ${clientName} — ${serviceName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; color: #111827;">
        <h2>Nueva cita recibida</h2>
        <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; color: #6B7280; font-size: 14px;">Cliente</td><td style="padding: 5px 0; font-weight: 600;">${clientName}</td></tr>
            ${clientEmail ? `<tr><td style="padding: 5px 0; color: #6B7280; font-size: 14px;">Email</td><td style="padding: 5px 0;">${clientEmail}</td></tr>` : ""}
            ${clientPhone ? `<tr><td style="padding: 5px 0; color: #6B7280; font-size: 14px;">Teléfono</td><td style="padding: 5px 0;">${clientPhone}</td></tr>` : ""}
            <tr><td style="padding: 5px 0; color: #6B7280; font-size: 14px;">Servicio</td><td style="padding: 5px 0;">${serviceName}</td></tr>
            <tr><td style="padding: 5px 0; color: #6B7280; font-size: 14px;">Profesional</td><td style="padding: 5px 0;">${professionalName}</td></tr>
            <tr><td style="padding: 5px 0; color: #6B7280; font-size: 14px;">Fecha</td><td style="padding: 5px 0;">${date} a las ${startTime}</td></tr>
          </table>
        </div>
        <p style="color: #6B7280; font-size: 14px;">Puedes gestionar esta cita desde tu panel de agéndalo.</p>
      </div>
    `,
  });
}
