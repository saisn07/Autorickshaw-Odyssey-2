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
  type: "pothole" | "cow" | "barricade" | "schoolvan" | "zebracrossing" | "debris"
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
  type: "car" | "bus" | "truck" | "ambulance"
  color: string
  speed: number
  lane: number
  sirenPhase?: number // For ambulance siren animation
}

interface Notification {
  text: string
  timer: number
  color: string
}

interface Landmark {
  type: "traffic_start" | "hospital" | "busstop" | "garden" | "school" | "residential" | "market"
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
    // Weather system - progressive transition (sunny -> windy -> sunny brief -> cloudy -> darkening -> rain -> repeat)
    weatherState: "sunny" as "sunny" | "windy" | "sunny_brief" | "cloudy" | "darkening" | "drizzle" | "raining" | "stormy",
    cloudDarkness: 0, // 0-1 for gradual darkening
    isRaining: false,
    isStormy: false, // Windy storm with turbulence
    isWindy: false, // Windy without rain
    weatherTimer: 0, // General weather timer
    weatherPhaseDuration: 300, // Duration for each weather phase
    rainTimer: 0,
    rainDuration: 0,
    rainWarningGiven: false,
    // Turbulence system for storm/wind
    turbulenceOffset: 0,
    turbulenceDirection: 1,
    windParticles: [] as { x: number; y: number; speed: number; length: number }[],
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
    currentLandmark: { type: "traffic_start", startScore: 0 } as Landmark,
    nextLandmarkScore: 500,
    // Time of day for visual ambiance
    timeOfDay: 0, // 0 = morning, increases over time
    // Dynamic track width - starts at 80, decreases every 1000 score
    trackWidth: 80,
    baseTrackWidth: 80,
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
    game.isStormy = false
    game.isWindy = false
    game.weatherTimer = 0
    game.weatherPhaseDuration = 300 + Math.random() * 200
    game.rainTimer = 0
    game.rainWarningGiven = false
    game.turbulenceOffset = 0
    game.turbulenceDirection = 1
    game.windParticles = []
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
    game.currentLandmark = { type: "traffic_start", startScore: 0 }
    game.nextLandmarkScore = 300 // First zone change comes quicker
    // Reset track width
    game.trackWidth = 80
    game.baseTrackWidth = 80
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
      let type: "pothole" | "cow" | "barricade" | "debris"
      let size = 1
      let lane: number | undefined = undefined
      
      // Progressive difficulty:
      // Level 1 (0-500): Mostly barricades, few dogs on footpath
      // Level 2 (500-1500): Add cows occasionally
      // Level 3 (1500-3000): More potholes, thicker traffic
      // Level 4 (3000+): Everything intensifies - potholes + heavy traffic
      // During storms: Add debris obstacles
      
