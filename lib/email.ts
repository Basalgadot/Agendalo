import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

// Mientras el dominio agendalo.app no esté verificado en Resend usamos el sender por defecto
const FROM = "Agéndalo <onboarding@resend.dev>";

// ─── Template base con branding del negocio ───────────────────────────────────

interface BusinessBranding {
  name: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  instagram?: string | null;
  website?: string | null;
}

function emailBase(content: string, business: BusinessBranding): string {
  const color = business.primaryColor ?? "#F97316";

  const header = business.logoUrl
    ? `<img src="${business.logoUrl}" alt="${business.name}" style="height:48px; max-width:160px; object-fit:contain;" />`
    : `<span style="font-size:20px; font-weight:700; color:#ffffff;">${business.name}</span>`;

  const footerItems = [
    business.phone    && `📞 ${business.phone}`,
    business.address  && `📍 ${business.address}`,
    business.instagram && `Instagram: @${business.instagram.replace(/^@/, "")}`,
    business.website  && `🌐 ${business.website}`,
  ].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr>
          <td style="background:${color};border-radius:12px 12px 0 0;padding:24px 32px;">
            ${header}
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="background:#ffffff;padding:32px;color:#111827;font-size:15px;line-height:1.6;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;color:#6b7280;font-size:12px;">
            <p style="margin:0 0 4px 0;font-weight:600;color:#374151;">${business.name}</p>
            ${footerItems ? `<p style="margin:0;">${footerItems}</p>` : ""}
            <p style="margin:8px 0 0 0;color:#9ca3af;">Este correo fue enviado a través de Agéndalo.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;color:#6b7280;font-size:14px;width:110px;">${label}</td>
    <td style="padding:7px 0;font-weight:600;color:#111827;">${value}</td>
  </tr>`;
}

// ─── Confirmación de cita al cliente ─────────────────────────────────────────

interface ConfirmacionParams {
  toEmail: string;
  toName: string;
  business: BusinessBranding;
  serviceName: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export async function enviarConfirmacionCliente(params: ConfirmacionParams) {
  if (!process.env.RESEND_API_KEY) return;

  const { toEmail, toName, business, serviceName, professionalName, date, startTime, endTime } = params;

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">¡Tu cita está confirmada! ✅</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hola <strong>${toName}</strong>, tu reserva en <strong>${business.name}</strong> quedó registrada.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${infoRow("Servicio", serviceName)}
        ${infoRow("Profesional", professionalName)}
        ${infoRow("Fecha", date)}
        ${infoRow("Hora", `${startTime} – ${endTime}`)}
        ${business.address ? infoRow("Dirección", business.address) : ""}
      </tbody>
    </table>

    <p style="color:#6b7280;font-size:14px;margin:0;">¿Necesitas cancelar o cambiar tu cita? Contáctanos directamente.</p>
  `;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `✅ Cita confirmada en ${business.name}`,
    html: emailBase(content, business),
  });
}

// ─── Notificación al negocio cuando llega una nueva cita ─────────────────────

interface NotificacionNegocioParams {
  toEmail: string;
  business: BusinessBranding;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  serviceName: string;
  professionalName: string;
  date: string;
  startTime: string;
}

export async function enviarNotificacionNegocio(params: NotificacionNegocioParams) {
  if (!process.env.RESEND_API_KEY) return;

  const { toEmail, business, clientName, clientEmail, clientPhone, serviceName, professionalName, date, startTime } = params;

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Nueva cita recibida 📅</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Un cliente acaba de agendar una cita.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${infoRow("Cliente", clientName)}
        ${clientEmail ? infoRow("Email", clientEmail) : ""}
        ${clientPhone ? infoRow("Teléfono", clientPhone) : ""}
        ${infoRow("Servicio", serviceName)}
        ${infoRow("Profesional", professionalName)}
        ${infoRow("Fecha", `${date} a las ${startTime}`)}
      </tbody>
    </table>

    <p style="color:#6b7280;font-size:14px;">Gestiona esta cita desde tu panel de Agéndalo.</p>
  `;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Nueva cita: ${clientName} — ${serviceName}`,
    html: emailBase(content, business),
  });
}

// ─── Recordatorio de cita (3 horas antes) ────────────────────────────────────

interface RecordatorioParams {
  toEmail: string;
  toName: string;
  business: BusinessBranding;
  serviceName: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export async function enviarRecordatorioCita(params: RecordatorioParams) {
  if (!process.env.RESEND_API_KEY) return;

  const { toEmail, toName, business, serviceName, professionalName, date, startTime, endTime } = params;

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Recordatorio de tu cita 🔔</h2>
    <p style="margin:0 0 24px;color:#6b7280;">Hola <strong>${toName}</strong>, te recordamos que hoy tienes una cita en <strong>${business.name}</strong>.</p>

    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:24px;">
      <tbody>
        ${infoRow("Servicio", serviceName)}
        ${infoRow("Profesional", professionalName)}
        ${infoRow("Hora", `${startTime} – ${endTime}`)}
        ${business.address ? infoRow("Dirección", business.address) : ""}
      </tbody>
    </table>

    <p style="color:#6b7280;font-size:14px;">¡Te esperamos!</p>
  `;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `🔔 Recuerda tu cita hoy en ${business.name}`,
    html: emailBase(content, business),
  });
}

// ─── Email de campaña ─────────────────────────────────────────────────────────

interface CampanaParams {
  toEmail: string;
  business: BusinessBranding;
  subject: string;
  body: string; // texto plano del negocio, lo envolvemos en el template
}

export async function enviarCampana(params: CampanaParams) {
  if (!process.env.RESEND_API_KEY) return;

  const { toEmail, business, subject, body } = params;

  // Convertir saltos de línea a párrafos HTML
  const bodyHtml = body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;color:#374151;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const content = `
    <div style="margin-bottom:8px;">${bodyHtml}</div>
  `;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject,
    html: emailBase(content, business),
  });
}
