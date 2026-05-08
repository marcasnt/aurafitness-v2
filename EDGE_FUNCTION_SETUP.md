# Configuracion de Notificaciones por Email al Coach

Este documento explica paso a paso como configurar el envio de emails al coach cuando un cliente envia un mensaje nuevo.

---

## 1. Crear la Edge Function en Supabase

Ve a tu dashboard de Supabase y ejecuta este comando desde tu terminal (con Supabase CLI instalado):

```bash
# Asegurate de estar logueado
supabase login

# En la raiz de este proyecto, deploy la funcion
supabase functions deploy send-coach-email
```

O si prefieres crearla manualmente desde el dashboard:

1. Ve a **Edge Functions** en el menu lateral
2. Click en **Deploy a new function**
3. Nombre: `send-coach-email`
4. Pega el codigo de abajo

---

## 2. Codigo de la Edge Function

Crea un archivo llamado `index.ts` dentro de `supabase/functions/send-coach-email/` con este contenido:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@aurafitness.com';

serve(async (req) => {
  try {
    const { to, subject, text, html } = await req.json();

    if (!to || !subject || !text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, text' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `AURA Fitness Elite <${FROM_EMAIL}>`,
        to,
        subject,
        text,
        html: html || `<pre style="font-family:sans-serif;line-height:1.6">${text}</pre>`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ error: data }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 3. Configurar Secrets de Supabase

Ve a tu proyecto Supabase → **Settings** → **Secrets** y agrega estas variables:

| Secret | Valor | Descripcion |
|--------|-------|-------------|
| `RESEND_API_KEY` | `re_xxxxxxxxxx` | Tu API Key de Resend. Obtela en [resend.com/api-keys](https://resend.com/api-keys) |
| `FROM_EMAIL` | `noreply@tu-dominio.com` | El correo desde el que se envian las notificaciones. Debe estar verificado en Resend. |

Para agregar desde CLI:

```bash
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui
supabase secrets set FROM_EMAIL=noreply@aurafitness.com
```

---

## 4. Obtener API Key de Resend (GRATIS)

1. Ve a [resend.com](https://resend.com) y crea una cuenta gratis
2. Verifica tu dominio (o usa el dominio de prueba `resend.dev` para pruebas)
3. Ve a **API Keys** → Create API Key → elige `Sending access`
4. Copia la key y pegala en el secret `RESEND_API_KEY` de Supabase

---

## 5. Probar la Edge Function

Una vez deployada, pruebala con curl:

```bash
curl -X POST https://TU-PROYECTO.supabase.co/functions/v1/send-coach-email \
  -H "Authorization: Bearer TU-ANON-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "coach@aurafitness.com",
    "subject": "Nuevo mensaje de un cliente",
    "text": "Tienes un nuevo mensaje en AURA Fitness Elite."
  }'
```

Debes recibir el email en `coach@aurafitness.com`.

---

## 6. Conectar con la App Frontend

La app ya tiene integrado el envio de mensajes via Supabase. Para que el coach reciba notificaciones por email, puedes agregar una llamada a esta Edge Function desde el frontend despues de enviar un mensaje.

En `src/lib/supabase-auth.ts`, despues de `messagesService.send(...)`, agrega:

```typescript
// Notificar al coach por email
await fetch(`${SUPABASE_URL}/functions/v1/send-coach-email`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'coach@aurafitness.com',
    subject: `Nuevo mensaje de ${senderName}`,
    text: content,
  }),
});
```

---

## Resumen de archivos

| Archivo | Descripcion |
|---------|-------------|
| `supabase-schema.sql` | Schema completo de la base de datos |
| `supabase/functions/send-coach-email/index.ts` | Edge Function para enviar emails |
| `.env` | Variables del frontend (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) |
