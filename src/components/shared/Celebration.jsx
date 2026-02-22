import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function Celebration({ goalName, onClose, isPlanComplete }) {
  useEffect(() => {
    // Fire confetti
    const fire = (particleRatio, opts) => {
      confetti({
        origin: { y: 0.6 },
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      })
    }

    fire(0.25, { spread: 26, startVelocity: 55, colors: ['#6ee7b7', '#818cf8'] })
    fire(0.2, { spread: 60, colors: ['#fbbf24', '#f472b6'] })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#6ee7b7', '#818cf8', '#fbbf24'] })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1, { spread: 120, startVelocity: 45 })
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-3xl p-8 max-w-md w-full text-center animate-scale-in">
        <div className="text-6xl mb-4">{isPlanComplete ? '🏆' : '🎉'}</div>
        <h2 className="font-display text-3xl font-bold mb-3">
          {isPlanComplete ? 'Plan Complete!' : 'Goal Cleared!'}
        </h2>
        <p className="text-gray-400 mb-2 text-lg">
          {isPlanComplete
            ? "You've completed your entire Solu plan!"
            : `You've fully paid off`}
        </p>
        {!isPlanComplete && (
          <p className="text-accent font-bold text-xl mb-2">{goalName}</p>
        )}
        <p className="text-gray-500 text-sm mb-8">
          {isPlanComplete
            ? 'This plan will be archived. Time to start a new chapter!'
            : 'Keep going — you\'re making incredible progress!'}
        </p>
        <button className="btn-primary w-full justify-center text-base py-3" onClick={onClose}>
          {isPlanComplete ? 'Archive & Start New Plan' : 'Keep Going! 💪'}
        </button>
      </div>
    </div>
  )
}