      // Storm debris - high priority during storms
      if (game.isStormy && random < 0.4) {
        type = "debris"
        lane = Math.random() > 0.5 ? 0 : 1
      }
      else if (level >= 2 && random < 0.06 && game.lastCowSpawn > 600 + Math.random() * 600) {
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

  // Spawn side vehicles (cars, buses, trucks, ambulances from opposite direction)
  const spawnSideVehicle = () => {
  // Zone-specific vehicle spawning
  const isHospitalZone = game.currentLandmark.type === "hospital"
  const isBusStopZone = game.currentLandmark.type === "busstop"
  
  let types: SideVehicle["type"][]
  if (isHospitalZone) {
    types = ["car", "car", "ambulance", "ambulance", "car"] // More ambulances in hospital zone
  } else if (isBusStopZone) {
    types = ["car", "bus", "bus", "car", "truck"] // More buses near bus stops
  } else {
    types = ["car", "car", "car", "bus", "truck"] // Normal distribution
  }
  
  const type = types[Math.floor(Math.random() * types.length)]
  const carColors = ["#DC143C", "#4169E1", "#FFD700", "#32CD32", "#FF6347", "#9400D3", "#1E90FF", "#FF4500"]
  const truckColors = ["#4682B4", "#8B4513", "#2F4F4F"]
  const busColors = ["#FF4500", "#228B22", "#4169E1"]
  
  let color: string
  if (type === "car") {
    color = carColors[Math.floor(Math.random() * carColors.length)]
  } else if (type === "truck") {
    color = truckColors[Math.floor(Math.random() * truckColors.length)]
  } else if (type === "ambulance") {
    color = "#FFFFFF" // White ambulance
  } else {
    color = busColors[Math.floor(Math.random() * busColors.length)]
  }
  
  const lane = Math.random() > 0.5 ? 0 : 1
          // Calculate water clog Y position based on dynamic track width
          const clogRoadYOffset = (80 - game.trackWidth) / 2
          const clogLaneSpacing = (game.trackWidth - 30) / 2
          const clogLaneY = GROUND_Y + clogRoadYOffset + (lane === 0 ? 15 : 15 + Math.max(15, clogLaneSpacing))
          
          game.waterClogs.push({
            x: canvas.width + 100,
            y: clogLaneY,
            width: Math.min(80 + Math.random() * 40, game.trackWidth * 0.8), // Scale water clog width with track
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

      // Draw autorickshaw with turbulence during storms
      const turbulenceY = game.isStormy ? game.turbulenceOffset : 0
      drawAutorickshaw(game.autoX, game.autoY + turbulenceY)

      // Collision detection with dynamic lane spacing and turbulence
      const collisionLaneSpacing = (game.trackWidth - 30) / 2
      const collisionRoadYOffset = (80 - game.trackWidth) / 2
      const laneOffset = game.currentLane * Math.max(15, collisionLaneSpacing)
      const turbulenceYCollision = game.isStormy ? game.turbulenceOffset : 0
      const autoHitbox = {
        x: game.autoX - 25,
        y: GROUND_Y - 45 + game.autoY + laneOffset + collisionRoadYOffset + turbulenceYCollision,
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
              // Dynamic barricade collision offset
              const barricadeCollisionLaneSpacing = (game.trackWidth - 30) / 2
              const barricadeCollisionRoadYOffset = (80 - game.trackWidth) / 2
              const barricadeCollisionYOffset = barricadeLane * Math.max(15, barricadeCollisionLaneSpacing) + barricadeCollisionRoadYOffset
              obstacleHitbox = { 
                x: obstacle.x - 35, 
                y: obstacle.y - 25 + barricadeCollisionYOffset, 
                width: 70, 
                height: 30 
              }
            }
            break
          case "debris":
            // Only check collision if in the same lane as the debris
            const debrisLane = obstacle.lane ?? 0
            if (game.currentLane !== debrisLane) {
              shouldCheck = false
            } else {
              // Dynamic debris collision offset
              const debrisCollisionLaneSpacing = (game.trackWidth - 30) / 2
              const debrisCollisionRoadYOffset = (80 - game.trackWidth) / 2
              const debrisCollisionYOffset = debrisLane * Math.max(15, debrisCollisionLaneSpacing) + debrisCollisionRoadYOffset
              obstacleHitbox = { 
                x: obstacle.x - 30, 
                y: obstacle.y - 20 + debrisCollisionYOffset, 
                width: 55, 
                height: 25 
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

      // Increase difficulty - update base speed (0.075x increase every 500 score)
      const prevSpeedLevel = Math.floor((game.score - 1) / 500)
      const currSpeedLevel = Math.floor(game.score / 500)
      game.baseSpeed = 5 + currSpeedLevel * 0.375 // 0.075x of base 5 = 0.375 per 500 score
      if (!game.isBraking && game.gameStarted) {
        game.speed = game.baseSpeed
      }
      
      // Notify when speed increases (but not on first level up which has its own message)
      if (currSpeedLevel > prevSpeedLevel && currSpeedLevel > 0 && game.score > 500) {
        const speedPercent = Math.round((game.baseSpeed / 5) * 100)
        addNotification(`Speed +${speedPercent - 100}%`, "#FFD700")
      }
      
      // Dynamic track width - thinner every 1000 score (minimum 50px)
      const prevTrackNarrowLevel = Math.floor((game.score - 1) / 1000)
      const trackNarrowLevel = Math.floor(game.score / 1000)
      game.trackWidth = Math.max(50, game.baseTrackWidth - trackNarrowLevel * 8)
      
      // Notify when track narrows
      if (trackNarrowLevel > prevTrackNarrowLevel && trackNarrowLevel > 0) {
        addNotification("ROAD NARROWING! Stay focused!", "#FF4500")
      }

      // Draw traffic signal only at the beginning (before game starts)
      if (!game.gameStarted) {
        drawTrafficSignal()
      }
      
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
      
      // Speed indicator
      const speedPercent = Math.round((game.baseSpeed / 5) * 100)
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.fillRect(canvas.width - 100, 70, 90, 25)
      ctx.fillStyle = speedPercent > 130 ? "#FF6347" : "#90EE90"
      ctx.font = "12px Arial"
      ctx.fillText(`Speed: ${speedPercent}%`, canvas.width - 95, 87)

      // Weather indicator
      if (game.isStormy) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
        ctx.fillRect(10, 10, 180, 40)
        ctx.fillStyle = "#FF6347"
        ctx.font = "bold 14px Arial"
        ctx.fillText("STORM WARNING!", 20, 25)
        ctx.fillStyle = "#FFD700"
        ctx.font = "12px Arial"
        ctx.fillText("Turbulence & debris!", 20, 42)
      } else if (game.isRaining) {
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
