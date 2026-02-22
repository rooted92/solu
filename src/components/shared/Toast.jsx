export default function Toast({ message, type = 'success' }) {
  const colors = {
    success: 'border-accent/30 text-accent bg-accent/10',
    error: 'border-red-500/30 text-red-400 bg-red-500/10',
    info: 'border-accent2/30 text-accent2 bg-accent2/10',
  }

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-full border text-sm font-medium shadow-2xl backdrop-blur-xl whitespace-nowrap animate-fade-up ${colors[type]}`}>
      {message}
    </div>
  )
}
