-- Reto 10K: transformacion de 30 dias para estilistas
-- Requiere: public.is_admin() ya definida en el schema

-- 1. Anadir columna tag a content_items (idempotente)
alter table public.content_items
  add column if not exists tag text;

-- 2. Tabla de progreso por usuario
create table if not exists public.reto_10k_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  started_at timestamptz,
  objective text,
  services text[] not null default '{}',
  level text,
  current_day int not null default 1,
  current_phase int not null default 1,
  status text not null default 'not_started' check (status in ('not_started','active','paused','completed')),
  completed_at timestamptz,
  last_generated_week int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabla de configuracion global del reto (editable por admin)
create table if not exists public.reto_10k_config (
  id text primary key default 'default',
  config_json jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- 4. RLS reto_10k_progress: usuario gestiona solo su progreso
alter table public.reto_10k_progress enable row level security;

create policy "Usuarios gestionan su propio progreso"
  on public.reto_10k_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. RLS reto_10k_config: lectura para authenticated, todo para admin
alter table public.reto_10k_config enable row level security;

create policy "Usuarios autenticados leen configuracion del reto"
  on public.reto_10k_config for select
  to authenticated
  using (true);

create policy "Solo admin gestiona configuracion del reto"
  on public.reto_10k_config for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 6. Seed de configuracion
insert into public.reto_10k_config (id, config_json)
values (
  'default',
  jsonb_build_object(
    'phases', jsonb_build_array(
      jsonb_build_object(
        'order', 1,
        'emoji', '🌱',
        'title', 'Pierde el miedo y empieza a mostrarte',
        'objective', 'Crear confianza delante de cámara',
        'content', jsonb_build_array('Mi historia','Mi experiencia','Mi salón','Por qué elegí esta profesión','Mi filosofía')
      ),
      jsonb_build_object(
        'order', 2,
        'emoji', '✨',
        'title', 'Construye tu autoridad',
        'objective', 'Demostrar conocimiento',
        'content', jsonb_build_array('Consejos profesionales','Errores frecuentes','Educación','Mitos','Opiniones profesionales')
      ),
      jsonb_build_object(
        'order', 3,
        'emoji', '🔥',
        'title', 'Genera deseo con resultados',
        'objective', 'Mostrar el valor del trabajo',
        'content', jsonb_build_array('Antes y después','Transformaciones','Casos reales','Procesos','Testimonios')
      ),
      jsonb_build_object(
        'order', 4,
        'emoji', '🚀',
        'title', 'Conviértete en referente',
        'objective', 'Crear comunidad',
        'content', jsonb_build_array('Tendencias','Contenido viral','Opiniones','Conversaciones','Marca personal')
      )
    ),
    'missions', jsonb_build_array(
      jsonb_build_object('day', 1, 'phase', 1, 'title', 'Preséntate a cámara', 'description', 'Graba un vídeo corto presentándote y contando quién eres.', 'prompt_hint', 'Cuenta tu historia: por qué te hiciste estilista, qué te apasiona, qué te diferencia.'),
      jsonb_build_object('day', 2, 'phase', 1, 'title', 'Tu experiencia', 'description', 'Comparte cuántos años llevas y qué has aprendido.', 'prompt_hint', 'Habla de tu trayectoria, errores que has cometido y lecciones aprendidas.'),
      jsonb_build_object('day', 3, 'phase', 1, 'title', 'Muestra tu salón', 'description', 'Da un tour por tu espacio de trabajo.', 'prompt_hint', 'Muestra el ambiente, los productos, los rincones especiales de tu salón.'),
      jsonb_build_object('day', 4, 'phase', 1, 'title', 'Por qué elegí esta profesión', 'description', 'Cuenta tu vocación y motivación.', 'prompt_hint', 'Explica qué te llevó a ser estilista y qué amas de tu trabajo.'),
      jsonb_build_object('day', 5, 'phase', 1, 'title', 'Mi filosofía', 'description', 'Comparte tu forma de entender la peluquería.', 'prompt_hint', 'Tus valores, cómo trabajas, qué prometes a cada clienta.'),
      jsonb_build_object('day', 6, 'phase', 1, 'title', 'Un día en tu vida', 'description', 'Documenta un día de trabajo.', 'prompt_hint', 'Desde que abres hasta que cierras: rutina, momentos, clientas.'),
      jsonb_build_object('day', 7, 'phase', 1, 'title', 'Tu primera clienta', 'description', 'Recuerda a tu primera clienta y qué sentiste.', 'prompt_hint', 'Anécdota emocional, nervios, ilusión, lo que aprendiste.'),
      jsonb_build_object('day', 8, 'phase', 1, 'title', 'Lo que te hace única', 'description', 'Identifica y comunica tu diferenciación.', 'prompt_hint', 'Qué te distingue de otras estilistas, tu sello personal.'),
      jsonb_build_object('day', 9, 'phase', 2, 'title', 'Consejo profesional #1', 'description', 'Comparte un consejo útil que solo un pro sabe.', 'prompt_hint', 'Un truco técnico sobre tu servicio estrella que sorprenda.'),
      jsonb_build_object('day', 10, 'phase', 2, 'title', 'Error frecuente', 'description', 'Alerta sobre un error común en tu servicio.', 'prompt_hint', 'Un error que ven tus clientas y cómo evitarlo.'),
      jsonb_build_object('day', 11, 'phase', 2, 'title', 'Educación: cómo cuidar el cabello', 'description', 'Enseña algo educativo en 30 segundos.', 'prompt_hint', 'Rutina de cuidado en casa, productos, frecuencia de lavado.'),
      jsonb_build_object('day', 12, 'phase', 2, 'title', 'Desmontando un mito', 'description', 'Refuta un mito extendido en peluquería.', 'prompt_hint', 'Un mito que tus clientas creen y por qué no es cierto.'),
      jsonb_build_object('day', 13, 'phase', 2, 'title', 'Mi opinión profesional', 'description', 'Opina sobre una tendencia de tu sector.', 'prompt_hint', 'Una tendencia actual, qué piensas, si la recomiendas o no.'),
      jsonb_build_object('day', 14, 'phase', 2, 'title', 'Consejo profesional #2', 'description', 'Otro consejo de valor para tu audiencia.', 'prompt_hint', 'Tips de mantenimiento, señal de cabello dañado, cuándo ir al salón.'),
      jsonb_build_object('day', 15, 'phase', 2, 'title', 'Preguntas frecuentes', 'description', 'Responde las dudas que más recibes.', 'prompt_hint', '3 preguntas frecuentes de tus clientas con respuestas claras.'),
      jsonb_build_object('day', 16, 'phase', 3, 'title', 'Antes y después', 'description', 'Muestra una transformación impactante.', 'prompt_hint', 'Transformación completa con antes y después de un servicio real.'),
      jsonb_build_object('day', 17, 'phase', 3, 'title', 'Transformación real', 'description', 'Documenta un proceso de principio a fin.', 'prompt_hint', 'De consulta a resultado final, paso a paso del servicio.'),
      jsonb_build_object('day', 18, 'phase', 3, 'title', 'Caso real: clienta feliz', 'description', 'Comparte la historia de una clienta satisfecha.', 'prompt_hint', 'Su problema, tu solución, su reacción al verse.'),
      jsonb_build_object('day', 19, 'phase', 3, 'title', 'El proceso', 'description', 'Muestra cómo trabajas en detalle.', 'prompt_hint', 'Técnica, productos, herramientas, tiempo, cuidado en cada paso.'),
      jsonb_build_object('day', 20, 'phase', 3, 'title', 'Testimonio de clienta', 'description', 'Comparte una reseña o testimonio en vídeo.', 'prompt_hint', 'Una clienta contando su experiencia contigo y por qué vuelve.'),
      jsonb_build_object('day', 21, 'phase', 3, 'title', 'Resultado que te enorgullece', 'description', 'Muestra el trabajo del que más te sientes orgullosa.', 'prompt_hint', 'Tu mejor trabajo reciente con explicación del reto técnico.'),
      jsonb_build_object('day', 22, 'phase', 3, 'title', 'Transformación express', 'description', 'Un cambio rápido y visible en formato corto.', 'prompt_hint', 'Transformación rápida que se ve en segundos pero impresiona.'),
      jsonb_build_object('day', 23, 'phase', 3, 'title', 'Resumen de la semana', 'description', 'Recopila tus mejores momentos de la semana.', 'prompt_hint', 'Varios resultados de la semana con música y ritmo dinámico.'),
      jsonb_build_object('day', 24, 'phase', 4, 'title', 'Tendencia de la temporada', 'description', 'Comenta una tendencia actual de peluquería.', 'prompt_hint', 'Una tendencia de hoy, cómo adaptarla a tus clientas.'),
      jsonb_build_object('day', 25, 'phase', 4, 'title', 'Contenido viral', 'description', 'Crea algo diseñado para compartirse.', 'prompt_hint', 'Formato viral, hook potente, entretenido y relacionado con tu trabajo.'),
      jsonb_build_object('day', 26, 'phase', 4, 'title', 'Tu opinión sobre el sector', 'description', 'Opina sobre el futuro de la peluquería.', 'prompt_hint', 'Visión del sector, hacia dónde va, qué te emociona del futuro.'),
      jsonb_build_object('day', 27, 'phase', 4, 'title', 'Conversación con tu comunidad', 'description', 'Haz una pregunta abierta a tu audiencia.', 'prompt_hint', 'Pregunta a tu comunidad, responde comentarios, fomenta diálogo.'),
      jsonb_build_object('day', 28, 'phase', 4, 'title', 'Marca personal', 'description', 'Reflexiona sobre tu identidad como estilista.', 'prompt_hint', 'Qué te define, tu propósito, tu visión, qué quieres transmitir.'),
      jsonb_build_object('day', 29, 'phase', 4, 'title', 'Agradecimiento a tu comunidad', 'description', 'Da las gracias a tus seguidoras y clientas.', 'prompt_hint', 'Agradecimiento sincero, celebra el camino recorrido juntas.'),
      jsonb_build_object('day', 30, 'phase', 4, 'title', 'Celebra el final del Reto', 'description', 'Recapitula tu transformación de 30 días.', 'prompt_hint', 'Resumen de tu evolución, lo que has logrado, lo que viene ahora.')
    ),
    'braviMessages', jsonb_build_object(
      'start', jsonb_build_array(
        '¡Hoy empieza tu transformación! 30 días, 30 misiones, un nuevo tú.',
        'Vamos a construir tu presencia en Instagram paso a paso. Yo te guío.',
        'Confía en el proceso. Cada día una misión, cada misión un paso hacia tu meta.',
        'Tu comunidad te está esperando. Es hora de mostrarte al mundo.'
      ),
      'day', jsonb_build_array(
        '¡Día {day}! Misión de hoy: {mission}. ¡Tú puedes!',
        'Llevas {day} días en el Reto. Cada contenido cuenta, sigue así.',
        'Hoy toca: {mission}. Recuerda, hecho es mejor que perfecto.',
        'Día {day} de 30. Vas por buen camino, no pares ahora.',
        'Tu misión de hoy: {mission}. Yo sé que lo vas a clavar.'
      ),
      'week', jsonb_build_array(
        '¡Has completado otra semana del Reto! Vamos a generar tu contenido.',
        'Nueva semana, nuevas ideas. Deja que te ayude a planificar.',
        'Es momento de crear tu contenido semanal. ¡Genera y guarda!',
        'Una semana más de progreso. Tu constancia te está transformando.'
      ),
      'phase', jsonb_build_array(
        '¡Nueva fase! {phase}. Estás evolucionando como estilista.',
        'Fase completada y nueva etapa begin. ¡Vas por más!',
        'Subes de nivel. Esta fase te lleva un paso más allá.',
        'Cada fase tiene su reto. Este es el tuyo ahora: {phase}.'
      ),
      'complete', jsonb_build_array(
        '¡Completaste el Reto 10K! 30 días de transformación. ¡Orgullosa de ti!',
        'Eres oficialmente una estilista referente. Lo lograste.',
        '30 días, 30 misiones, infinitas posibilidades. ¡Enhorabuena!',
        'Tu transformación es real. Tu comunidad lo nota. Lo lograste.'
      ),
      'streak', jsonb_build_array(
        '¡{streak} días seguidos! Eres imparable.',
        'Llevas {streak} días creando contenido. Así se hace.',
        'Tu racha de {streak} días es tu mejor prueba de constancia.',
        '¡Fuego! {streak} días sin parar. Sigue así.'
      )
    )
  )
)
on conflict (id) do nothing;