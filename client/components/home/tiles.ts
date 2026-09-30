import { Sparkles, Film, LayoutGrid, Star, Rocket, Clapperboard, Wand2, BookOpen, Calendar, BarChart3, GraduationCap, Captions, Images } from 'lucide-react'
import { AppTileProps } from './AppTile'

// Launcher de mini-apps — vive en /herramientas (Home v2 ya no es catálogo).
export const TILES_NORMAL: AppTileProps[] = [
  { href: '/mi-marca', icon: Star, label: 'Mi Marca', desc: 'Perfil de tu salón', tone: 'buttermilk', image: '/tiles/mi-marca-banner.jpg', imageAspect: '1746 / 901' },
  { href: '/planificar', icon: Sparkles, label: 'Planificar', desc: 'Ideas para el mes', tone: 'pink', image: '/tiles/planificar-banner.jpg' },
  { href: '/crear-contenido', icon: Film, label: 'Guiones', desc: '5 ideas → guion listo', tone: 'blue', image: '/tiles/guiones-banner.jpg' },
  { href: '/stories', icon: LayoutGrid, label: 'Stories BRÄVE', desc: 'Stories y encuestas', tone: 'green', image: '/tiles/stories-banner.jpg', imageAspect: '1862 / 845' },
  { href: '/teleprompter', icon: Captions, label: 'Teleprompter', desc: 'Graba hablando a cámara', tone: 'cream', image: '/tiles/teleprompter-banner.jpg' },
  { href: '/inspiracion-reels', icon: Clapperboard, label: 'Inspiración Reels', desc: 'Róbale las ideas al feed', tone: 'cherry', image: '/tiles/inspiracion-banner.jpg', imageAspect: '1672 / 941' },
  { href: '/transiciones-reels', icon: Wand2, label: 'Transiciones Reels', desc: 'El corte que engancha', tone: 'blue', image: '/tiles/transiciones-banner.jpg', imageAspect: '1746 / 901' },
  { href: '/biblioteca', icon: BookOpen, label: 'Biblioteca', desc: 'Todo tu contenido', tone: 'buttermilk', image: '/tiles/biblioteca-banner.jpg' },
  { href: '/calendario', icon: Calendar, label: 'Calendario', desc: 'Tu plan del mes', tone: 'green', image: '/tiles/calendario-banner.jpg' },
  { href: '/reto-10k', icon: Rocket, label: 'Reto 10K', desc: 'Reto de 30 días', tone: 'cherry' },
  { href: '/carrusel', icon: Images, label: 'Carrusel', desc: 'Carrusel listo para publicar', tone: 'green' },
]

export const TILES_PREMIUM: AppTileProps[] = [
  { href: '/mi-estrategia', icon: Star, label: 'Mi Estrategia', desc: 'Tu ficha estratégica', tone: 'cherry' },
  { href: '/plan-contenidos', icon: Sparkles, label: 'Plan de Contenidos', desc: 'Tus guiones asignados', tone: 'pink' },
  { href: '/metricas', icon: BarChart3, label: 'Métricas', desc: 'Resultados y crecimiento', tone: 'blue' },
  { href: '/crear-contenido', icon: Film, label: 'Guiones', desc: '5 ideas → guion listo', tone: 'green', image: '/tiles/guiones-banner.jpg' },
  { href: '/carrusel', icon: Images, label: 'Carrusel', desc: 'Carrusel listo para publicar', tone: 'buttermilk' },
  { href: '/stories', icon: LayoutGrid, label: 'Stories BRÄVE', desc: 'Stories y encuestas', tone: 'cream', image: '/tiles/stories-banner.jpg', imageAspect: '1862 / 845' },
  { href: '/teleprompter', icon: Captions, label: 'Teleprompter', desc: 'Graba hablando a cámara', tone: 'blue', image: '/tiles/teleprompter-banner.jpg' },
  { href: '/inspiracion-reels', icon: Clapperboard, label: 'Inspiración Reels', desc: 'Róbale las ideas al feed', tone: 'cherry', image: '/tiles/inspiracion-banner.jpg', imageAspect: '1672 / 941' },
  { href: '/transiciones-reels', icon: Wand2, label: 'Transiciones Reels', desc: 'El corte que engancha', tone: 'blue', image: '/tiles/transiciones-banner.jpg', imageAspect: '1746 / 901' },
  { href: '/academia', icon: GraduationCap, label: 'Academia', desc: 'Formación BRÄVE', tone: 'cherry' },
]