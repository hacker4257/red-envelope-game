import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [gameState, setGameState] = useState('start') // start, playing, gameOver
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [basketX, setBasketX] = useState(0)
  const [fallingItems, setFallingItems] = useState([])
  const [hitEffects, setHitEffects] = useState([])
  const [shake, setShake] = useState(false)
  const gameContainerRef = useRef(null)
  const animationRef = useRef(null)
  const itemIdRef = useRef(0)
  const hitEffectIdRef = useRef(0)
  const shakeTimeoutRef = useRef(null)

  // 开始游戏
  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setTimeLeft(60)
    setFallingItems([])
    setHitEffects([])
    itemIdRef.current = 0
  }

  // 重新开始
  const restartGame = () => {
    startGame()
  }

  // 鼠标移动控制篮子
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (gameState !== 'playing' || !gameContainerRef.current) return
      const rect = gameContainerRef.current.getBoundingClientRect()
      const basketWidth = 100
      let x = e.clientX - rect.left - basketWidth / 2
      x = Math.max(0, Math.min(x, rect.width - basketWidth))
      setBasketX(x)
    }

    const handleTouchMove = (e) => {
      if (gameState !== 'playing' || !gameContainerRef.current) return
      e.preventDefault()
      const rect = gameContainerRef.current.getBoundingClientRect()
      const basketWidth = 100
      let x = e.touches[0].clientX - rect.left - basketWidth / 2
      x = Math.max(0, Math.min(x, rect.width - basketWidth))
      setBasketX(x)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [gameState])

  const triggerShake = () => {
    setShake(true)
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current)
    shakeTimeoutRef.current = setTimeout(() => setShake(false), 250)
  }

  const addHitEffect = ({ x, y, text, kind }) => {
    const id = hitEffectIdRef.current++
    setHitEffects((prev) => [...prev, { id, x, y, text, kind }])
    setTimeout(() => {
      setHitEffects((prev) => prev.filter((e) => e.id !== id))
    }, 700)
  }

  // 倒计时
  useEffect(() => {
    if (gameState !== 'playing') return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('gameOver')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState])

  const getDifficulty = () => {
    const progress = 1 - timeLeft / 60
    const scoreFactor = Math.min(score / 200, 1)
    const value = 1 + progress * 1.6 + scoreFactor * 1.4
    return Math.max(1, Math.min(value, 4))
  }

  // 生成掉落物品
  useEffect(() => {
    if (gameState !== 'playing') return

    const difficulty = getDifficulty()
    const spawnMs = Math.max(260, Math.round(820 - (difficulty - 1) * 170))

    const spawnInterval = setInterval(() => {
      const rect = gameContainerRef.current?.getBoundingClientRect()
      const containerWidth = rect?.width ?? (window.innerWidth > 800 ? 800 : window.innerWidth)

      const bombChance = Math.min(0.38, 0.18 + (difficulty - 1) * 0.05)
      const superBombChance = Math.min(0.07, 0.01 + (difficulty - 1) * 0.015)
      const goldChance = Math.min(0.14, 0.05 + (difficulty - 1) * 0.02)

      const roll = Math.random()
      let type = 'red'
      if (roll < superBombChance) type = 'superBomb'
      else if (roll < superBombChance + bombChance) type = 'bomb'
      else if (roll < superBombChance + bombChance + goldChance) type = 'gold'

      const itemSize = type === 'gold' ? 34 : type === 'superBomb' ? 48 : 40
      const maxX = Math.max(0, containerWidth - itemSize - 10)

      const speedBase = 2 + (difficulty - 1) * 1.1
      const speedJitter = 2.6 + (difficulty - 1) * 1.2 + (type === 'gold' ? 1.4 : 0)

      const points =
        type === 'gold' ? 30 : type === 'bomb' ? -5 : type === 'superBomb' ? -15 : 10
      const timeDelta = type === 'bomb' ? -5 : type === 'superBomb' ? -10 : 0

      const newItem = {
        id: itemIdRef.current++,
        type,
        points,
        timeDelta,
        size: itemSize,
        x: Math.random() * maxX,
        y: -50,
        speed: speedBase + Math.random() * speedJitter,
        rotation: Math.random() * 360,
      }
      setFallingItems((prev) => [...prev, newItem])
    }, spawnMs)

    return () => clearInterval(spawnInterval)
  }, [gameState, score, timeLeft])

  // 更新掉落物品位置和碰撞检测
  useEffect(() => {
    if (gameState !== 'playing') return

    const animate = () => {
      setFallingItems((prev) => {
        const updated = prev.map((item) => ({
          ...item,
          y: item.y + item.speed,
          rotation: item.rotation + 2,
        }))

        // 碰撞检测
        const rect = gameContainerRef.current?.getBoundingClientRect()
        const containerHeight = rect?.height ?? (window.innerHeight > 600 ? 600 : window.innerHeight)
        const basketY = containerHeight - 90
        const basketWidth = 100
        const basketHeight = 80

        const remaining = updated.filter((item) => {
          const itemSize = item.size ?? 40
          if (
            item.y + itemSize >= basketY &&
            item.y <= basketY + basketHeight &&
            item.x + itemSize >= basketX &&
            item.x <= basketX + basketWidth
          ) {
            // 碰撞发生
            const effectX = Math.max(10, Math.min(item.x, basketX + basketWidth / 2))
            const effectY = basketY - 10

            if (item.points >= 0) {
              setScore((s) => s + item.points)
              addHitEffect({
                x: effectX,
                y: effectY,
                text: `+${item.points}`,
                kind: item.type === 'gold' ? 'gold' : 'good',
              })
              if (item.type === 'gold' && navigator?.vibrate) navigator.vibrate([20, 40, 20])
            } else {
              setScore((s) => Math.max(0, s + item.points))
              addHitEffect({ x: effectX, y: effectY, text: `${item.points}`, kind: 'bad' })
              triggerShake()
              if (navigator?.vibrate) navigator.vibrate(120)
            }

            if (item.timeDelta) {
              setTimeLeft((t) => {
                const next = Math.max(0, t + item.timeDelta)
                if (next === 0) setGameState('gameOver')
                return next
              })
              addHitEffect({
                x: effectX,
                y: effectY + 20,
                text: `${item.timeDelta}s`,
                kind: item.timeDelta < 0 ? 'bad' : 'good',
              })
            }

            return false
          }
          // 移除超出屏幕的物品
          return item.y < containerHeight
        })

        return remaining
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, basketX])

  // 获取评价
  const getScoreMessage = () => {
    if (score >= 200) return '🎉 财神附体！'
    if (score >= 150) return '🌟 大吉大利！'
    if (score >= 100) return '👍 福星高照！'
    if (score >= 50) return '😊 新年快乐！'
    return '💪 再接再厉！'
  }

  const getItemEmoji = (item) => {
    if (item.type === 'bomb') return '💣'
    if (item.type === 'superBomb') return '💥'
    return '🧧'
  }

  return (
    <div className={`game-container ${shake ? 'shake' : ''}`} ref={gameContainerRef}>
      {gameState === 'start' && (
        <div className="screen start-screen">
          <h1>🧧 新春接红包 🧧</h1>
          <div className="instructions">
            🎮 移动鼠标接住掉落的红包<br />
            💰 红包 +10分<br />
            ✨ 金色红包 +30分（更快更难）<br />
            💣 炸弹 -5分，-5秒<br />
            💥 超级炸弹 -15分，-10秒<br />
            ⏰ 60秒内尽可能多得分！
          </div>
          <button className="btn" onClick={startGame}>
            开始游戏
          </button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="screen game-over-screen">
          <h1>🎊 游戏结束 🎊</h1>
          <div className="final-score">
            {getScoreMessage()}
            <br />
            最终得分: {score}
          </div>
          <button className="btn" onClick={restartGame}>
            再玩一次
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="score">得分: {score}</div>
          <div className="timer">时间: {timeLeft}</div>
          <div className="basket" style={{ left: `${basketX}px` }}>
            🧺
          </div>
          <div className="game-area">
            {hitEffects.map((e) => (
              <div
                key={e.id}
                className={`hit-effect ${e.kind}`}
                style={{ left: `${e.x}px`, top: `${e.y}px` }}
              >
                {e.text}
              </div>
            ))}
            {fallingItems.map((item) => (
              <div
                key={item.id}
                className={`falling-item ${item.type}`}
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  transform: `rotate(${item.rotation}deg)`,
                  fontSize: `${item.size ?? 40}px`,
                }}
              >
                {getItemEmoji(item)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App
