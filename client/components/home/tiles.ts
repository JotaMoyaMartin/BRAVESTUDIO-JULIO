import { Sparkles, Film, LayoutGrid, Star, Clapperboard, BookOpen, Calendar, BarChart3, GraduationCap, Captions, Images, Zap, Camera, ChartNoAxesColumn, Palette } from 'lucide-react'
import { AppTileProps } from './AppTile'

// Launcher de mini-apps — vive en /herramientas (Home v2 ya no es catálogo).
export const TILES_NORMAL: AppTileProps[] = [
  { href: '/mi-marca', icon: Star, label: 'Mi Marca', desc: 'Perfil de tu salón', tone: 'buttermilk', image: '/tiles/mi-marca-banner.jpg', imageAspect: '1746 / 901' },
  { href: '/planificar', icon: Sparkles, label: 'Planificar', desc: 'Ideas para el mes', tone: 'pink', image: '/tiles/planificar-banner.jpg' },
  { href: '/crear-contenido', icon: Film, label: 'Guiones', desc: '5 ideas → guion listo', tone: 'blue', image: '/tiles/guiones-banner.jpg' },
  { href: '/stories', icon: LayoutGrid, label: 'Stories BRÄVE', desc: 'Stories y encuestas', tone: 'green', image: '/tiles/stories-banner.jpg', imageAspect: '1862 / 845' },
  // STORIES DISEÑO — rework mini-Canva (galería de plantillas, 7-oct-2026).
  { href: '/stories-diseno', icon: Palette, label: 'Stories Diseño', desc: 'Secuencias de stories con plantillas e IA', tone: 'buttermilk' },
  { href: '/teleprompter', icon: Captions, label: 'Teleprompter', desc: 'Graba hablando a cámara', tone: 'cream', image: '/tiles/teleprompter-banner.jpg' },
  // Banco de Ganchos — los 80 ganchos de Jota en 4 intenciones (5-oct-2026).
  { href: '/banco-ganchos', icon: Zap, label: 'Banco de Ganchos', desc: '80 ganchos → guion en 1 toque', tone: 'pink' },
  // Foto inspo — 5 oct (petición Jota)
  { href: '/foto-inspo', icon: Camera, label: 'Foto inspo', desc: 'Replica fotos de referencia con tu cámara', tone: 'cream' },
  // Botón hero interactivo (petición Jota, 2-oct-2026): fuera la imagen
  // estática — texto grande a la izquierda + portadas reales pasando a la
  // derecha con su categoría flotando (AppTile.live).
  { href: '/inspiracion-reels', icon: Clapperboard, label: 'Inspiración Reels', desc: 'Róbale las ideas al feed', tone: 'cherry', liveCaption: 'Róbale las ideas al feed', liveNoun: 'ideas listas' },
  // Transiciones fusionada dentro de Inspiración Reels (2-oct-2026, aprobación Jota):
  // su tile y nav se quitan; /transiciones-reels redirige a la pestaña correspondiente.
  { href: '/biblioteca', icon: BookOpen, label: 'Biblioteca', desc: 'Todo tu contenido', tone: 'buttermilk', image: '/tiles/biblioteca-banner.jpg' },
  { href: '/calendario', icon: Calendar, label: 'Calendario', desc: 'Tu plan del mes', tone: 'green', image: '/tiles/calendario-banner.jpg' },
  // Análisis — Instagram conectado (6-oct-2026): métricas de la cuenta de IG.
  { href: '/analisis', icon: ChartNoAxesColumn, label: 'Análisis', desc: '¿Qué funciona en tu Instagram?', tone: 'blue' },
  // Reto 10K oculto por Jota (30 sep): simplificar. La ruta /reto-10k sigue viva —
  // para reactivarlo: devolver esta línea a TILES_NORMAL (y el nav de Sidebar).
  { href: '/carrusel', icon: Images, label: 'Carrusel', desc: 'Carrusel listo para publicar', tone: 'green' },
]

export const TILES_PREMIUM: AppTileProps[] = [
  { href: '/mi-estrategia', icon: Star, label: 'Mi Estrategia', desc: 'Tu ficha estratégica', tone: 'cherry' },
  { href: '/plan-contenidos', icon: Sparkles, label: 'Plan de Contenidos', desc: 'Tus guiones asignados', tone: 'pink' },
  { href: '/metricas', icon: BarChart3, label: 'Métricas', desc: 'Resultados y crecimiento', tone: 'blue' },
  // Análisis — Instagram conectado (6-oct-2026): datos propios de la cuenta.
  { href: '/analisis', icon: ChartNoAxesColumn, label: 'Análisis', desc: '¿Qué funciona en tu Instagram?', tone: 'cream' },
  { href: '/banco-ganchos', icon: Zap, label: 'Banco de Ganchos', desc: '80 ganchos → guion en 1 toque', tone: 'blue' },
  { href: '/foto-inspo', icon: Camera, label: 'Foto inspo', desc: 'Replica fotos de referencia con tu cámara', tone: 'cream' },
  { href: '/crear-contenido', icon: Film, label: 'Guiones', desc: '5 ideas → guion listo', tone: 'green', image: '/tiles/guiones-banner.jpg' },
  { href: '/carrusel', icon: Images, label: 'Carrusel', desc: 'Carrusel listo para publicar', tone: 'buttermilk' },
  { href: '/stories', icon: LayoutGrid, label: 'Stories BRÄVE', desc: 'Stories y encuestas', tone: 'cream', image: '/tiles/stories-banner.jpg', imageAspect: '1862 / 845' },
  // STORIES DISEÑO — rework mini-Canva (galería de plantillas, 7-oct-2026).
  { href: '/stories-diseno', icon: Palette, label: 'Stories Diseño', desc: 'Secuencias de stories con plantillas e IA', tone: 'buttermilk' },
  { href: '/teleprompter', icon: Captions, label: 'Teleprompter', desc: 'Graba hablando a cámara', tone: 'blue', image: '/tiles/teleprompter-banner.jpg' },
  { href: '/inspiracion-reels', icon: Clapperboard, label: 'Inspiración Reels', desc: 'Róbale las ideas al feed', tone: 'cherry', liveCaption: 'Róbale las ideas al feed', liveNoun: 'ideas listas' },
  { href: '/academia', icon: GraduationCap, label: 'Academia', desc: 'Formación BRÄVE', tone: 'cherry' },
]