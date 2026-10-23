import { Sparkles, Film, LayoutGrid, Star, Clapperboard, BookOpen, Calendar, BarChart3, GraduationCap, Captions, Images, Zap, Camera, ChartNoAxesColumn, Palette, Scissors } from 'lucide-react'
import { AppTileProps } from './AppTile'
import { showInstagram } from '@/lib/features'

// Launcher de mini-apps — vive en /herramientas (Home v2 ya no es catálogo).
export const TILES_NORMAL: AppTileProps[] = [
  { href: '/mi-marca', icon: Star, label: 'Mi Marca', desc: 'Perfil de tu salón', tone: 'buttermilk', image: '/tiles/mi-marca-banner.jpg', imageAspect: '1746 / 901' },
  { href: '/calendario', icon: Calendar, label: 'Mi plan', desc: 'Lo que toca hoy y tu mes', tone: 'pink', image: '/tiles/planificar-banner.jpg' },
  { href: '/crear-contenido', icon: Film, label: 'Crear guiones', desc: 'Tu idea → gancho → guion', tone: 'blue', image: '/tiles/guiones-banner.jpg' },
  { href: '/stories', icon: LayoutGrid, label: 'Stories', desc: 'Secuencias listas: pon tu foto y publica', tone: 'green', image: '/tiles/stories-banner.jpg', imageAspect: '1862 / 845' },
  { href: '/carrusel', icon: Images, label: 'Carruseles', desc: 'Carrusel listo para publicar', tone: 'green', banner: 'carruseles' },
  // STORIES DISEÑO — rework mini-Canva (galería de plantillas, 7-oct-2026).
  { href: '/teleprompter', icon: Captions, label: 'Teleprompter', desc: 'Graba hablando a cámara', tone: 'cream', image: '/tiles/teleprompter-banner.jpg' },
  // Banco de Ganchos — los 80 ganchos de Jota en 4 intenciones (5-oct-2026).
  { href: '/banco-ganchos', icon: Zap, label: 'Banco de Ganchos', desc: '80 ganchos → guion en 1 toque', tone: 'pink', banner: 'ganchos' },
  // Foto inspo — 5 oct (petición Jota)
  { href: '/estudio', icon: Camera, label: 'Estudio de fotos', desc: 'Hazte la foto, déjala bonita y úsala', tone: 'cream', banner: 'estudio' },
  // Foto Pro — 8-oct-2026: Retoque Pro disponible, Sesión IA próximamente.
  // EDITAR VIDEOS — 13-oct-2026: recorte de silencios guiado (todo en el navegador).
  { href: '/editar-videos', icon: Scissors, label: 'Editar Videos', desc: 'Sube tu reel y corta los silencios', tone: 'pink', banner: 'videos' },
  // Botón hero interactivo (petición Jota, 2-oct-2026): fuera la imagen
  // estática — texto grande a la izquierda + portadas reales pasando a la
  // derecha con su categoría flotando (AppTile.live).
  { href: '/inspiracion-reels', icon: Clapperboard, label: 'Reels virales', desc: 'Reels que ya funcionan, listos para copiar', tone: 'cherry', liveCaption: 'Róbale las ideas al feed', liveNoun: 'ideas listas' },
  // Transiciones fusionada dentro de Inspiración Reels (2-oct-2026, aprobación Jota):
  // su tile y nav se quitan; /transiciones-reels redirige a la pestaña correspondiente.
  { href: '/biblioteca', icon: BookOpen, label: 'Biblioteca', desc: 'Todo tu contenido', tone: 'buttermilk', image: '/tiles/biblioteca-banner.jpg' },
  // Análisis — Instagram conectado (6-oct-2026): métricas de la cuenta de IG.
  ...(showInstagram() ? [{ href: '/analisis', icon: ChartNoAxesColumn, label: 'Análisis', desc: '¿Qué funciona en tu Instagram?', tone: 'blue', banner: 'analisis' } as AppTileProps] : []),
  // Reto 10K oculto por Jota (30 sep): simplificar. La ruta /reto-10k sigue viva —
  // para reactivarlo: devolver esta línea a TILES_NORMAL (y el nav de Sidebar).
]

export const TILES_PREMIUM: AppTileProps[] = [
  { href: '/mi-estrategia', icon: Star, label: 'Mi Estrategia', desc: 'Tu ficha estratégica', tone: 'cherry' },
  { href: '/plan-contenidos', icon: Sparkles, label: 'Plan de Contenidos', desc: 'Tus guiones asignados', tone: 'pink' },
  { href: '/metricas', icon: BarChart3, label: 'Métricas', desc: 'Resultados y crecimiento', tone: 'blue' },
  // Análisis — Instagram conectado (6-oct-2026): datos propios de la cuenta.
  ...(showInstagram() ? [{ href: '/analisis', icon: ChartNoAxesColumn, label: 'Análisis', desc: '¿Qué funciona en tu Instagram?', tone: 'cream', banner: 'analisis' } as AppTileProps] : []),
  { href: '/banco-ganchos', icon: Zap, label: 'Banco de Ganchos', desc: '80 ganchos → guion en 1 toque', tone: 'blue', banner: 'ganchos' },
  { href: '/estudio', icon: Camera, label: 'Estudio de fotos', desc: 'Hazte la foto, déjala bonita y úsala', tone: 'cream', banner: 'estudio' },
  // Foto Pro — 8-oct-2026: Retoque Pro disponible, Sesión IA próximamente.
  // EDITAR VIDEOS — 13-oct-2026: recorte de silencios guiado (todo en el navegador).
  { href: '/editar-videos', icon: Scissors, label: 'Editar Videos', desc: 'Sube tu reel y corta los silencios', tone: 'blue', banner: 'videos' },
  { href: '/crear-contenido', icon: Film, label: 'Crear guiones', desc: 'Tu idea → gancho → guion', tone: 'green', image: '/tiles/guiones-banner.jpg' },
  { href: '/carrusel', icon: Images, label: 'Carruseles', desc: 'Carrusel listo para publicar', tone: 'buttermilk', banner: 'carruseles' },
  { href: '/stories', icon: LayoutGrid, label: 'Stories', desc: 'Secuencias listas: pon tu foto y publica', tone: 'cream', image: '/tiles/stories-banner.jpg', imageAspect: '1862 / 845' },
  // STORIES DISEÑO — rework mini-Canva (galería de plantillas, 7-oct-2026).
  { href: '/teleprompter', icon: Captions, label: 'Teleprompter', desc: 'Graba hablando a cámara', tone: 'blue', image: '/tiles/teleprompter-banner.jpg' },
  { href: '/inspiracion-reels', icon: Clapperboard, label: 'Reels virales', desc: 'Reels que ya funcionan, listos para copiar', tone: 'cherry', liveCaption: 'Róbale las ideas al feed', liveNoun: 'ideas listas' },
  { href: '/academia', icon: GraduationCap, label: 'Academia', desc: 'Formación BRÄVE', tone: 'cherry' },
]