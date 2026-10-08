# Guía Canva → BRÄVE Studio (plantillas)

Para Jimena (diseño de plantillas) y para el admin que las importa. **Canva queda
INVISIBLE para las clientas**: nadie que use BRÄVE necesita Canva ni abre
editor de Canva.

---

## Flujo completo

```
Canva (Jimena)            BRÄVE (admin)                 BRÄVE (clienta)
──────────────            ─────────────                 ────────────────
Diseña la Story     →     Importar diseño            →  Elige plantilla
Data Autofill:            lee campos dinámos             escribe textos
marca SOLO lo dinámico    asigna comportamiento          sube foto
Guarda                    publica la plantilla           "Generar"
                                                        recibe PNG (sin Canva)
```

## 1. Cómo preparar una plantilla en Canva

1. **Crea el diseño** (tamaño Story: 1080×1920, o carrusel para el futuro).
2. **Termina el diseño completo**: fondo, texturas, marcos, sombras,
   decoraciones… Todo eso queda FIJO — BRÄVE no lo toca ni lo reconstruye.
3. **Abre Data Autofill** en Canva y marca SOLO el contenido que cambia:
   - los textos que la clienta va a escribir
   - las fotos que la clienta va a subir
4. **Nombra los campos con esta convención** (BRÄVE la usa para ordenar y
   detectar la página de cada campo):
   - `s1_headline`, `s1_body`, `s1_photo`, `s1_cta`
   - `s2_headline`, `s2_body`, `s2_photo`, `s2_cta`
   - `brand_name`, `brand_handle`, `brand_logo`
5. Si un campo no sigue la convención (ej. `titular_portada`), puede
   importarse igual — el admin le asigna manualmente página/comportamiento.
6. **Guarda el diseño.**

**NO etiquetas**: fondos, decoraciones, marcos, sombras, logos fijos del
salón, números de página — nada que la clienta no deba cambiar.

## 2. Importar en BRÄVE (admin)

1. Admin → **`/admin/canva-test`** (spike actual).
2. Pega el **Design ID** (`DA…`) o la URL del diseño → *Importar*.
3. BRÄVE lee automáticamente el **dataset** (los campos marcados en step 4
   anterior) y muestra cada campo con su tipo (`text` / `image`).
4. Asigna comportamiento a cada campo:
   - texto editable por la clienta · texto + IA · Mi Marca · mantener original
   - imagen: foto reemplazable · Mi Marca · mantener original
5. **Guardar plantilla** (queda en Borrador) → Publicar desde el admin.

## 3. Comportamientos (`bindings`)

| Comportamiento | Qué hace | Campos |
|---|---|---|
| `user_text` | la clienta escribe el texto | headline, body, cta… |
| `ai_text` | BRÄVE IA adapta el copy (con propósito + máx caracteres) | headline con propósito `gancho`, maxLength 70… |
| `brand_text` | sale de Mi Marca (nombre, handle de Instagram…) | `brand_*` |
| `user_image` | la clienta sube su foto | `s*_photo` |
| `keep_default` | el diseño lleva el valor original | decoraciones con texto fijo |

## 4. Qué hace BRÄVE por debajo (y qué NO)

- BRÄVE NO reconstruye el diseño: fondo, tipografías, posiciones y efectos
  viven SOLO en Canva.
- Al generar, BRÄVE pide a Canva un autofill **`create_from_design`**: crea
  una copia nueva con los valores de esa clienta y el master queda intacto.
- Canva devuelve el PNG; BRÄVE lo guarda en su propio Storage y la clienta
  lo descarga desde BRÄVE. Las URLs temporales de Canva se descartan.
- Si Jimena cambia el diseño master, el admin usa **Sincronizar** (pendiente,
  Fase 2) y BRÄVE avisa si algún campo mapeado desapareció.

## 5. Convención de nombres — resumen

| Pág | Titular | Cuerpo | Foto | CTA |
|---|---|---|---|---|
| 1 | `s1_headline` | `s1_body` | `s1_photo` | `s1_cta` |
| 2 | `s2_headline` | `s2_body` | `s2_photo` | `s2_cta` |
| 3 | `s3_headline` | `s3_body` | `s3_photo` | `s3_cta` |

Comunes: `brand_name`, `brand_handle`, `brand_logo`.