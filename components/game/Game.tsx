"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface Building {
  x: number
  width: number
  height: number
  color: string
  windows: { x: number; y: number }[]
  isSkyscraper: boolean
}

interface Dog {
  x: number
  y: number
  frame: number
  speed: number
  direction: 1 | -1
  color: string
  legPhase: number
}

interface Raindrop {
  x: number
  y: number
  speed: number
  length: number
}

interface Obstacle {
  x: number
  y: number
  type: "pothole" | "cow" | "barricade" | "schoolvan" | "zebracrossing"
  size?: number // For varied pothole sizes
  lane?: number // For lane-specific obstacles like barricades
}

interface BusStop {
  x: number
  peopleCount: number
  busArriving: boolean
}

interface ZebraCrossing {
  x: number
  signalState: "red" | "green"
  signalTimer: number
  hasPassed: boolean
}

interface SideVehicle {
  x: number
  y: number
  type: "car" | "bus" | "truck"
  color: string
  speed: number
  lane: number
  honking: boolean
  honkTimer: number
}

interface Notification {
  text: string
  timer: number
  color: string
}

interface Landmark {
  type: "residential" | "school" | "hospital" | "garden" | "market"
  startScore: number
}

interface WaterClog {
  x: number
  y: number
  width: number
  wavePhase: number
  lane: number // 0 = top lane, 1 = bottom lane
}

interface Vendor {
  x: number
  y: number
  type: "chaiwallah" | "fruitseller" | "newspaper" | "samosa" | "flowers"
  frame: number
  actionPhase: number
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  const gameRef = useRef({
    autoX: 150,
    autoY: 0,
    autoVelocityY: 0,
    isJumping: false,
    buildings: [] as Building[],
    farBuildings: [] as Building[],
    dogs: [] as Dog[],
    raindrops: [] as Raindrop[],
    obstacles: [] as Obstacle[],
    vendors: [] as Vendor[],
    waterClogs: [] as WaterClog[],
    sideVehicles: [] as SideVehicle[],
    busStops: [] as BusStop[],
    zebraCrossings: [] as ZebraCrossing[],
    groundOffset: 0,
    speed: 5,
    baseSpeed: 5,
    isBraking: false,
    score: 0,
    // Weather system - progressive transition
    weatherState: "sunny" as "sunny" | "cloudy" | "darkening" | "drizzle" | "raining",
    cloudDarkness: 0, // 0-1 for gradual darkening
    isRaining: false,
    rainTimer: 0,
    rainDuration: 0,
    nextRainTime: 400, // Later rain start
    rainWarningGiven: false,
    lastDogSpawn: 0,
    lastCowSpawn: 0,
    lastPotholeSpawn: 0,
    lastVehicleSpawn: 0,
    lastBarricadeSpawn: 0,
    lastBusStopSpawn: 0,
    lastZebraCrossingSpawn: 0,
    currentLane: 0, // 0 = top, 1 = bottom
    waterClogTimer: 0,
    autoFrame: 0,
    wheelRotation: 0,
    // Traffic signal and game start
    trafficSignal: "red" as "red" | "yellow" | "green",
    signalTimer: 0,
    gameStarted: false,
    // Notifications
    notifications: [] as Notification[],
    // Difficulty level and landmarks
    currentLevel: 1,
    currentLandmark: { type: "residential", startScore: 0 } as Landmark,
    nextLandmarkScore: 500,
    // Time of day for visual ambiance
    timeOfDay: 0, // 0 = morning, increases over time
  })

  const jump = useCallback(() => {
    const game = gameRef.current
    if (!game.isJumping && gameState === "playing") {
      game.isJumping = true
      game.autoVelocityY = -15
    }
  }, [gameState])

  const startGame = useCallback(() => {
    const game = gameRef.current
    game.autoY = 0
    game.autoVelocityY = 0
    game.isJumping = false
    game.buildings = []
    game.farBuildings = []
    game.dogs = []
    game.raindrops = []
    game.obstacles = []
    game.vendors = []
    game.waterClogs = []
    game.sideVehicles = []
    game.busStops = []
    game.zebraCrossings = []
    game.groundOffset = 0
    game.speed = 0 // Start at 0, will accelerate after green light
    game.baseSpeed = 5
    game.isBraking = false
    game.score = 0
    // Weather reset - start sunny morning
    game.weatherState = "sunny"
    game.cloudDarkness = 0
    game.isRaining = false
    game.rainTimer = 0
    game.nextRainTime = 500 + Math.random() * 200 // Rain comes later
    game.rainWarningGiven = false
    game.lastDogSpawn = 0
    game.lastCowSpawn = 0
    game.lastPotholeSpawn = 0
    game.lastVehicleSpawn = 0
    game.lastBarricadeSpawn = 0
    game.lastBusStopSpawn = 0
    game.lastZebraCrossingSpawn = 0
    game.currentLane = 0
    game.waterClogTimer = 0
    game.timeOfDay = 0
    // Traffic signal reset
    game.trafficSignal = "red"
    game.signalTimer = 0
    game.gameStarted = false
    // Notifications
    game.notifications = []
    // Level reset
    game.currentLevel = 1
    game.currentLandmark = { type: "residential", startScore: 0 }
    game.nextLandmarkScore = 500
    setScore(0)
    setGameState("playing")
  }, [])

  const switchLane = useCallback(() => {
    const game = gameRef.current
    if (gameState === "playing") {
      game.currentLane = game.currentLane === 0 ? 1 : 0
    }
  }, [gameState])

  const startBraking = useCallback(() => {
    const game = gameRef.current
    if (gameState === "playing") {
      game.isBraking = true
    }
  }, [gameState])

