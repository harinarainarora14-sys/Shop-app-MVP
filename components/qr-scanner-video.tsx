"use client"

import { useEffect, useRef } from 'react'
import jsQR from 'jsqr'

interface QRScannerVideoProps {
  onScan: (result: string) => void
  onError: (error: string) => void
}

export function QRScannerVideo({ onScan, onError }: QRScannerVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        onError("Camera access denied or not available")
      }
    }

    startCamera()

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [onError])

  useEffect(() => {
    let animationFrameId: number

    function scanQRCode() {
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight
        canvas.width = video.videoWidth

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code) {
          onScan(code.data)
          return // Stop scanning after finding a code
        }
      }

      // Continue scanning
      animationFrameId = requestAnimationFrame(scanQRCode)
    }

    const interval = setInterval(() => {
      animationFrameId = requestAnimationFrame(scanQRCode)
    }, 500) // Scan every 500ms to reduce CPU usage

    return () => {
      cancelAnimationFrame(animationFrameId)
      clearInterval(interval)
    }
  }, [onScan])

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-64 object-cover rounded-lg"
      />
      <canvas 
        ref={canvasRef} 
        className="hidden"
      />
      <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-lg pointer-events-none" />
    </div>
  )
}