'use client'
import { useEffect, useRef, useState } from 'react'

// Camera QR scanner. Uses the browser's BarcodeDetector where available
// (Chrome/Android) and falls back to jsQR (iPhone Safari).
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> }

export default function Scanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false
    let detector: Detector | null = null
    let jsqr: typeof import('jsqr').default | null = null

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch {
        setErr('Camera blocked. Allow camera access, or type the code below.')
        return
      }
      const v = video.current!
      v.srcObject = stream
      await v.play().catch(() => {})
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
      if (BD) detector = new BD({ formats: ['qr_code'] })
      else jsqr = (await import('jsqr')).default

      const tick = async () => {
        if (stopped) return
        if (v.readyState >= 2) {
          let value: string | null = null
          if (detector) {
            const r = await detector.detect(v).catch(() => [])
            value = r[0]?.rawValue ?? null
          } else if (jsqr && canvas.current) {
            const c = canvas.current
            const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * 480) || 360
            c.width = w; c.height = h
            const ctx = c.getContext('2d', { willReadFrequently: true })!
            ctx.drawImage(v, 0, 0, w, h)
            value = jsqr(ctx.getImageData(0, 0, w, h).data, w, h)?.data ?? null
          }
          if (value && /PSS-/i.test(value)) {
            stopped = true
            navigator.vibrate?.(80)
            onCode(value)
            return
          }
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 rounded-3xl border-4 border-gold-500 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" />
        </div>
        <p className="absolute inset-x-0 top-6 text-center text-lg font-bold text-white">Point at the QR label</p>
        {err && <p role="alert" className="absolute inset-x-4 bottom-6 rounded-xl bg-white p-4 text-center font-semibold text-red-800">{err}</p>}
      </div>
      <canvas ref={canvas} className="hidden" />
      <button type="button" onClick={onClose} className="m-4 min-h-14 rounded-2xl bg-white text-lg font-bold text-ink-900">Cancel</button>
    </div>
  )
}
