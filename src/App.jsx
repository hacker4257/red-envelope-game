import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [gameState, setGameState] = useState('start') // start, playing, gameOver
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [fallingItems, setFallingItems] = useState([])
  const [hitEffects, setHitEffects] = useState([])
  const [shake, setShake] = useState(false)
  const gameContainerRef = useRef(null)
  const basketRef = useRef(null)
  const animationRef = useRef(null)
  const spawnTimeoutRef = useRef(null)
  const itemIdRef = useRef(0)
  const fallingItemsRef = useRef([])
  const itemElsRef = useRef(new Map())
  const containerSizeRef = useRef({ width: 800, height: 600 })
  const basketXRef = useRef(0)
  const pendingClientXRef = useRef(null)
  const basketRafRef = useRef(null)
  const hitEffectIdRef = useRef(0)
  const shakeTimeoutRef = useRef(null)
  const scoreRef = useRef(0)
  const timeLeftRef = useRef(60)
  const gameStateRef = useRef('start')

  const basketWidth = 100
  const basketHeight = 80
  const basketBottomOffset = 10

  // 开始游戏
  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setTimeLeft(60)
    fallingItemsRef.current = []
    setFallingItems([])
    setHitEffects([])
    itemIdRef.current = 0
    hitEffectIdRef.current = 0
  }

  // 重新开始
  const restartGame = () => {
    startGame()
  }

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  const updateContainerSize = () => {
    const rect = gameContainerRef.current?.getBoundingClientRect()
    if (!rect) return
    containerSizeRef.current = { width: rect.width, height: rect.height }
  }

  useEffect(() => {
    updateContainerSize()
    window.addEventListener('resize', updateContainerSize)
    return () => window.removeEventListener('resize', updateContainerSize)
  }, [])

  const setBasketXImmediate = (x) => {
    basketXRef.current = x
    if (basketRef.current) basketRef.current.style.transform = `translate3d(${x}px, 0, 0)`
  }

  useEffect(() => {
    if (gameState !== 'playing') return
    updateContainerSize()
    const { width } = containerSizeRef.current
    setBasketXImmediate(Math.max(0, (width - basketWidth) / 2))
  }, [gameState])

  // 鼠标/触摸移动控制篮子（用 RAF 合并事件，减少手机卡顿）
  useEffect(() => {
    if (gameState !== 'playing') return

    const scheduleApply = () => {
      if (basketRafRef.current) return
      basketRafRef.current = requestAnimationFrame(() => {
        basketRafRef.current = null
        if (!gameContainerRef.current) return

        const clientX = pendingClientXRef.current
        if (clientX == null) return
        pendingClientXRef.current = null

        const rect = gameContainerRef.current.getBoundingClientRect()
        let x = clientX - rect.left - basketWidth / 2
        x = Math.max(0, Math.min(x, rect.width - basketWidth))
        setBasketXImmediate(x)
      })
    }

    const handleMouseMove = (e) => {
      pendingClientXRef.current = e.clientX
      scheduleApply()
    }

    const handleTouchMove = (e) => {
      if (e.cancelable) e.preventDefault()
      pendingClientXRef.current = e.touches[0].clientX
      scheduleApply()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      if (basketRafRef.current) cancelAnimationFrame(basketRafRef.current)
      basketRafRef.current = null
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
    const progress = 1 - timeLeftRef.current / 60
    const scoreFactor = Math.min(scoreRef.current / 200, 1)
    const value = 1 + progress * 1.6 + scoreFactor * 1.4
    return Math.max(1, Math.min(value, 4))
  }

  // 生成掉落物品
  useEffect(() => {
    if (gameState !== 'playing') return

    const spawnOne = () => {
      if (gameStateRef.current !== 'playing') return
      if (fallingItemsRef.current.length > 28) return

      updateContainerSize()
      const { width: containerWidth } = containerSizeRef.current

      const difficulty = getDifficulty()
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

      const next = [...fallingItemsRef.current, newItem]
      fallingItemsRef.current = next
      setFallingItems(next)
    }

    const schedule = () => {
      if (gameStateRef.current !== 'playing') return
      const difficulty = getDifficulty()
      const spawnMs = Math.max(260, Math.round(820 - (difficulty - 1) * 170))
      spawnTimeoutRef.current = setTimeout(() => {
        spawnOne()
        schedule()
      }, spawnMs)
    }

    schedule()

    return () => {
      if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current)
      spawnTimeoutRef.current = null
    }
  }, [gameState])

  // 更新掉落物品位置和碰撞检测
  useEffect(() => {
    if (gameState !== 'playing') return

    const animate = () => {
      const items = fallingItemsRef.current
      if (items.length) {
        const { width: containerWidth, height: containerHeight } = containerSizeRef.current
        const basketX = basketXRef.current
        const basketY = containerHeight - (basketHeight + basketBottomOffset)

        let removedAny = false
        let scoreDelta = 0
        let timeDelta = 0
        let hadBadHit = false
        let vibrateBad = false
        let vibrateGold = false

        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i]
          const itemSize = item.size ?? 40

          item.y += item.speed
          item.rotation += 2

          const el = itemElsRef.current.get(item.id)
          if (el) {
            el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rotation}deg)`
          }

          const collided =
            item.y + itemSize >= basketY &&
            item.y <= basketY + basketHeight &&
            item.x + itemSize >= basketX &&
            item.x <= basketX + basketWidth

          if (collided) {
            const effectX = Math.max(10, Math.min(item.x + itemSize / 2, containerWidth - 10))
            const effectY = basketY - 10

            scoreDelta += item.points
            if (item.points >= 0) {
              addHitEffect({
                x: effectX,
                y: effectY,
                text: `+${item.points}`,
                kind: item.type === 'gold' ? 'gold' : 'good',
              })
              if (item.type === 'gold') vibrateGold = true
            } else {
              addHitEffect({ x: effectX, y: effectY, text: `${item.points}`, kind: 'bad' })
              hadBadHit = true
              vibrateBad = true
            }

            if (item.timeDelta) {
              timeDelta += item.timeDelta
              addHitEffect({
                x: effectX,
                y: effectY + 20,
                text: `${item.timeDelta}s`,
                kind: item.timeDelta < 0 ? 'bad' : 'good',
              })
            }

            items.splice(i, 1)
            removedAny = true
            continue
          }

          if (item.y > containerHeight + 120) {
            items.splice(i, 1)
            removedAny = true
          }
        }

        if (scoreDelta) {
          setScore((s) => Math.max(0, s + scoreDelta))
        }

        if (timeDelta) {
          setTimeLeft((t) => {
            const next = Math.max(0, t + timeDelta)
            if (next === 0) setGameState('gameOver')
            return next
          })
        }

        if (hadBadHit) triggerShake()
        if (vibrateBad && navigator?.vibrate) navigator.vibrate(120)
        if (vibrateGold && navigator?.vibrate) navigator.vibrate([20, 40, 20])

        if (removedAny) {
          const next = [...items]
          fallingItemsRef.current = next
          setFallingItems(next)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState])

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
          <div className="basket" ref={basketRef}>
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
                ref={(el) => {
                  if (el) itemElsRef.current.set(item.id, el)
                  else itemElsRef.current.delete(item.id)
                }}
                style={{
                  transform: `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rotation}deg)`,
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
