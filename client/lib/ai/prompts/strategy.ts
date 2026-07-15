/**
 * AI prompt for generating a 13-section strategy document.
 * Shared between Mi Marca (self-service) and admin premium strategy generation.
 */
export const STRATEGY_PROMPT = (text: string) => `Eres un estratega de marketing experto para salones de belleza y peluquería en España. Analiza el texto que una estilista ha escrito sobre su salón y genera un documento estratégico completo y profesional.

Texto de la estilista:
"""
${text}
"""

Responde SOLO con un JSON válido, sin texto adicional ni explicaciones, con esta estructura EXACTA:
{
  "perfil_brave": "descripción de la marca en 2-3 frases potentes",
  "resumen_ejecutivo": "resumen ejecutivo de 4-6 líneas describiendo la situación actual, oportunidades y plan de acción",
  "clienta_ideal": {
    "descripcion": "descripción de la clienta ideal en 2-3 frases",
    "edad": "rango de edad",
    "problemas": ["problema 1", "problema 2", "problema 3"],
    "deseos": ["deseo 1", "deseo 2", "deseo 3"],
    "objeciones": ["objeción o duda 1", "objeción o duda 2", "objeción o duda 3"]
  },
  "servicios": [
    {"name": "nombre del servicio", "priority": "alta|media|baja", "reason": "por qué esta prioridad en 1 frase"}
  ],
  "objetivos": [
    {"timeframe": "1 mes", "goal": "objetivo concreto", "action": "acción para lograrlo"},
    {"timeframe": "3 meses", "goal": "objetivo concreto", "action": "acción para lograrlo"},
    {"timeframe": "6 meses", "goal": "objetivo concreto", "action": "acción para lograrlo"}
  ],
  "estrategia_contenido": [
    {"type": "Reels educativos", "percentage": 30, "reason": "por qué"},
    {"type": "Transformaciones", "percentage": 25, "reason": "por qué"},
    {"type": "Carruseles", "percentage": 20, "reason": "por qué"},
    {"type": "Stories interactivas", "percentage": 15, "reason": "por qué"},
    {"type": "Contenido personal", "percentage": 10, "reason": "por qué"}
  ],
  "pilares_contenido": [
    {"name": "nombre del pilar", "description": "descripción en 1 frase", "examples": ["ejemplo 1", "ejemplo 2"]}
  ],
  "estilo_comunicacion": {
    "tono": "descripción del tono recomendado",
    "voz": "descripción de la voz de la marca",
    "ejemplos": ["ejemplo de frase 1", "ejemplo de frase 2", "ejemplo de frase 3"]
  },
  "imagen_personal": {
    "descripcion": "cómo debe proyectarse la estilista en sus contenidos",
    "consejos": ["consejo 1", "consejo 2", "consejo 3"]
  },
  "recomendaciones_visuales": ["recomendación visual 1", "recomendación visual 2", "recomendación visual 3", "recomendación visual 4"],
  "errores_detectados": ["error 1 que está cometiendo o cometiendo la industria", "error 2", "error 3"],
  "plan_accion": [
    {"text": "acción concreta y ejecutable", "done": false}
  ],
  "resumen_para_ia": "resumen compacto de 5-8 líneas en segunda persona que servirá como contexto permanente para generar todo el contenido. Debe incluir: nombre del salón, ciudad, servicios clave, clienta ideal, tono, diferenciación y objetivo principal."
}

Reglas:
- Los porcentajes de estrategia_contenido deben sumar 100.
- Incluye al menos 4 servicios, 3 objetivos, 5 items en estrategia_contenido, 4 pilares, 5 acciones.
- Todo en español, profesional, concreto y accionable.
- Si un dato no está en el texto, infiérelo del contexto del sector o pon un valor razonable por defecto.
- El resumen_para_ia es CRÍTICO: será usado como contexto para todas las generaciones de contenido.`

export const STRATEGY_REFINE_PROMPT = (currentStrategy: string, instruction: string) => `Eres un estratega de marketing experto para salones de belleza y peluquería en España.

Tienes esta estrategia actual en JSON:
${currentStrategy}

El administrador quiere este ajuste:
"${instruction}"

Devuelve la estrategia COMPLETA modificada según la instrucción, manteniendo EXACTAMENTE la misma estructura JSON (mismas claves, mismos tipos). Aplica el cambio solicitado y ajusta coherente cualquier campo relacionado que se vea afectado. Si el cambio no aplica a alguna sección, mantén esa sección sin cambios.

Reglas:
- Responde SOLO con el JSON válido, sin texto adicional ni explicaciones.
- Los porcentajes de estrategia_contenido deben sumar 100.
- Todo en español, profesional, concreto y accionable.
- Mantén el resumen_para_ia actualizado si el cambio afecta al contexto permanente.`