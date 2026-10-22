/**
 * Editar Videos — transcripción LOCAL en el navegador (sin API key).
 * Copiado del patrón de Yapper Edita: transformers.js + onnxruntime-web,
 * modelo whisper-large-v3-turbo_timestamped (dtype q4) con WebGPU;
 * sin WebGPU no se intenta y caemos al camino del servidor (API key).
 * La librería carga por CDN dinámico (webpackIgnore) — el modelo se descarga
 * UNA vez y queda en Cache Storage del navegador.
 * Tipos mínimos locales: la lib no forma parte del bundle.
 */

export interface AsrChunk { text: string; timestamp: [number, number] }
export interface AsrOutput { text: string; chunks?: AsrChunk[] | null }
type AsrPipeline = (audio: Float32Array, opts: Record<string, unknown>) => Promise<AsrOutput | AsrOutput[]>
export interface AsrProgress { status?: string; file?: string; progress?: number }

/** Convierte los chunks con timestamps a palabras del core (filtra sin tiempo). */
export function wordsFromChunks(chunks: AsrChunk[] | null | undefined): { text: string; start: number; end: number }[] {
  if (!chunks) return []
  return chunks
    .filter(c => c && typeof c.text === 'string' && Array.isArray(c.timestamp) &&
      typeof c.timestamp[0] === 'number' && typeof c.timestamp[1] === 'number')
    .map(c => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] }))
    .filter(w => w.text.length > 0)
}

/** ¿Hay WebGPU real (con adapter)? Sin WebGPU la transcripción local es inviable. */
export async function webgpuReady(): Promise<boolean> {
  try {
    const g = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu
    if (!g) return false
    return !!(await g.requestAdapter())
  } catch { return false }
}

/** Decodifica el archivo a PCM mono 16 kHz (lo que whisper espera como input). */
export async function pcm16kFromFile(f: File): Promise<Float32Array> {
  const ac = new AudioContext({ sampleRate: 16000 })
  try {
    const audio = await ac.decodeAudioData(await f.arrayBuffer())
    const ch = audio.numberOfChannels
    const mono = new Float32Array(audio.length)
    for (let c = 0; c < ch; c++) {
      const data = audio.getChannelData(c)
      for (let i = 0; i < data.length; i++) mono[i] += data[i] / ch
    }
    return mono
  } finally {
    void ac.close()
  }
}

const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3'
const MODEL = 'onnx-community/whisper-large-v3-turbo_timestamped'

/** Transcribe en el dispositivo y devuelve palabras con timestamps. */
export async function transcribeLocal(
  pcm: Float32Array,
  onNote?: (msg: string) => void,
): Promise<{ text: string; start: number; end: number }[]> {
  // import por CDN fuera del bundle de Next (el modelo ya viaja por red igualmente)
  const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ CDN)) as {
    pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<AsrPipeline>
    env: { allowLocalModels: boolean }
  }
  mod.env.allowLocalModels = false
  let lastFile = ''
  const pipe = await mod.pipeline('automatic-speech-recognition', MODEL, {
    dtype: 'q4',
    device: 'webgpu',
    progress_callback: (p: AsrProgress) => {
      if (p.status === 'progress' && p.file && typeof p.progress === 'number') {
        if (p.file !== lastFile) { lastFile = p.file }
        onNote?.(`Descargando el modelo de voz (una sola vez)… ${Math.round(p.progress)}%`)
      }
    },
  })
  onNote?.('Transcribiendo en tu dispositivo…')
  const out = await pipe(pcm, {
    chunk_length_s: 30,
    stride_length_s: 5,
    language: 'spanish',
    task: 'transcribe',
    return_timestamps: 'word',
  })
  const single = Array.isArray(out) ? out[0] : out
  return wordsFromChunks(single?.chunks)
}