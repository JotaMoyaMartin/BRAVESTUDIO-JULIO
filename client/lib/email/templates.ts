// Plantillas de email transaccional para BRÄVE Studio.
// Devuelven HTML strings simples con estilo cherry palette.

const wrapper = (title: string, content: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(89,20,39,0.08);">
      <div style="background:#7A1832;padding:24px 32px;text-align:center;">
        <span style="color:#FFF1B5;font-size:22px;font-weight:bold;">✦ BRÄVE Studio</span>
      </div>
      <div style="padding:32px;">
        <h1 style="color:#591427;font-size:20px;margin:0 0 16px 0;">${title}</h1>
        ${content}
      </div>
      <div style="padding:16px 32px;background:#FFF8E7;text-align:center;">
        <p style="color:#591427;font-size:11px;opacity:0.6;margin:0;">
          BRÄVE Studio — Contenido para estilistas
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`

const ctaButton = (text: string, url: string): string => `
  <a href="${url}" style="display:inline-block;background:#7A1832;color:white;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none;margin-top:16px;">
    ${text}
  </a>
`

export function welcomeEmail(name: string): string {
  const firstName = name ? name.split(' ')[0] : 'estilista'
  return wrapper(
    '¡Bienvenida a BRÄVE Studio!',
    `
    <p style="color:#591427;font-size:15px;line-height:1.6;">Hola ${firstName},</p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      ¡Bienvenida a BRÄVE Studio! Ya puedes crear contenido profesional para tu Instagram:
      Reels, Carruseles y Stories con la metodología BRÄVE.
    </p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      Empieza por la sección "Sorpréndeme" en Inicio para ideas rápidas,
      o ve a "Crear contenido" para un guion completo.
    </p>
    ${ctaButton('Empezar a crear', 'https://bravestudio.app/inicio')}
    `
  )
}

export function passwordChangedEmail(email: string): string {
  return wrapper(
    'Contraseña actualizada',
    `
    <p style="color:#591427;font-size:15px;line-height:1.6;">Hola,</p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      Tu contraseña en BRÄVE Studio ha sido cambiada correctamente.
    </p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      Si no fuiste tú, contacta con soporte inmediatamente respondiendo a este email.
    </p>
    <p style="color:#591427;font-size:13px;opacity:0.6;line-height:1.4;">
      Cuenta: ${email}
    </p>
    `
  )
}

export function subscriptionCreatedEmail(name: string, plan: string): string {
  const firstName = name ? name.split(' ')[0] : 'estilista'
  return wrapper(
    'Suscripción activada',
    `
    <p style="color:#591427;font-size:15px;line-height:1.6;">Hola ${firstName},</p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      ¡Tu suscripción a BRÄVE Studio está activa! Plan: <strong>${plan}</strong>.
    </p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      Ya puedes acceder a todo el contenido y herramientas de BRÄVE sin límites.
    </p>
    ${ctaButton('Ir a BRÄVE Studio', 'https://bravestudio.app/inicio')}
    `
  )
}

export function subscriptionCanceledEmail(name: string, cancelsAt: string): string {
  const firstName = name ? name.split(' ')[0] : 'estilista'
  return wrapper(
    'Suscripción cancelada',
    `
    <p style="color:#591427;font-size:15px;line-height:1.6;">Hola ${firstName},</p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      Has cancelado tu suscripción a BRÄVE Studio. Tu acceso se mantendrá
      hasta el <strong>${cancelsAt}</strong>.
    </p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento
      desde tu cuenta.
    </p>
    ${ctaButton('Reactivar suscripción', 'https://bravestudio.app/pricing')}
    `
  )
}

export function paymentFailedEmail(name: string): string {
  const firstName = name ? name.split(' ')[0] : 'estilista'
  return wrapper(
    'Pago fallido',
    `
    <p style="color:#591427;font-size:15px;line-height:1.6;">Hola ${firstName},</p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      No se pudo procesar el pago de tu suscripción a BRÄVE Studio.
      Stripe intentará cobrar de nuevo en los próximos días.
    </p>
    <p style="color:#591427;font-size:15px;line-height:1.6;">
      Actualiza tu método de pago para evitar perder el acceso:
    </p>
    ${ctaButton('Actualizar método de pago', 'https://bravestudio.app/account')}
    `
  )
}