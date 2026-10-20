"use client"

interface FullscreenViewerProps {
  imageUrl: string
  onClose: () => void
  onNavigate: (direction: "prev" | "next") => void
  canNavigate: boolean
}

export function FullscreenViewer({ imageUrl, onClose, onNavigate, canNavigate }: FullscreenViewerProps) {
  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center select-none overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen image view"
    >
      {/* Close button - fixed top right corner */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="fixed top-4 right-4 z-50 text-white/60 hover:text-white p-1.5 transition-colors duration-200"
        title="Close (ESC)"
        aria-label="Close fullscreen"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Main layout: arrows outside image */}
      <div className="flex items-center justify-center gap-4 md:gap-8 w-full h-full px-12 md:px-20 py-8">
        {/* Previous arrow */}
        {canNavigate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNavigate("prev")
            }}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 text-white/40 hover:text-white transition-colors duration-200"
            title="Previous"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Image */}
        <img
          src={imageUrl || "/placeholder.svg"}
          alt="Fullscreen"
          className="max-w-full max-h-[90vh] object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Next arrow */}
        {canNavigate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNavigate("next")
            }}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 text-white/40 hover:text-white transition-colors duration-200"
            title="Next"
            aria-label="Next image"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
