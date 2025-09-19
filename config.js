// FILE: config.js
const CONFIG = {
  "MAX_FORCE": 0.05,
  "VISUAL_RANGE": 80,
  "AVOID_RADIUS": 20,
  "BACKGROUND_COLOR": "rgba(0, 0, 10, 1)",
  "PREDATOR_DESPAWN_MARGIN": 200,
  "REPOSITION_MARGIN": 50,
  "BOID_SPAWN_MARGIN": 50,
  "PREDATOR_SPAWN_COOLDOWN": 500,
  "OVERPOPULATION_COUNT": 10,
  "WHALE_OVERPOPULATION_COUNT": 100,
  "PREDATOR_LEAVE_COUNT": -5,
  "PREDATOR_POPULATION_SCORE_WEIGHT": 2.0,
  "PREDATOR_OVERPOPULATION_WEIGHT": 30,
  "PREDATOR_DISTANCE_WEIGHT": 0.1,
  "PREDATOR_TARGET_BONUS": 150,
  "PREDATOR_STUNNED_TARGET_BONUS": 1000,
  "UNTARGETED_PREY_BONUS": 50,
  "LONG_RANGE_OVERPOP_WEIGHT": 20,
  "LONG_RANGE_TARGET_BONUS": 50,
  "LONG_RANGE_DENSITY_WEIGHT": 2.5,
  "DENSITY_CHECK_RADIUS": 120, 
  "PREDATOR_DENSITY_WEIGHT": 2.5, 
  "DEBUG_MODE": false,
  "CLICK_EFFECT": { "threatRadius": 200, "threatDuration": 150 },
  "PLANKTON_COUNT": 50,
  "PLANKTON_SIZE": 1.2,
  "PLANKTON_COLOR": "rgba(255, 255, 255, 0.7)",
  "PLANKTON_WANDER_STRENGTH": 0.08,
  "PLANKTON_GROWTH_RATE": 0.01,
  "WALL_AVOID_DISTANCE": 1,
  "WALL_AVOID_FORCE": 0.2,
  // ★▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 追加 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼★
  "DEVICE_SCALES": {
      "DESKTOP": 1.0,
      "TABLET": 0.5,
      "MOBILE": 0.3
  },
  // ★▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 追加 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲★
  "FISH_TYPES": {
    "SARDINE": { "count": 80, "maxSpeed": 1.5, "separationWeight": 2, "alignmentWeight": 1, "cohesionWeight": 1, "width": 16, "height": 8, "eatRadius": 5, "reproductionCost": 12, "planktonSeekRange": 100, "spawnColor": "255, 100, 0", "fleeForceMultiplier": 2.5, "fleeRange": 260 },
    "MACKEREL": { "count": 50, "maxSpeed": 1.5, "separationWeight": 3, "alignmentWeight": 1.5, "cohesionWeight": 1.2, "width": 24, "height": 12, "eatRadius": 8, "reproductionCost": 20, "planktonSeekRange": 100, "spawnColor": "0, 150, 255", "fleeForceMultiplier": 2.5, "fleeRange": 260 },
    "BONITO": { "count": 20, "maxSpeed": 1.5, "separationWeight": 3.5, "alignmentWeight": 1.5, "cohesionWeight": 1.2, "width": 32, "height": 16, "eatRadius": 10, "reproductionCost": 35, "planktonSeekMultiplier": 2, "planktonSeekRange": 60, "spawnColor": "0, 200, 50", "fleeForceMultiplier": 2.5, "planktonFocusMultiplier": 0.2, "seekForceMultiplier": 1.5, "fleeRange": 240 },
    "CUTLASS": { "count": 20, "maxSpeed": 1, "separationWeight": 2.5, "alignmentWeight": 0, "cohesionWeight": 0, "width": 30, "height": 5, "eatRadius": 7, "reproductionCost": 10, "eatCooldown": 180, "fleeSpeedMultiplier": 2.2, "spawnColor": "200, 200, 0", "fleeForceMultiplier": 3.0, "wanderForce": 0.1, "foodSeekForce": 2.0, "fleeRange": 280 },
    "SHARK": { "count": 0, "maxSpeed": 3, "separationWeight": 4, "alignmentWeight": 0, "cohesionWeight": 0, "width": 320, "height": 160, "turnFactor": 0.3, "lifespan": 30000, "eatCooldown": 20, "eatDamage": 400, "eats": [ "BONITO", "MACKEREL", "CUTLASS", "SARDINE" ], "mouthOffset": 0.4, "eatRadius": 35, "maxCount": 1, "seekRange": 1000, "wanderForce": 0.1 },
    "MARLIN": { "count": 0, "maxSpeed": 6.5, "separationWeight": 4, "alignmentWeight": 0.8, "cohesionWeight": 0.8, "width": 270, "height": 90, "turnFactor": 0.4, "lifespan": 30000, "eatCooldown": 0, "eatDamage": 300, "eats": [ "MACKEREL", "CUTLASS", "SARDINE" ], "mouthOffset": 0.2, "billTipOffset": 0.3, "eatRadius": 30, "maxCount": 2, "seekRange": 250, "isFlocking": true, "minSpeedMultiplier": 0.9, "minSpeedForce": 0.3, "stunRadius": 35, "stunDuration": 600, "stunSeekRange": 1200, "seekForceMultiplier": 3.0 },
    "RAY": { "count": 0, "maxSpeed": 2.8, "separationWeight": 4, "alignmentWeight": 0, "cohesionWeight": 0, "width": 150, "height": 120, "turnFactor": 0.4, "lifespan": 30000, "eatCooldown": 15, "eatDamage": 300, "eats": [ "SARDINE" ], "mouthOffset": 0.25, "eatRadius": 25, "stealthDuration": 180, "maxCount": 3, "seekRange": 220, "stealthSeekRange": 150, "ambushForce": 3.0, "brakeForce": 0.1, "turnTorque": 0.02 },
    "TUNA": { "count": 0, "maxSpeed": 8, "separationWeight": 4, "alignmentWeight": 0, "cohesionWeight": 0, "width": 120, "height": 48, "turnFactor": 0.2, "lifespan": 30000, "eatCooldown": 15, "eatDamage": 350, "eats": [ "CUTLASS", "SARDINE" ], "mouthOffset": 0.4, "eatRadius": 20, "maxCount": 5, "minSpeedMultiplier": 0.8, "minSpeedForce": 0.2, "seekRange": 350, "seekForceMultiplier": 1.7 },
    "WHALE": { "count": 0, "maxSpeed": 2.5, "separationWeight": 0, "alignmentWeight": 0, "cohesionWeight": 0, "width": 2000, "height": 665, "turnFactor": 0.1, "eats": [ "SARDINE", "MACKEREL", "BONITO", "CUTLASS" ], "mouthOffset": { "x": 0.3, "y": 0.05 }, "eatRadius": 150 }
  }
};