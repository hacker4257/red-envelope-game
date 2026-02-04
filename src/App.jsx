import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [gameState, setGameState] = useState('start') // start, playing, gameOver
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [basketX, setBasketX] = useState(0)
  const [fallingItems, setFallingItems] = useState([])
  const gameContainerRef = useRef(null)
  const animationRef = useRef(null)
  const itemIdRef = useRef(0)

  // 开始游戏
  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setTimeLeft(60)
    setFallingItems([])
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
      let x = e.clientX - rect.left - 50
      x = Math.max(0, Math.min(x, rect.width - 100))
      setBasketX(x)
    }

    const handleTouchMove = (e) => {
      if (gameState !== 'playing' || !gameContainerRef.current) return
      e.preventDefault()
      const rect = gameContainerRef.current.getBoundingClientRect()
      let x = e.touches[0].clientX - rect.left - 50
      x = Math.max(0, Math.min(x, rect.width - 100))
      setBasketX(x)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [gameState])

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

  // 生成掉落物品
  useEffect(() => {
    if (gameState !== 'playing') return

    const spawnInterval = setInterval(() => {
      const newItem = {
        id: itemIdRef.current++,
        x: Math.random() * (window.innerWidth > 800 ? 700 : window.innerWidth - 100),
        y: -50,
        speed: 2 + Math.random() * 3,
        isBomb: Math.random() < 0.2,
        rotation: Math.random() * 360,
      }
      setFallingItems((prev) => [...prev, newItem])
    }, 800)

    return () => clearInterval(spawnInterval)
  }, [gameState])

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
        const basketY = window.innerHeight > 600 ? 510 : window.innerHeight - 90
        const remaining = updated.filter((item) => {
          if (
            item.y + 40 >= basketY &&
            item.y <= basketY + 80 &&
            item.x + 40 >= basketX &&
            item.x <= basketX + 100
          ) {
            // 碰撞发生
            if (item.isBomb) {
              setScore((s) => Math.max(0, s - 5))
              setTimeLeft((t) => {
                const next = Math.max(0, t - 5)
                if (next === 0) setGameState('gameOver')
                return next
              })
            } else {
              setScore((s) => s + 10)
            }
            return false
          }
          // 移除超出屏幕的物品
          return item.y < (window.innerHeight > 600 ? 600 : window.innerHeight)
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

  return (
    <div className="game-container" ref={gameContainerRef}>
      {gameState === 'start' && (
        <div className="screen start-screen">
          <h1>🧧 新春接红包 🧧</h1>
          <div className="instructions">
            🎮 移动鼠标接住掉落的红包<br />
            💰 红包 +10分<br />
            💣 炸弹 -5分，-5秒<br />
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
            {fallingItems.map((item) => (
              <div
                key={item.id}
                className="falling-item"
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  transform: `rotate(${item.rotation}deg)`,
                }}
              >
                {item.isBomb ? '💣' : '🧧'}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App