  const stopBraking = useCallback(() => {
    const game = gameRef.current
    game.isBraking = false
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        if (gameState === "start" || gameState === "gameover") {
          startGame()
        } else {
          jump()
        }
      }
      // Arrow Down or S to switch lanes
      if ((e.code === "ArrowDown" || e.code === "KeyS") && gameState === "playing") {
        e.preventDefault()
        switchLane()
      }
      // Arrow Left or B to brake
      if ((e.code === "ArrowLeft" || e.code === "KeyB") && gameState === "playing") {
        e.preventDefault()
        startBraking()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release brake
      if (e.code === "ArrowLeft" || e.code === "KeyB") {
        stopBraking()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (gameState === "start" || gameState === "gameover") {
        startGame()
      } else {
        const touch = e.touches[0]
        const screenHeight = window.innerHeight
        const screenWidth = window.innerWidth
        
        // Left third of screen = brake
        if (touch.clientX < screenWidth / 3) {
          startBraking()
        }
        // Bottom half = switch lane
        else if (touch.clientY > screenHeight / 2) {
          switchLane()
        }
        // Top half = jump
        else {
          jump()
        }
      }
    }

    const handleTouchEnd = () => {
      stopBraking()
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("touchend", handleTouchEnd)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [gameState, jump, startGame, switchLane, startBraking, stopBraking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const game = gameRef.current
    const GROUND_Y = canvas.height - 80
    const FOOTPATH_HEIGHT = 40

    // Initialize buildings
    const initBuildings = () => {
      // Far buildings (skyscrapers in background)
      for (let i = 0; i < 8; i++) {
        const height = Math.random() * 200 + 150
        game.farBuildings.push({
          x: i * 120,
          width: Math.random() * 60 + 80,
          height,
          color: `hsl(220, ${Math.random() * 10 + 5}%, ${Math.random() * 15 + 20}%)`,
          windows: generateWindows(80, height),
          isSkyscraper: true,
        })
      }

      // Near buildings
      for (let i = 0; i < 6; i++) {
        const height = Math.random() * 120 + 80
        game.buildings.push({
          x: i * 150,
          width: Math.random() * 80 + 60,
          height,
          color: `hsl(${Math.random() * 40 + 20}, ${Math.random() * 30 + 20}%, ${Math.random() * 20 + 30}%)`,
          windows: generateWindows(70, height),
          isSkyscraper: false,
        })
      }
    }

    const generateWindows = (buildingWidth: number, buildingHeight: number) => {
      const windows: { x: number; y: number }[] = []
      const cols = Math.floor(buildingWidth / 20)
      const rows = Math.floor(buildingHeight / 25)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (Math.random() > 0.3) {
            windows.push({ x: col * 18 + 8, y: row * 22 + 15 })
          }
        }
      }
      return windows
    }

    // Initialize dogs
    const spawnDog = () => {
      const colors = ["#8B4513", "#D2691E", "#F4A460", "#2F1810", "#FFDAB9"]
      game.dogs.push({
        x: canvas.width + Math.random() * 100,
        y: GROUND_Y - FOOTPATH_HEIGHT + 5 + Math.random() * 15,
        frame: 0,
        speed: Math.random() * 2 + 1.5,
        direction: Math.random() > 0.3 ? -1 : 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        legPhase: Math.random() * Math.PI * 2,
      })
    }

    // Initialize vendors on footpath
    const spawnVendor = (initialX?: number) => {
      const types: Vendor["type"][] = ["chaiwallah", "fruitseller", "newspaper", "samosa", "flowers"]
      game.vendors.push({
        x: initialX ?? canvas.width + Math.random() * 200,
        y: GROUND_Y - FOOTPATH_HEIGHT + 5,
        type: types[Math.floor(Math.random() * types.length)],
        frame: 0,
        actionPhase: Math.random() * Math.PI * 2,
      })
    }

    if (game.buildings.length === 0) {
      initBuildings()
      // Start with just 1 dog
      spawnDog()
      // Spawn initial vendors at intervals
      for (let i = 0; i < 4; i++) {
        spawnVendor(200 + i * 250)
      }
    }

    // Spawn obstacle - progressive difficulty based on score/level
    const spawnObstacle = () => {
      game.lastCowSpawn++
      game.lastPotholeSpawn++
      game.lastBarricadeSpawn++
      
      const level = game.currentLevel
      const random = Math.random()
      let type: "pothole" | "cow" | "barricade"
      let size = 1
      let lane: number | undefined = undefined
      
      // Progressive difficulty:
      // Level 1 (0-500): Mostly barricades, few dogs on footpath
      // Level 2 (500-1500): Add cows occasionally
      // Level 3 (1500-3000): More potholes, thicker traffic
      // Level 4 (3000+): Everything intensifies - potholes + heavy traffic
      
      if (level >= 2 && random < 0.06 && game.lastCowSpawn > 600 + Math.random() * 600) {
        type = "cow"
        game.lastCowSpawn = 0
      }
      // Barricades - lane specific (more common at all levels)
      else if (random < 0.35 && game.lastBarricadeSpawn > 150 + Math.random() * 200) {
        type = "barricade"
        lane = Math.random() > 0.5 ? 0 : 1 // Random lane
        game.lastBarricadeSpawn = 0
      }
      // Potholes - increase with level
      else if (level >= 3 && random < 0.5 && game.lastPotholeSpawn > (150 - level * 20) + Math.random() * 200) {
        type = "pothole"
        size = 0.6 + Math.random() * 0.8
        game.lastPotholeSpawn = 0
      }
      else {
        return // Skip spawning for natural feel
      }
      
      game.obstacles.push({
        x: canvas.width + 50,
        y: GROUND_Y,
        type: type,
        size: size,
        lane: lane,
      })
    }

    // Spawn side vehicles (cars, buses, trucks from opposite direction)
    const spawnSideVehicle = () => {
      const types: SideVehicle["type"][] = ["car", "car", "car", "bus", "truck"] // More cars
      const type = types[Math.floor(Math.random() * types.length)]
      const carColors = ["#DC143C", "#4169E1", "#FFD700", "#32CD32", "#FF6347", "#9400D3", "#1E90FF", "#FF4500"]
      const truckColors = ["#4682B4", "#8B4513", "#2F4F4F"]
      
      let color: string
      if (type === "car") {
        color = carColors[Math.floor(Math.random() * carColors.length)]
      } else if (type === "bus") {
        color = "#B22222" // Always red BEST bus
      } else {
        color = truckColors[Math.floor(Math.random() * truckColors.length)]
      }
      
      // Spawn from right side, moving left (opposite traffic)
      const lane = Math.random() > 0.6 ? 1 : 0 // Mostly in opposite lane
      game.sideVehicles.push({
        x: canvas.width + 100,
        y: GROUND_Y + (lane === 0 ? 10 : 45),
        type: type,
        color: color,
        speed: game.speed * (1.5 + Math.random() * 1), // Faster than player
        lane: lane,
        honking: Math.random() > 0.7,
        honkTimer: 0,
      })
    }

    // Draw autorickshaw
    const drawAutorickshaw = (x: number, y: number) => {
      // Lane offset: lane 0 = top of road, lane 1 = bottom of road
      const laneOffset = game.currentLane * 25
      const baseY = GROUND_Y - 45 + y + laneOffset
      game.wheelRotation += game.speed * 0.1
      game.autoFrame++

      // Bounce effect
      const bounce = Math.sin(game.autoFrame * 0.3) * 2

      ctx.save()
      ctx.translate(x, baseY + bounce)

      // Exhaust smoke
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(150, 150, 150, ${0.3 - i * 0.1})`
        ctx.beginPath()
        ctx.arc(-35 - i * 15 - Math.sin(game.autoFrame * 0.1 + i) * 5, 10 + i * 5, 5 + i * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Back wheel
      ctx.fillStyle = "#1a1a1a"
      ctx.beginPath()
      ctx.arc(-20, 35, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#333"
      ctx.lineWidth = 3
      ctx.stroke()

      // Front wheel
      ctx.beginPath()
      ctx.arc(35, 35, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Wheel spokes
      ctx.strokeStyle = "#666"
      ctx.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        const angle = game.wheelRotation + (i * Math.PI) / 3
        ctx.beginPath()
        ctx.moveTo(-20, 35)
        ctx.lineTo(-20 + Math.cos(angle) * 8, 35 + Math.sin(angle) * 8)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(35, 35)
        ctx.lineTo(35 + Math.cos(angle) * 8, 35 + Math.sin(angle) * 8)
        ctx.stroke()
      }

      // Body - iconic yellow/green
      ctx.fillStyle = "#FFD700"
      ctx.beginPath()
      ctx.moveTo(-30, 30)
      ctx.lineTo(-30, -10)
      ctx.quadraticCurveTo(-25, -25, -10, -30)
      ctx.lineTo(30, -30)
      ctx.quadraticCurveTo(45, -25, 50, -10)
      ctx.lineTo(50, 30)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = "#B8860B"
      ctx.lineWidth = 2
      ctx.stroke()

      // Roof
      ctx.fillStyle = "#228B22"
      ctx.beginPath()
      ctx.moveTo(-25, -30)
      ctx.quadraticCurveTo(10, -50, 45, -30)
      ctx.lineTo(40, -30)
      ctx.quadraticCurveTo(10, -45, -20, -30)
      ctx.closePath()
      ctx.fill()

      // Windshield
      ctx.fillStyle = "rgba(135, 206, 250, 0.7)"
      ctx.fillRect(30, -25, 18, 25)
      ctx.strokeStyle = "#333"
      ctx.strokeRect(30, -25, 18, 25)

      // Headlight
      ctx.fillStyle = "#FFFF99"
      ctx.beginPath()
      ctx.arc(48, 10, 5, 0, Math.PI * 2)
      ctx.fill()

      // Light beam effect
      ctx.fillStyle = "rgba(255, 255, 150, 0.1)"
      ctx.beginPath()
      ctx.moveTo(53, 10)
      ctx.lineTo(100, -10)
      ctx.lineTo(100, 30)
      ctx.closePath()
      ctx.fill()

      // Driver silhouette
      ctx.fillStyle = "#333"
      ctx.beginPath()
      ctx.arc(10, -10, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(5, -2, 10, 15)

      ctx.restore()
    }

    // Draw dog
    const drawDog = (dog: Dog) => {
      ctx.save()
      ctx.translate(dog.x, dog.y)
      if (dog.direction === 1) {
        ctx.scale(-1, 1)
      }

      const legOffset = Math.sin(dog.legPhase) * 8

      // Body
      ctx.fillStyle = dog.color
      ctx.beginPath()
      ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2)
      ctx.fill()

      // Head
      ctx.beginPath()
      ctx.ellipse(18, -5, 10, 8, 0, 0, Math.PI * 2)
      ctx.fill()

      // Snout
      ctx.fillStyle = dog.color
      ctx.beginPath()
      ctx.ellipse(26, -3, 6, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Ears
      ctx.beginPath()
      ctx.ellipse(14, -12, 4, 6, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(20, -11, 4, 6, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Eye
      ctx.fillStyle = "#000"
      ctx.beginPath()
      ctx.arc(22, -6, 2, 0, Math.PI * 2)
      ctx.fill()

      // Nose
      ctx.beginPath()
      ctx.arc(30, -3, 2, 0, Math.PI * 2)
      ctx.fill()

      // Legs
      ctx.fillStyle = dog.color
      ctx.fillRect(-12, 8, 5, 12 + legOffset)
      ctx.fillRect(-2, 8, 5, 12 - legOffset)
      ctx.fillRect(8, 8, 5, 12 + legOffset)
      ctx.fillRect(15, 8, 5, 12 - legOffset)

      // Tail
      ctx.beginPath()
      ctx.moveTo(-18, -2)
      ctx.quadraticCurveTo(-28, -15 + Math.sin(dog.legPhase * 2) * 5, -25, -10)
      ctx.lineWidth = 3
      ctx.strokeStyle = dog.color
      ctx.stroke()

      ctx.restore()
    }

    // Draw vendor
    const drawVendor = (vendor: Vendor) => {
      ctx.save()
      ctx.translate(vendor.x, vendor.y)
      vendor.frame++
      vendor.actionPhase += 0.05

      const bobble = Math.sin(vendor.actionPhase) * 2

      switch (vendor.type) {
        case "chaiwallah":
          // Cart/stall
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(-25, 0, 50, 25)
          ctx.fillStyle = "#654321"
          ctx.fillRect(-25, 25, 50, 5)
          
          // Wheels
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.arc(-18, 32, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(18, 32, 6, 0, Math.PI * 2)
          ctx.fill()
          
          // Kettle/pot
          ctx.fillStyle = "#C0C0C0"
          ctx.beginPath()
          ctx.arc(-5, -5, 12, 0, Math.PI * 2)
          ctx.fill()
          
          // Steam animation
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 - i * 0.15})`
            ctx.beginPath()
            ctx.arc(-5 + Math.sin(vendor.actionPhase + i) * 3, -20 - i * 8 + bobble, 4 - i, 0, Math.PI * 2)
            ctx.fill()
          }
          
          // Cups
          ctx.fillStyle = "#D2691E"
          ctx.fillRect(10, -2, 8, 10)
          ctx.fillRect(20, -2, 8, 10)
          
          // Vendor person
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(-35, -15 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#8B0000"
          ctx.fillRect(-42, -7 + bobble, 14, 25)
          // Arm pouring
          ctx.fillStyle = "#F5DEB3"
          ctx.fillRect(-28, -5 + bobble, 15, 5)
          break

        case "fruitseller":
          // Cart
          ctx.fillStyle = "#228B22"
          ctx.fillRect(-30, 5, 60, 20)
          
          // Wheels
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.arc(-20, 30, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(20, 30, 6, 0, Math.PI * 2)
          ctx.fill()
          
          // Umbrella
          ctx.fillStyle = "#FF6347"
          ctx.beginPath()
          ctx.arc(0, -35, 35, Math.PI, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(-2, -35, 4, 40)
          
          // Fruits - oranges
          ctx.fillStyle = "#FFA500"
          for (let i = 0; i < 4; i++) {
            ctx.beginPath()
            ctx.arc(-15 + i * 10, 0, 6, 0, Math.PI * 2)
            ctx.fill()
          }
          // Apples
          ctx.fillStyle = "#FF0000"
          for (let i = 0; i < 3; i++) {
            ctx.beginPath()
            ctx.arc(-10 + i * 10, -10, 5, 0, Math.PI * 2)
            ctx.fill()
          }
          // Bananas
          ctx.fillStyle = "#FFE135"
          ctx.beginPath()
          ctx.ellipse(20, -5, 8, 4, 0.3, 0, Math.PI * 2)
          ctx.fill()
          
          // Vendor
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(40, -10 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#4169E1"
          ctx.fillRect(33, -2 + bobble, 14, 25)
          break

        case "newspaper":
          // Stand
          ctx.fillStyle = "#A0522D"
          ctx.fillRect(-20, 0, 40, 30)
          
          // Papers stacked
          ctx.fillStyle = "#F5F5DC"
          for (let i = 0; i < 5; i++) {
            ctx.fillRect(-15 + i * 2, -5 - i * 3, 25, 3)
          }
          
          // Magazine rack
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(-18, -20, 36, 15)
          
          // Colorful magazines
          const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors[i]
            ctx.fillRect(-15 + i * 7, -18, 6, 12)
          }
          
          // Vendor sitting
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(35, 5 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#696969"
          ctx.fillRect(28, 13 + bobble, 14, 20)
          // Reading paper
          ctx.fillStyle = "#F5F5DC"
          ctx.fillRect(20, 8 + bobble, 12, 15)
          break

        case "samosa":
          // Cart with glass case
          ctx.fillStyle = "#CD853F"
          ctx.fillRect(-25, 5, 50, 20)
          
          // Glass case
          ctx.fillStyle = "rgba(200, 230, 255, 0.5)"
          ctx.fillRect(-22, -20, 44, 25)
          ctx.strokeStyle = "#888"
          ctx.strokeRect(-22, -20, 44, 25)
          
          // Samosas inside
          ctx.fillStyle = "#DAA520"
          for (let i = 0; i < 3; i++) {
            ctx.beginPath()
            ctx.moveTo(-12 + i * 12, -5)
            ctx.lineTo(-6 + i * 12, -15)
            ctx.lineTo(0 + i * 12, -5)
            ctx.closePath()
            ctx.fill()
          }
          
          // Frying pan with steam
          ctx.fillStyle = "#2F2F2F"
          ctx.beginPath()
          ctx.ellipse(35, 0, 15, 8, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#DAA520"
          ctx.beginPath()
          ctx.moveTo(30, -3)
          ctx.lineTo(35, -10)
          ctx.lineTo(40, -3)
          ctx.closePath()
          ctx.fill()
          
          // Sizzle/steam
          for (let i = 0; i < 2; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.4 - i * 0.15})`
            ctx.beginPath()
            ctx.arc(35 + Math.sin(vendor.actionPhase * 2 + i) * 4, -15 - i * 6, 3, 0, Math.PI * 2)
            ctx.fill()
          }
          
          // Wheels
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.arc(-18, 30, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(18, 30, 5, 0, Math.PI * 2)
          ctx.fill()
          
          // Vendor
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(-40, -5 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#FFF"
          ctx.fillRect(-47, 3 + bobble, 14, 22)
          // Chef hat
          ctx.fillStyle = "#FFF"
          ctx.fillRect(-45, -18 + bobble, 10, 10)
          break

        case "flowers":
          // Flower basket/cart
          ctx.fillStyle = "#8B4513"
          ctx.beginPath()
          ctx.moveTo(-25, 25)
          ctx.lineTo(-20, 0)
          ctx.lineTo(20, 0)
          ctx.lineTo(25, 25)
          ctx.closePath()
          ctx.fill()
          
          // Colorful flowers
          const flowerColors = ["#FF69B4", "#FF6347", "#FFD700", "#FF4500", "#DA70D6", "#FFA07A"]
          for (let i = 0; i < 12; i++) {
            const fx = -15 + (i % 4) * 10
            const fy = -5 - Math.floor(i / 4) * 10
            ctx.fillStyle = flowerColors[i % flowerColors.length]
            ctx.beginPath()
            ctx.arc(fx, fy + Math.sin(vendor.actionPhase + i) * 1.5, 6, 0, Math.PI * 2)
            ctx.fill()
            // Flower center
            ctx.fillStyle = "#FFD700"
            ctx.beginPath()
            ctx.arc(fx, fy + Math.sin(vendor.actionPhase + i) * 1.5, 2, 0, Math.PI * 2)
            ctx.fill()
          }
          
          // Garland strings
          ctx.strokeStyle = "#FF69B4"
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(-20, -25)
          ctx.quadraticCurveTo(0, -15 + bobble, 20, -25)
          ctx.stroke()
          
          ctx.strokeStyle = "#FFA500"
          ctx.beginPath()
          ctx.moveTo(-18, -30)
          ctx.quadraticCurveTo(0, -22 + bobble, 18, -30)
          ctx.stroke()
          
          // Vendor (woman with flowers)
          ctx.fillStyle = "#F5DEB3"
          ctx.beginPath()
          ctx.arc(40, -5 + bobble, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#FF1493"
          ctx.fillRect(33, 3 + bobble, 14, 22)
          // Flower in hair
          ctx.fillStyle = "#FF6347"
          ctx.beginPath()
          ctx.arc(45, -12 + bobble, 4, 0, Math.PI * 2)
          ctx.fill()
          break
      }

      ctx.restore()
    }

    // Draw raindrop
    const drawRaindrop = (drop: Raindrop) => {
      ctx.strokeStyle = "rgba(174, 194, 224, 0.6)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(drop.x, drop.y)
      ctx.lineTo(drop.x - 2, drop.y + drop.length)
      ctx.stroke()
    }

    // Draw side vehicle (cars, buses, trucks)
    const drawSideVehicle = (vehicle: SideVehicle) => {
      ctx.save()
      ctx.translate(vehicle.x, vehicle.y)
      
      // Flip for opposite direction
      ctx.scale(-1, 1)

      switch (vehicle.type) {
        case "car":
          // Car body
          ctx.fillStyle = vehicle.color
          ctx.beginPath()
          ctx.roundRect(-30, -20, 60, 25, 5)
          ctx.fill()
          
          // Car roof
          ctx.fillStyle = vehicle.color
          ctx.beginPath()
          ctx.roundRect(-15, -32, 30, 15, 3)
          ctx.fill()
          
          // Windows
          ctx.fillStyle = "rgba(135, 206, 250, 0.8)"
          ctx.fillRect(-12, -30, 10, 10)
          ctx.fillRect(2, -30, 10, 10)
          
          // Wheels
          ctx.fillStyle = "#1a1a1a"
          ctx.beginPath()
          ctx.arc(-18, 8, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(18, 8, 8, 0, Math.PI * 2)
          ctx.fill()
          
          // Headlights
          ctx.fillStyle = "#FFFF99"
          ctx.beginPath()
          ctx.arc(28, -10, 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(28, -5, 3, 0, Math.PI * 2)
          ctx.fill()
          break

        case "bus":
          // Bus body
          ctx.fillStyle = vehicle.color
          ctx.fillRect(-50, -35, 100, 40)
          
          // Bus stripe
          ctx.fillStyle = "#FFF"
          ctx.fillRect(-50, -20, 100, 5)
          
          // Windows
          ctx.fillStyle = "rgba(135, 206, 250, 0.8)"
          for (let i = 0; i < 5; i++) {
            ctx.fillRect(-42 + i * 18, -32, 12, 15)
          }
          
          // Door
          ctx.fillStyle = "#333"
          ctx.fillRect(35, -32, 12, 30)
          
          // Wheels
          ctx.fillStyle = "#1a1a1a"
          ctx.beginPath()
          ctx.arc(-35, 10, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(35, 10, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(10, 10, 10, 0, Math.PI * 2)
          ctx.fill()
          
          // Destination board
          ctx.fillStyle = "#000"
          ctx.fillRect(-45, -42, 60, 8)
          ctx.fillStyle = "#FF6600"
          ctx.font = "6px Arial"
          ctx.fillText("MUMBAI", -40, -36)
          break

        case "truck":
          // Truck cabin
          ctx.fillStyle = vehicle.color
          ctx.fillRect(15, -30, 30, 30)
          
          // Truck container
          ctx.fillStyle = "#696969"
          ctx.fillRect(-45, -35, 60, 35)
          
          // Container details
          ctx.strokeStyle = "#555"
          ctx.lineWidth = 2
          ctx.strokeRect(-45, -35, 60, 35)
          ctx.beginPath()
          ctx.moveTo(-15, -35)
          ctx.lineTo(-15, 0)
          ctx.stroke()
          
          // Cabin window
          ctx.fillStyle = "rgba(135, 206, 250, 0.8)"
          ctx.fillRect(20, -25, 20, 12)
          
          // Wheels
          ctx.fillStyle = "#1a1a1a"
          ctx.beginPath()
          ctx.arc(-30, 10, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(-10, 10, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(30, 10, 10, 0, Math.PI * 2)
          ctx.fill()
          break
      }

      // Honking indicator
      if (vehicle.honking) {
        vehicle.honkTimer++
        if (Math.sin(vehicle.honkTimer * 0.3) > 0) {
          ctx.fillStyle = "rgba(255, 255, 0, 0.6)"
          ctx.font = "bold 12px Arial"
          ctx.scale(-1, 1) // Flip text back
          ctx.fillText("HONK!", -30, -40)
        }
      }

      ctx.restore()
    }

    // Draw water clogging/puddle
    const drawWaterClog = (clog: WaterClog) => {
      ctx.save()
      ctx.translate(clog.x, clog.y)
      clog.wavePhase += 0.08

      // Main water body with wave effect
      const gradient = ctx.createLinearGradient(0, -5, 0, 15)
      gradient.addColorStop(0, "rgba(100, 149, 237, 0.7)")
      gradient.addColorStop(0.5, "rgba(70, 130, 180, 0.8)")
      gradient.addColorStop(1, "rgba(47, 79, 79, 0.9)")
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(-clog.width / 2, 5)
      // Wavy top surface
      for (let i = 0; i <= clog.width; i += 10) {
        const waveY = Math.sin(clog.wavePhase + i * 0.1) * 3
        ctx.lineTo(-clog.width / 2 + i, waveY)
      }
      ctx.lineTo(clog.width / 2, 12)
      ctx.lineTo(-clog.width / 2, 12)
      ctx.closePath()
      ctx.fill()

      // Ripple effects
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"
      ctx.lineWidth = 1
      for (let i = 0; i < 3; i++) {
        const rippleSize = 8 + Math.sin(clog.wavePhase * 1.5 + i * 2) * 4
        ctx.beginPath()
        ctx.ellipse(
          -20 + i * 20 + Math.sin(clog.wavePhase + i) * 5,
          4,
          rippleSize,
          rippleSize * 0.4,
          0,
          0,
          Math.PI * 2
        )
        ctx.stroke()
      }

      // Debris/leaves floating
      ctx.fillStyle = "#556B2F"
      for (let i = 0; i < 2; i++) {
        const leafX = -15 + i * 25 + Math.sin(clog.wavePhase + i * 3) * 8
        const leafY = 2 + Math.cos(clog.wavePhase + i) * 2
        ctx.beginPath()
        ctx.ellipse(leafX, leafY, 4, 2, clog.wavePhase * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Splashing effect on edges
      if (Math.sin(clog.wavePhase * 2) > 0.8) {
        ctx.fillStyle = "rgba(173, 216, 230, 0.6)"
        ctx.beginPath()
        ctx.arc(-clog.width / 2 + 5, -2, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(clog.width / 2 - 5, -1, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Warning reflection/shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.beginPath()
      ctx.ellipse(0, 2, clog.width * 0.3, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }

    // Draw building based on current landmark
    const drawBuilding = (building: Building, isFar: boolean) => {
      const groundBase = GROUND_Y - FOOTPATH_HEIGHT
      const alpha = isFar ? 0.6 : 1
      const landmark = game.currentLandmark.type

      ctx.globalAlpha = alpha

      // Building colors and style based on landmark
      let buildingColor = building.color
      let windowColor = game.isRaining ? "rgba(255, 255, 150, 0.8)" : "rgba(255, 255, 200, 0.5)"
      
      switch (landmark) {
        case "school":
          buildingColor = "#FFF8DC" // Cream color for school
          windowColor = "rgba(135, 206, 250, 0.8)"
          break
        case "hospital":
          buildingColor = "#F0F8FF" // Light blue for hospital
          windowColor = "rgba(255, 255, 255, 0.9)"
          break
        case "garden":
          buildingColor = "#90EE90" // Light green for garden area
          break
        case "market":
          buildingColor = "#DEB887" // Tan for market
          windowColor = "rgba(255, 200, 100, 0.8)"
          break
      }

      // Building body
      ctx.fillStyle = isFar ? building.color : buildingColor
      ctx.fillRect(building.x, groundBase - building.height, building.width, building.height)

      // Windows
      ctx.fillStyle = windowColor
      building.windows.forEach((win) => {
        if (building.x + win.x > 0 && building.x + win.x < canvas.width) {
          ctx.fillRect(building.x + win.x, groundBase - building.height + win.y, 12, 15)
        }
      })

      // Landmark-specific decorations
      if (!isFar) {
        switch (landmark) {
          case "school":
            // School sign
            ctx.fillStyle = "#8B4513"
            ctx.fillRect(building.x + 10, groundBase - building.height - 15, 40, 12)
            ctx.fillStyle = "#FFF"
            ctx.font = "8px Arial"
            ctx.fillText("SCHOOL", building.x + 14, groundBase - building.height - 6)
            // Flag
            ctx.fillStyle = "#FF9933"
            ctx.fillRect(building.x + building.width - 15, groundBase - building.height - 30, 2, 30)
            ctx.fillStyle = "#138808"
            ctx.fillRect(building.x + building.width - 13, groundBase - building.height - 28, 12, 8)
            break
          case "hospital":
            // Red cross
            ctx.fillStyle = "#FF0000"
            ctx.fillRect(building.x + building.width/2 - 15, groundBase - building.height + 10, 30, 10)
            ctx.fillRect(building.x + building.width/2 - 5, groundBase - building.height, 10, 30)
            // Ambulance indicator
            ctx.fillStyle = "#FFF"
            ctx.font = "bold 10px Arial"
            ctx.fillText("HOSPITAL", building.x + 5, groundBase - 10)
            break
          case "garden":
            // Trees
            for (let i = 0; i < 3; i++) {
              const treeX = building.x + 15 + i * 25
              ctx.fillStyle = "#8B4513"
              ctx.fillRect(treeX, groundBase - 40, 8, 40)
              ctx.fillStyle = "#228B22"
              ctx.beginPath()
              ctx.arc(treeX + 4, groundBase - 55, 20, 0, Math.PI * 2)
              ctx.fill()
            }
            // Flowers
            ctx.fillStyle = "#FF69B4"
            for (let i = 0; i < 5; i++) {
              ctx.beginPath()
              ctx.arc(building.x + 10 + i * 15, groundBase - 5, 4, 0, Math.PI * 2)
              ctx.fill()
            }
            break
          case "market":
            // Awning
            ctx.fillStyle = "#FF6347"
            ctx.fillRect(building.x, groundBase - building.height, building.width, 15)
            // Market sign
            ctx.fillStyle = "#FFD700"
            ctx.font = "bold 10px Arial"
            ctx.fillText("BAZAAR", building.x + 10, groundBase - building.height + 12)
            break
        }
      }

      // Building top details for skyscrapers
      if (building.isSkyscraper) {
        ctx.fillStyle = "#444"
        ctx.fillRect(building.x + building.width / 2 - 5, groundBase - building.height - 20, 10, 20)
        ctx.fillStyle = "#f00"
        ctx.beginPath()
        ctx.arc(building.x + building.width / 2, groundBase - building.height - 20, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }
    
    // Draw bus stop on footpath
    const drawBusStop = (busStop: BusStop) => {
      ctx.save()
      ctx.translate(busStop.x, GROUND_Y - FOOTPATH_HEIGHT)
      
      // Bus stop pole
      ctx.fillStyle = "#333"
      ctx.fillRect(-3, -80, 6, 80)
      
      // Bus stop sign
      ctx.fillStyle = "#1E90FF"
      ctx.fillRect(-25, -90, 50, 25)
      ctx.fillStyle = "#FFF"
      ctx.font = "bold 10px Arial"
      ctx.fillText("BUS STOP", -20, -73)
      
      // Bus route number
      ctx.fillStyle = "#FFD700"
      ctx.fillRect(-20, -65, 15, 12)
      ctx.fillStyle = "#000"
      ctx.font = "8px Arial"
      ctx.fillText("101", -18, -56)
      
      // Shelter roof
      ctx.fillStyle = "#4682B4"
      ctx.fillRect(-40, -60, 80, 8)
      
      // Shelter posts
      ctx.fillStyle = "#666"
      ctx.fillRect(-38, -52, 4, 52)
      ctx.fillRect(34, -52, 4, 52)
      
      // Bench
      ctx.fillStyle = "#8B4513"
      ctx.fillRect(-30, -15, 60, 5)
      ctx.fillRect(-28, -10, 4, 10)
      ctx.fillRect(24, -10, 4, 10)
      
      // People waiting (animated)
      const peopleColors = ["#FF6347", "#4169E1", "#32CD32", "#FFD700", "#9932CC"]
      for (let i = 0; i < busStop.peopleCount; i++) {
        const pX = -25 + i * 15
        const bobble = Math.sin(game.autoFrame * 0.1 + i) * 2
        
        // Person body
        ctx.fillStyle = peopleColors[i % peopleColors.length]
        ctx.fillRect(pX - 4, -35 + bobble, 8, 20)
        
        // Head
        ctx.fillStyle = "#F5DEB3"
        ctx.beginPath()
        ctx.arc(pX, -42 + bobble, 6, 0, Math.PI * 2)
        ctx.fill()
        
        // Bag/briefcase for some
        if (i % 2 === 0) {
          ctx.fillStyle = "#8B4513"
          ctx.fillRect(pX + 5, -28 + bobble, 6, 10)
        }
      }
      
      ctx.restore()
    }
    
    // Draw zebra crossing with signal
    const drawZebraCrossing = (crossing: ZebraCrossing) => {
      ctx.save()
      ctx.translate(crossing.x, 0)
      
      // Zebra stripes on road
      ctx.fillStyle = "#FFF"
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(-40 + i * 10, GROUND_Y, 6, 80)
      }
      
      // Crossing signal pole
      ctx.fillStyle = "#333"
      ctx.fillRect(-50, GROUND_Y - 100, 6, 100)
      ctx.fillRect(44, GROUND_Y - 100, 6, 100)
      
      // Signal boxes
      const drawSignalBox = (signalX: number) => {
        ctx.fillStyle = "#222"
        ctx.fillRect(signalX - 12, GROUND_Y - 95, 24, 40)
        
        // Red man / Green man
        if (crossing.signalState === "red") {
          ctx.fillStyle = "#FF0000"
          ctx.beginPath()
          ctx.arc(signalX, GROUND_Y - 82, 8, 0, Math.PI * 2)
          ctx.fill()
          // Standing figure
          ctx.fillRect(signalX - 2, GROUND_Y - 74, 4, 12)
          ctx.fillRect(signalX - 6, GROUND_Y - 62, 12, 3)
        } else {
          ctx.fillStyle = "#00FF00"
          ctx.beginPath()
          ctx.arc(signalX, GROUND_Y - 82, 8, 0, Math.PI * 2)
          ctx.fill()
          // Walking figure
          ctx.fillRect(signalX - 2, GROUND_Y - 74, 4, 10)
          // Legs apart (walking)
          ctx.beginPath()
          ctx.moveTo(signalX - 2, GROUND_Y - 64)
          ctx.lineTo(signalX - 6, GROUND_Y - 58)
          ctx.lineTo(signalX, GROUND_Y - 64)
          ctx.lineTo(signalX + 6, GROUND_Y - 58)
          ctx.lineWidth = 2
          ctx.strokeStyle = "#00FF00"
          ctx.stroke()
        }
      }
      
      drawSignalBox(-47)
      drawSignalBox(47)
      
      // "STOP" warning when signal is red
      if (crossing.signalState === "red" && !crossing.hasPassed) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
        ctx.fillRect(-45, GROUND_Y, 90, 80)
        
        ctx.fillStyle = "#FF0000"
        ctx.font = "bold 16px Arial"
        ctx.fillText("BRAKE!", -25, GROUND_Y + 45)
      }
      
      ctx.restore()
    }
    
    // Draw school crossing sign
    const drawSchoolCrossingSign = (x: number) => {
      ctx.save()
      ctx.translate(x, GROUND_Y - FOOTPATH_HEIGHT)
      
      // Pole
      ctx.fillStyle = "#666"
      ctx.fillRect(-3, -100, 6, 100)
      
      // Yellow diamond sign
      ctx.fillStyle = "#FFD700"
      ctx.save()
      ctx.translate(0, -115)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-20, -20, 40, 40)
      ctx.restore()
      
      // Border
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 2
      ctx.save()
      ctx.translate(0, -115)
      ctx.rotate(Math.PI / 4)
      ctx.strokeRect(-20, -20, 40, 40)
      ctx.restore()
      
      // Children crossing icon
      ctx.fillStyle = "#000"
      // Two figures
      ctx.beginPath()
      ctx.arc(-8, -120, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-10, -116, 4, 8)
      
      ctx.beginPath()
      ctx.arc(5, -118, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(3, -114, 4, 8)
      
      // "SCHOOL" text below
      ctx.fillStyle = "#000"
      ctx.font = "bold 8px Arial"
      ctx.fillText("SCHOOL", -18, -85)
      ctx.fillText("CROSSING", -22, -75)
      
      ctx.restore()
    }
    
    // Draw school van (parked obstacle)
    const drawSchoolVan = (x: number, y: number, lane: number) => {
      ctx.save()
      const laneOffset = lane * 25
      ctx.translate(x, y + laneOffset)
      
      // Van body - yellow school van
      ctx.fillStyle = "#FFD700"
      ctx.fillRect(-35, -35, 70, 35)
      
      // Roof
      ctx.fillStyle = "#FFA500"
      ctx.fillRect(-30, -45, 60, 12)
      
      // Windows
      ctx.fillStyle = "rgba(135, 206, 250, 0.8)"
      ctx.fillRect(-28, -42, 15, 10)
      ctx.fillRect(-8, -42, 15, 10)
      ctx.fillRect(12, -42, 15, 10)
      
      // "SCHOOL" text
      ctx.fillStyle = "#000"
      ctx.font = "bold 10px Arial"
      ctx.fillText("SCHOOL", -22, -20)
      
      // Door
      ctx.fillStyle = "#333"
      ctx.fillRect(20, -30, 12, 25)
      
      // Wheels
      ctx.fillStyle = "#1a1a1a"
      ctx.beginPath()
      ctx.arc(-20, 5, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(20, 5, 8, 0, Math.PI * 2)
      ctx.fill()
      
      // Warning lights (flashing)
      if (Math.sin(game.autoFrame * 0.2) > 0) {
        ctx.fillStyle = "#FF0000"
      } else {
        ctx.fillStyle = "#880000"
      }
      ctx.beginPath()
      ctx.arc(-30, -40, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(30, -40, 4, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()
    }

    // Draw traffic signal
    const drawTrafficSignal = () => {
      const signalX = 80
      const signalY = GROUND_Y - 120
      
      // Pole
      ctx.fillStyle = "#333"
      ctx.fillRect(signalX - 5, signalY, 10, 120)
      
      // Signal box
      ctx.fillStyle = "#222"
      ctx.fillRect(signalX - 20, signalY - 80, 40, 80)
      ctx.strokeStyle = "#444"
      ctx.lineWidth = 2
      ctx.strokeRect(signalX - 20, signalY - 80, 40, 80)
      
      // Red light
      ctx.fillStyle = game.trafficSignal === "red" ? "#FF0000" : "#440000"
      ctx.beginPath()
      ctx.arc(signalX, signalY - 60, 12, 0, Math.PI * 2)
      ctx.fill()
      if (game.trafficSignal === "red") {
        ctx.shadowColor = "#FF0000"
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
      }
      
      // Yellow light
      ctx.fillStyle = game.trafficSignal === "yellow" ? "#FFFF00" : "#444400"
      ctx.beginPath()
      ctx.arc(signalX, signalY - 35, 12, 0, Math.PI * 2)
      ctx.fill()
      if (game.trafficSignal === "yellow") {
        ctx.shadowColor = "#FFFF00"
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
      }
      
      // Green light
      ctx.fillStyle = game.trafficSignal === "green" ? "#00FF00" : "#004400"
      ctx.beginPath()
      ctx.arc(signalX, signalY - 10, 12, 0, Math.PI * 2)
      ctx.fill()
      if (game.trafficSignal === "green") {
        ctx.shadowColor = "#00FF00"
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }
    
    // Draw notification
    const drawNotifications = () => {
      game.notifications = game.notifications.filter(n => n.timer > 0)
      
      game.notifications.forEach((notif, index) => {
        notif.timer--
        const alpha = Math.min(1, notif.timer / 60)
        const yOffset = index * 30
        
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`
        ctx.fillRect(canvas.width / 2 - 150, 70 + yOffset, 300, 25)
        ctx.fillStyle = notif.color
        ctx.globalAlpha = alpha
        ctx.font = "bold 14px Arial"
        ctx.textAlign = "center"
        ctx.fillText(notif.text, canvas.width / 2, 88 + yOffset)
        ctx.textAlign = "left"
        ctx.globalAlpha = 1
      })
    }
    
    // Add notification helper
    const addNotification = (text: string, color: string = "#FFF") => {
      game.notifications.push({ text, timer: 180, color })
    }

    // Draw obstacle
    const drawObstacle = (obstacle: Obstacle) => {
      ctx.save()
      ctx.translate(obstacle.x, obstacle.y)
      
      const size = obstacle.size || 1

      switch (obstacle.type) {
        case "pothole":
          // Varied pothole sizes with more detail
          const potholeWidth = 25 * size
          const potholeHeight = 10 * size
          
          // Outer crack/damage ring
          ctx.fillStyle = "#444"
          ctx.beginPath()
          ctx.ellipse(0, 0, potholeWidth + 5, potholeHeight + 3, 0, 0, Math.PI * 2)
          ctx.fill()
          
          // Main pothole
          ctx.fillStyle = "#333"
          ctx.beginPath()
          ctx.ellipse(0, 0, potholeWidth, potholeHeight, 0, 0, Math.PI * 2)
          ctx.fill()
          
          // Inner depth
          ctx.fillStyle = "#1a1a1a"
          ctx.beginPath()
          ctx.ellipse(0, 0, potholeWidth * 0.7, potholeHeight * 0.7, 0, 0, Math.PI * 2)
          ctx.fill()
          
          // Water in pothole if raining
          if (game.isRaining) {
            ctx.fillStyle = "rgba(100, 149, 237, 0.5)"
            ctx.beginPath()
            ctx.ellipse(0, 0, potholeWidth * 0.6, potholeHeight * 0.5, 0, 0, Math.PI * 2)
            ctx.fill()
          }
          break

        case "cow":
          // Body
          ctx.fillStyle = "#f5f5dc"
          ctx.beginPath()
          ctx.ellipse(0, -20, 35, 20, 0, 0, Math.PI * 2)
          ctx.fill()
          // Head
          ctx.beginPath()
          ctx.ellipse(30, -25, 15, 12, 0, 0, Math.PI * 2)
          ctx.fill()
          // Spots
          ctx.fillStyle = "#8B4513"
          ctx.beginPath()
          ctx.ellipse(-10, -25, 10, 8, 0.3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(10, -15, 8, 6, -0.2, 0, Math.PI * 2)
          ctx.fill()
          // Legs
          ctx.fillStyle = "#f5f5dc"
          ctx.fillRect(-25, -5, 8, 20)
          ctx.fillRect(-10, -5, 8, 20)
          ctx.fillRect(10, -5, 8, 20)
          ctx.fillRect(25, -5, 8, 20)
          // Eyes
          ctx.fillStyle = "#000"
          ctx.beginPath()
          ctx.arc(35, -28, 3, 0, Math.PI * 2)
          ctx.fill()
          // Horns
          ctx.strokeStyle = "#8B7355"
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(25, -35)
          ctx.quadraticCurveTo(20, -45, 25, -42)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(35, -35)
          ctx.quadraticCurveTo(40, -45, 35, -42)
          ctx.stroke()
          break

        case "barricade":
          // Lane-specific road barricade
          const barricadeLane = obstacle.lane ?? 0
          const barricadeYOffset = barricadeLane * 25
          
          ctx.save()
          ctx.translate(0, barricadeYOffset)
          
          // Barricade stand posts
          ctx.fillStyle = "#333"
          ctx.fillRect(-30, -5, 8, 20)
          ctx.fillRect(22, -5, 8, 20)
          
          // Main barricade bar
          ctx.fillStyle = "#FF6600"
          ctx.fillRect(-35, -25, 70, 12)
          
          // Reflective stripes
          ctx.fillStyle = "#FFF"
          for (let i = 0; i < 5; i++) {
            ctx.fillRect(-30 + i * 14, -23, 8, 8)
          }
          
          // Warning text
          ctx.fillStyle = "#000"
          ctx.font = "bold 8px Arial"
          ctx.fillText("ROAD WORK", -28, -16)
          
          // Flashing light on top
          if (Math.sin(game.autoFrame * 0.2) > 0) {
            ctx.fillStyle = "#FFFF00"
          } else {
            ctx.fillStyle = "#FF6600"
          }
          ctx.beginPath()
          ctx.arc(0, -30, 6, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.restore()
          break
      }

      ctx.restore()
    }

    // Game loop
    let animationId: number
    let obstacleTimer = 0

    const gameLoop = () => {
      if (gameState !== "playing") {
        animationId = requestAnimationFrame(gameLoop)
        return
      }

      // Traffic signal logic at game start
      if (!game.gameStarted) {
        game.signalTimer++
        if (game.signalTimer < 60) {
          game.trafficSignal = "red"
        } else if (game.signalTimer < 90) {
          game.trafficSignal = "yellow"
        } else {
          game.trafficSignal = "green"
          game.gameStarted = true
          addNotification("GO! Navigate the streets of Mumbai!", "#00FF00")
        }
      }

      // Handle braking - smoothly adjust speed
      if (!game.gameStarted) {
        game.speed = 0
      } else if (game.isBraking) {
        game.speed = Math.max(2, game.speed - 0.3) // Slow down but not stop
      } else {
        game.speed = Math.min(game.baseSpeed, game.speed + 0.2) // Return to base speed
      }

      // Time of day progression (affects lighting)
      game.timeOfDay += 0.001
      
      // Weather state machine with gradual transitions
      game.rainTimer++
      
      // Weather progression: sunny -> cloudy -> darkening -> drizzle -> raining
      if (game.weatherState === "sunny" && game.rainTimer >= game.nextRainTime - 200) {
        game.weatherState = "cloudy"
        addNotification("Clouds gathering...", "#A9A9A9")
      }
      else if (game.weatherState === "cloudy" && game.rainTimer >= game.nextRainTime - 100) {
        game.weatherState = "darkening"
        game.cloudDarkness = Math.min(1, game.cloudDarkness + 0.02)
        if (!game.rainWarningGiven) {
          addNotification("Rain approaching! Watch for water clogging!", "#4682B4")
          game.rainWarningGiven = true
        }
      }
      else if (game.weatherState === "darkening" && game.rainTimer >= game.nextRainTime - 50) {
        game.weatherState = "drizzle"
        addNotification("Drizzle starting...", "#6495ED")
      }
      else if (game.weatherState === "drizzle" && game.rainTimer >= game.nextRainTime) {
        game.weatherState = "raining"
        game.isRaining = true
        game.rainDuration = Math.random() * 400 + 600
        game.rainTimer = 0
        addNotification("MONSOON! Roads may be flooded!", "#1E90FF")
      }
      else if (game.isRaining && game.rainTimer >= game.rainDuration) {
        game.weatherState = "sunny"
        game.isRaining = false
        game.cloudDarkness = 0
        game.rainTimer = 0
        game.nextRainTime = 600 + Math.random() * 300
        game.rainWarningGiven = false
        game.raindrops = []
        addNotification("Skies clearing up!", "#87CEEB")
      }
      
      // Gradual cloud darkness during darkening phase
      if (game.weatherState === "darkening") {
        game.cloudDarkness = Math.min(0.7, game.cloudDarkness + 0.005)
      }

      // Clear canvas with weather-appropriate sky
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      const morningTint = Math.min(0.3, game.timeOfDay * 0.1)
      
      if (game.weatherState === "raining" || game.weatherState === "drizzle") {
        gradient.addColorStop(0, "#2c3e50")
        gradient.addColorStop(0.5, "#4a6572")
        gradient.addColorStop(1, "#5d7a8c")
      } else if (game.weatherState === "darkening") {
        const dark = game.cloudDarkness
        gradient.addColorStop(0, `rgb(${135 - dark * 80}, ${206 - dark * 100}, ${235 - dark * 100})`)
        gradient.addColorStop(0.5, `rgb(${176 - dark * 90}, ${224 - dark * 110}, ${230 - dark * 100})`)
        gradient.addColorStop(1, `rgb(${224 - dark * 100}, ${246 - dark * 120}, ${255 - dark * 100})`)
      } else if (game.weatherState === "cloudy") {
        gradient.addColorStop(0, "#9FB8C7")
        gradient.addColorStop(0.5, "#B8C9D4")
        gradient.addColorStop(1, "#D4E1E8")
      } else {
        // Sunny morning - warm golden tones
        gradient.addColorStop(0, `rgb(${135 + morningTint * 50}, ${206}, ${235})`)
        gradient.addColorStop(0.5, `rgb(${255 - morningTint * 30}, ${240 - morningTint * 20}, ${220})`)
        gradient.addColorStop(1, `rgb(${255}, ${250 - morningTint * 30}, ${230 - morningTint * 40})`)
      }
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw sun on sunny/cloudy days
      if (game.weatherState === "sunny" || game.weatherState === "cloudy") {
        ctx.fillStyle = game.weatherState === "sunny" ? "#FFD700" : "#F0E68C"
        ctx.beginPath()
        ctx.arc(650, 60, 35, 0, Math.PI * 2)
        ctx.fill()
        
        // Sun rays on sunny day
        if (game.weatherState === "sunny") {
          ctx.strokeStyle = "rgba(255, 215, 0, 0.3)"
          ctx.lineWidth = 3
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + game.timeOfDay
            ctx.beginPath()
            ctx.moveTo(650 + Math.cos(angle) * 40, 60 + Math.sin(angle) * 40)
            ctx.lineTo(650 + Math.cos(angle) * 60, 60 + Math.sin(angle) * 60)
            ctx.stroke()
          }
        }
      }
      
      // Draw clouds
      if (game.weatherState !== "sunny") {
        const cloudAlpha = game.weatherState === "cloudy" ? 0.6 : 
                          game.weatherState === "darkening" ? 0.8 : 0.9
        ctx.fillStyle = `rgba(150, 150, 150, ${cloudAlpha})`
        
        // Multiple clouds
        for (let i = 0; i < 5; i++) {
          const cloudX = (i * 180 + game.groundOffset * 0.2) % (canvas.width + 100) - 50
          const cloudY = 30 + (i % 3) * 20
          
          ctx.beginPath()
          ctx.arc(cloudX, cloudY, 25, 0, Math.PI * 2)
          ctx.arc(cloudX + 25, cloudY - 10, 30, 0, Math.PI * 2)
          ctx.arc(cloudX + 50, cloudY, 25, 0, Math.PI * 2)
          ctx.arc(cloudX + 25, cloudY + 5, 20, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Spawn raindrops
      if (game.isRaining) {
        for (let i = 0; i < 5; i++) {
          game.raindrops.push({
            x: Math.random() * canvas.width,
            y: -10,
            speed: Math.random() * 8 + 12,
            length: Math.random() * 15 + 10,
          })
        }
      }

      // Update and draw far buildings (skyscrapers)
      game.farBuildings.forEach((building) => {
        building.x -= game.speed * 0.3
        if (building.x + building.width < 0) {
          building.x = canvas.width + Math.random() * 100
          building.height = Math.random() * 200 + 150
          building.windows = generateWindows(building.width, building.height)
        }
        drawBuilding(building, true)
      })

      // Update and draw near buildings
      game.buildings.forEach((building) => {
        building.x -= game.speed * 0.6
        if (building.x + building.width < 0) {
          building.x = canvas.width + Math.random() * 50
          building.height = Math.random() * 120 + 80
          building.windows = generateWindows(building.width, building.height)
        }
        drawBuilding(building, false)
      })

      // Draw footpath
      ctx.fillStyle = "#8B7355"
      ctx.fillRect(0, GROUND_Y - FOOTPATH_HEIGHT, canvas.width, FOOTPATH_HEIGHT)

      // Footpath pattern
      ctx.strokeStyle = "#6B5344"
      ctx.lineWidth = 1
      for (let i = 0; i < canvas.width; i += 40) {
        const offset = (game.groundOffset * 0.6) % 40
        ctx.beginPath()
        ctx.moveTo(i - offset, GROUND_Y - FOOTPATH_HEIGHT)
        ctx.lineTo(i - offset, GROUND_Y)
        ctx.stroke()
      }

      // Draw road
      ctx.fillStyle = "#333"
      ctx.fillRect(0, GROUND_Y, canvas.width, 80)

      // Road markings
      ctx.strokeStyle = "#FFF"
      ctx.lineWidth = 3
      ctx.setLineDash([30, 20])
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y + 40)
      ctx.lineTo(canvas.width, GROUND_Y + 40)
      ctx.stroke()
      ctx.setLineDash([])

      // Moving road lines
      game.groundOffset += game.speed
      ctx.strokeStyle = "#555"
      ctx.lineWidth = 2
      for (let i = 0; i < canvas.width + 100; i += 100) {
        const x = i - (game.groundOffset % 100)
        ctx.beginPath()
        ctx.moveTo(x, GROUND_Y)
        ctx.lineTo(x, GROUND_Y + 80)
        ctx.stroke()
      }

      // Update and draw dogs
      game.dogs.forEach((dog) => {
        dog.x -= game.speed * 0.4 * dog.direction
        dog.legPhase += 0.3

        // Respawn dogs
        if (dog.x < -50 || dog.x > canvas.width + 100) {
          if (dog.direction === -1) {
            dog.x = canvas.width + 50
          } else {
            dog.x = -50
          }
          dog.direction = Math.random() > 0.3 ? -1 : 1
        }

        drawDog(dog)
      })

      // Spawn new dogs occasionally - much less frequent and random timing
      game.lastDogSpawn++
      const dogSpawnChance = 0.001 // Very rare
      const minDogInterval = 600 + Math.random() * 400 // Random interval between 10-17 seconds
      if (game.lastDogSpawn > minDogInterval && Math.random() < dogSpawnChance && game.dogs.length < 2) {
        spawnDog()
        game.lastDogSpawn = 0
      }

      // Update and draw vendors
      game.vendors = game.vendors.filter((vendor) => {
        vendor.x -= game.speed * 0.6
        if (vendor.x < -80) return false
        drawVendor(vendor)
        return true
      })

      // Spawn new vendors at intervals
      if (game.vendors.length < 4) {
        const lastVendor = game.vendors[game.vendors.length - 1]
        const minDistance = 300
        if (!lastVendor || lastVendor.x < canvas.width - minDistance) {
          spawnVendor()
        }
      }

      // Update and draw raindrops
      game.raindrops = game.raindrops.filter((drop) => {
        drop.y += drop.speed
        drop.x -= game.speed * 0.5
        if (drop.y > canvas.height) return false
        drawRaindrop(drop)
        return true
      })

      // Spawn obstacles
      obstacleTimer++
      if (obstacleTimer > 120 / (game.speed / 5)) {
        spawnObstacle()
        obstacleTimer = 0
      }

      // Spawn water clogs during/after rain
      if (game.isRaining) {
        game.waterClogTimer++
        // Spawn water clogs at random intervals during rain
        if (game.waterClogTimer > 180 + Math.random() * 200 && game.waterClogs.length < 3) {
          const lane = Math.random() > 0.5 ? 0 : 1
          game.waterClogs.push({
            x: canvas.width + 100,
            y: GROUND_Y + (lane === 0 ? 15 : 45),
            width: 80 + Math.random() * 40,
            wavePhase: Math.random() * Math.PI * 2,
            lane: lane,
          })
          game.waterClogTimer = 0
        }
      }

      // Update and draw water clogs
      game.waterClogs = game.waterClogs.filter((clog) => {
        clog.x -= game.speed
        if (clog.x < -100) return false
        drawWaterClog(clog)
        return true
      })

      // Update and draw obstacles
      game.obstacles = game.obstacles.filter((obstacle) => {
        obstacle.x -= game.speed
        if (obstacle.x < -50) return false
        drawObstacle(obstacle)
        return true
      })

      // Spawn side vehicles (cars, buses, trucks) at random intervals
      game.lastVehicleSpawn++
      const vehicleSpawnInterval = 200 + Math.random() * 400 // Very random timing
      if (game.lastVehicleSpawn > vehicleSpawnInterval && game.sideVehicles.length < 3) {
        if (Math.random() > 0.4) { // 60% chance to spawn
          spawnSideVehicle()
          game.lastVehicleSpawn = 0
        }
      }

      // Update and draw side vehicles
      game.sideVehicles = game.sideVehicles.filter((vehicle) => {
        vehicle.x -= vehicle.speed
        if (vehicle.x < -100) return false
        drawSideVehicle(vehicle)
        return true
      })

      // Auto physics
      if (game.isJumping) {
        game.autoVelocityY += 0.8
        game.autoY += game.autoVelocityY
        if (game.autoY >= 0) {
          game.autoY = 0
          game.autoVelocityY = 0
          game.isJumping = false
        }
      }

      // Draw autorickshaw
      drawAutorickshaw(game.autoX, game.autoY)

      // Collision detection
      const laneOffset = game.currentLane * 25
      const autoHitbox = {
        x: game.autoX - 25,
        y: GROUND_Y - 45 + game.autoY + laneOffset,
        width: 70,
        height: 40,
      }

      // Check water clog collisions - hitting water in your lane causes game over
      for (const clog of game.waterClogs) {
        // Only collide if auto is in the same lane as the water
        if (game.currentLane === clog.lane) {
          const clogHitbox = {
            x: clog.x - clog.width / 2,
            y: clog.y - 8,
            width: clog.width,
            height: 16,
          }
          if (
            autoHitbox.x < clogHitbox.x + clogHitbox.width &&
            autoHitbox.x + autoHitbox.width > clogHitbox.x &&
            autoHitbox.y < clogHitbox.y + clogHitbox.height &&
            autoHitbox.y + autoHitbox.height > clogHitbox.y &&
            !game.isJumping
          ) {
            setGameState("gameover")
            if (game.score > highScore) {
              setHighScore(game.score)
            }
          }
        }
      }

      // Check side vehicle collisions
      for (const vehicle of game.sideVehicles) {
        if (game.currentLane === vehicle.lane) {
          let vehicleHitbox = { x: 0, y: 0, width: 0, height: 0 }
          
          switch (vehicle.type) {
            case "car":
              vehicleHitbox = { x: vehicle.x - 30, y: vehicle.y - 25, width: 60, height: 35 }
              break
            case "bus":
              vehicleHitbox = { x: vehicle.x - 50, y: vehicle.y - 40, width: 100, height: 50 }
              break
            case "truck":
              vehicleHitbox = { x: vehicle.x - 45, y: vehicle.y - 35, width: 90, height: 45 }
              break
          }
          
          if (
            autoHitbox.x < vehicleHitbox.x + vehicleHitbox.width &&
            autoHitbox.x + autoHitbox.width > vehicleHitbox.x &&
            autoHitbox.y < vehicleHitbox.y + vehicleHitbox.height &&
            autoHitbox.y + autoHitbox.height > vehicleHitbox.y
          ) {
            setGameState("gameover")
            if (game.score > highScore) {
              setHighScore(game.score)
            }
          }
        }
      }

      for (const obstacle of game.obstacles) {
        let obstacleHitbox = { x: 0, y: 0, width: 0, height: 0 }
        const obstacleSize = obstacle.size || 1
        let shouldCheck = true

        switch (obstacle.type) {
          case "pothole":
            const potholeW = 40 * obstacleSize
            obstacleHitbox = { x: obstacle.x - potholeW/2, y: obstacle.y - 5, width: potholeW, height: 10 }
            break
          case "cow":
            obstacleHitbox = { x: obstacle.x - 30, y: obstacle.y - 40, width: 60, height: 40 }
            break
          case "barricade":
            // Only check collision if in the same lane as the barricade
            const barricadeLane = obstacle.lane ?? 0
            if (game.currentLane !== barricadeLane) {
              shouldCheck = false
            } else {
              const barricadeYOffset = barricadeLane * 25
              obstacleHitbox = { 
                x: obstacle.x - 35, 
                y: obstacle.y - 25 + barricadeYOffset, 
                width: 70, 
                height: 30 
              }
            }
            break
        }

        if (shouldCheck &&
          autoHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
          autoHitbox.x + autoHitbox.width > obstacleHitbox.x &&
          autoHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
          autoHitbox.y + autoHitbox.height > obstacleHitbox.y &&
          !game.isJumping
        ) {
          setGameState("gameover")
          if (game.score > highScore) {
            setHighScore(game.score)
          }
        }
      }

      // Update score
      if (game.gameStarted) {
        game.score++
        setScore(game.score)
      }

      // Level progression and landmarks
      const prevLevel = game.currentLevel
      game.currentLevel = Math.floor(game.score / 500) + 1
      
      // Level up notifications and landmark changes
      if (game.currentLevel > prevLevel && game.currentLevel > 1) {
        const landmarks: Landmark["type"][] = ["residential", "school", "hospital", "garden", "market"]
        const newLandmark = landmarks[game.currentLevel % landmarks.length]
        game.currentLandmark = { type: newLandmark, startScore: game.score }
        
        switch (game.currentLevel) {
          case 2:
            addNotification("Entering School Zone - Watch for cattle!", "#FFD700")
            break
          case 3:
            addNotification("Hospital Area - Traffic thickens!", "#FF6347")
            break
          case 4:
            addNotification("Garden District - Potholes ahead!", "#90EE90")
            break
          case 5:
            addNotification("Market Area - EXTREME TRAFFIC!", "#FF0000")
            break
          default:
            addNotification(`Level ${game.currentLevel} - Traffic intensifies!`, "#FFA500")
        }
      }

      // Increase difficulty - update base speed
      game.baseSpeed = 5 + Math.floor(game.score / 500) * 0.5
      if (!game.isBraking && game.gameStarted) {
        game.speed = game.baseSpeed
      }

      // Draw traffic signal
      drawTrafficSignal()
      
      // Draw notifications
      drawNotifications()

      // Brake indicator
      if (game.isBraking) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.4)"
        ctx.fillRect(canvas.width - 100, 10, 90, 25)
        ctx.fillStyle = "#FFF"
        ctx.font = "bold 14px Arial"
        ctx.fillText("BRAKING", canvas.width - 95, 28)
      }

      // Lane indicator
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.fillRect(canvas.width - 100, 40, 90, 25)
      ctx.fillStyle = "#FFF"
      ctx.font = "12px Arial"
      ctx.fillText(`Lane: ${game.currentLane === 0 ? "TOP" : "BOTTOM"}`, canvas.width - 95, 57)

      // Weather indicator
      if (game.isRaining) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(10, 10, 180, 40)
        ctx.fillStyle = "#FFF"
        ctx.font = "14px Arial"
        ctx.fillText("MONSOON! Watch for", 20, 25)
        ctx.fillStyle = "#87CEEB"
        ctx.fillText("water clogging ahead!", 20, 42)
      }

      animationId = requestAnimationFrame(gameLoop)
    }

    animationId = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [gameState, highScore])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-amber-100 to-orange-200 p-4">
      <h1 className="text-3xl md:text-4xl font-bold text-amber-800 mb-4 text-center">
        🛺 Autorickshaw Odyssey
      </h1>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border-4 border-amber-600 rounded-lg shadow-2xl max-w-full"
          onClick={() => {
            if (gameState === "start" || gameState === "gameover") {
              startGame()
            } else {
              jump()
            }
          }}
        />

        {/* Score display */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg">
          <div className="text-lg font-bold">Score: {score}</div>
          <div className="text-sm">Best: {highScore}</div>
        </div>

        {/* Start screen */}
        {gameState === "start" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
            <div className="text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Roll!</h2>
              <p className="text-lg mb-2">Navigate through the busy streets of Mumbai</p>
              <p className="text-sm mb-2 text-amber-300">Watch the traffic signal - GREEN means GO!</p>
              <p className="text-xs mb-2 text-amber-200">Avoid: Barricades, Cows, Potholes, Cars, Buses, Water</p>
              <p className="text-xs mb-4 text-green-300">Switch lanes to dodge lane-specific barricades!</p>
              <p className="text-xs text-amber-200">Down = Switch Lane | Left = Brake | Space = Jump</p>
              <p className="text-xl animate-pulse mt-4">Tap or Press Space to Start</p>
            </div>
          </div>
        )}

        {/* Game over screen */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg">
            <div className="text-white text-center">
              <h2 className="text-3xl font-bold mb-4 text-red-400">Game Over!</h2>
              <p className="text-2xl mb-2">Score: {score}</p>
              {score >= highScore && score > 0 && (
                <p className="text-yellow-400 text-lg mb-2">🏆 New High Score!</p>
              )}
              <p className="text-xl animate-pulse mt-4">Tap or Press Space to Restart</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-amber-700 text-center">
        <p className="text-sm">Space/Up = Jump | Down/S = Switch Lane | Left/B = Brake</p>
        <p className="text-xs mt-1 text-amber-600">Mobile: Tap top to jump, bottom to switch lane, left side to brake</p>
        <p className="text-xs text-amber-500">Navigate the chaotic streets of Mumbai - watch for traffic, water, and potholes!</p>
      </div>
    </div>
  )
}
