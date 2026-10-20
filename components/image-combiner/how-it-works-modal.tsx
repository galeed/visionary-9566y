"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface HowItWorksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black/95 border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">How it works</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 text-sm text-gray-300 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <p className="leading-relaxed mb-3">
              This playground was built with{" "}
              <a
                href="https://v0.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 underline"
              >
                v0
              </a>{" "}
              and lets you generate images across many providers from one place. All API calls run through{" "}
              <a
                href="https://vercel.com/ai-gateway"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-gray-300 underline"
              >
                Vercel AI Gateway
              </a>{" "}
              for enterprise-grade routing and caching.
            </p>
            <p className="leading-relaxed text-white/90">
              You can clone this playground from v0 and build your own app with your Vercel AI Gateway credentials.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Models</h3>
            <p className="leading-relaxed mb-2">Pick any image model the AI Gateway exposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-semibold text-white">OpenAI:</span> GPT Image 2 and GPT Image 1.5
              </li>
              <li>
                <span className="font-semibold text-white">Google:</span> Gemini 3.1 Flash, Gemini 3 Pro, Gemini 2.5 Flash (image)
              </li>
              <li>
                <span className="font-semibold text-white">xAI:</span> Grok Imagine
              </li>
              <li>
                <span className="font-semibold text-white">Black Forest Labs:</span> FLUX.2 Max and FLUX.2 Pro
              </li>
              <li>
                <span className="font-semibold text-white">Recraft &amp; ByteDance:</span> Recraft V4.1 Pro, Seedream 4.0–5.0
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Per-model settings</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-semibold text-white">GPT Image quality:</span> auto, low, medium, or high (more compute = higher fidelity)
              </li>
              <li>
                <span className="font-semibold text-white">Gemini 3.1 Flash:</span> thinking level (Minimal/High), resolution up to 4K, and Google Search grounding
              </li>
              <li>
                <span className="font-semibold text-white">Aspect ratios:</span> the selector shows only the ratios each model supports; switching models snaps to the closest, and dropping an image picks the closest available
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Technical Overview</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-semibold text-white">Sign in with Vercel:</span> OAuth is required to generate; history syncs to Supabase
              </li>
              <li>
                <span className="font-semibold text-white">Durable generation:</span> each request runs as a Vercel Workflow, so it survives restarts and can be resumed
              </li>
              <li>
                <span className="font-semibold text-white">Image processing:</span> client-side base64 conversion with format/size validation
              </li>
              <li>
                <span className="font-semibold text-white">Output:</span> stored in Vercel Blob, no watermarks
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Image Editing</h3>
            <p className="leading-relaxed mb-2">
              Upload one or two source images along with an edit instruction:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Drag and drop images or use the file picker</li>
              <li>Paste image URLs directly</li>
              <li>Supports PNG, JPG, WebP, GIF (max 50MB)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Keyboard Shortcuts</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">⌘/Ctrl + Enter</kbd> - Generate image
              </li>
              <li>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">⌘/Ctrl + C</kbd> - Copy image to clipboard
              </li>
              <li>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">⌘/Ctrl + D</kbd> - Download image
              </li>
              <li>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">⌘/Ctrl + U</kbd> - Load generated image as
                input
              </li>
              <li>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Esc</kbd> - Close fullscreen viewer
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
