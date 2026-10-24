Mictlán.js — An AI-Powered Día de Muertos JavaScript Adventure
You are a senior game developer, embedded systems engineer, pixel artist, and AWS AI architect.
Your mission is to design and implement Mictlán.js, a small, charming, single-level adventure game for an ESP32-S3 conference badge, inspired by Mexican Día de Muertos traditions, JavaScript, and AI agents.
Use Kiro Spec-Driven Development to create the requirements, technical design, implementation tasks, and tests before writing the game.
The experience should feel like a real miniature video game, not a static quiz application.
1. The game concept
Title: Mictlán.js
Tagline: Every developer has a journey. Every agent needs a guide.
The player controls a friendly green frog traveling through a colorful, mysterious world inspired by the Mictlán.
The frog is learning to become an AI agent.
To complete its journey, it must collect four magical cempasúchil flowers representing essential JavaScript concepts:

Variables
Functions
Promises
Objects
Each flower unlocks a short JavaScript challenge.
When all four flowers have been collected, the frog reaches a beautiful Día de Muertos ofrenda, where its journey ends and the agent awakens.
The game should combine exploration, platforming, puzzles, and educational challenges.
2. Visual identity
Create a distinctive pixel-art aesthetic inspired by classic 8-bit and 16-bit games.
Color palette

Deep purple: #21152E
Near-black: #0D0D0D
Cempasúchil orange: #FF8C00
Marigold yellow: #F5E000
Frog green: #65C84D
Magenta: #D94F9B
Bone white: #F2E8D5
Environment
Include recognizable elements of Mexican Día de Muertos traditions:

Cempasúchil flowers
Papel picado
Candles
Colorful ofrendas
Decorative calaveras
A mystical path through the Mictlán
A glowing portal representing the completion of the journey
Treat these traditions respectfully. The game should be playful and celebratory without reducing the cultural elements to horror imagery.
Main character
A small, expressive green frog inspired by the Strands Agents mascot.
Reference: https://strandsagents.com/
Research the official mascot assets and usage permissions. If the original artwork cannot be reused, design an original pixel-art frog with a similar friendly personality but a distinct visual identity.
The frog should have animations for:

Idle
Walking
Jumping
Crouching
Collecting a flower
Celebrating
Taking damage
Keep animations lightweight enough for embedded hardware.
3. Target hardware
The primary deployment target is the Electronic Cats JSConf México 2026 conference badge.
Verified hardware information:

ESP32-S3 revision v0.2
Dual-core CPU, up to 240 MHz
8 MB Quad SPI flash
Wi-Fi and Bluetooth LE
Native USB-Serial/JTAG
USB-C
Four front buttons: UP, DOWN, BACK, SELECT
Rear BOOT and RST buttons
Physical ON/OFF switch
Original JSConf firmware is currently working
Development environment:

macOS
Python virtual environment: ~/esp32-dev/.venv
esptool 5.6.0
USB serial port previously detected as /dev/cu.usbmodem101
The board’s display controller, resolution, GPIO assignments, and available RAM have not yet been fully verified.
Do not invent these specifications.
A full flash backup exists at:
~/esp32-dev/backups/jsconf-original.bin
Never erase or flash the device without explicit approval. Keep the original firmware backup outside the project and do not commit it.
4. Game mechanics
Build one complete, replayable level.
The game should include:

A title screen
A short introductory animation
A playable level
Four collectible flowers
Four JavaScript challenges
A simple health or retry mechanic
A final ofrenda
A victory animation
A replay option
Controls
Button
Action
UP
Jump / navigate upward
DOWN
Crouch / navigate downward
SELECT
Start / interact / confirm
BACK
Pause / return
Because the badge does not have dedicated LEFT and RIGHT buttons, design a side-scrolling auto-runner where the frog moves forward automatically.
The player controls jumping, crouching, and interacting.
The game must be fully playable using only these four buttons.
Gameplay loop

The frog enters the Mictlán.
The environment scrolls automatically.
The player avoids obstacles.
The frog collects a magical cempasúchil flower.
The game pauses and presents a JavaScript challenge.
A correct answer unlocks the flower.
The frog continues its journey.
After four challenges, the final ofrenda appears.
The frog completes its transformation into an AI agent.
Provide checkpoints or retries so that mistakes do not force the player to restart the entire game.
Target total gameplay time: approximately 3–5 minutes.
5. JavaScript challenges
Each flower corresponds to a JavaScript concept.
Flower 1: Variables
Example:
let x = 5;
x += 2;
console.log(x);
Question: What is printed?
Options: 5, 7, undefined
Correct answer: 7
Flower 2: Functions
const double = n => n * 2;
console.log(double(4));
Options: 4, 8, 16
Correct answer: 8
Flower 3: Promises
Promise.resolve("listo")
  .then(console.log);
Options: "listo", undefined, Error
Correct answer: "listo"
Flower 4: Objects
const frog = { name: "Kiro" };
console.log(frog.name);
Options: "frog", "Kiro", undefined
Correct answer: "Kiro"
Create a local, validated question bank for offline gameplay.
Display challenges in a compact format suitable for the actual screen dimensions.
Use UP and DOWN to select answers and SELECT to confirm.
BACK should return to the previous screen or show a pause menu.
Provide clear feedback for correct and incorrect answers.
Do not execute arbitrary AI-generated JavaScript on the ESP32.
6. The AI agent: The Guardian of Mictlán
Create a friendly AI guide called El Guardián del Código.
This character acts as the narrator and JavaScript mentor.
Its personality should be:

Warm
Playful
Encouraging
Curious
Inspired by Mexican storytelling
Technically accurate
Respectful of Día de Muertos traditions
The agent should help the player without simply revealing answers.
Agent capabilities
The agent can:

Generate short JavaScript challenges.
Provide contextual hints.
Explain correct answers.
Adapt challenge difficulty.
Celebrate progress.
Generate short Día de Muertos-inspired messages.
Produce a final personalized congratulatory message.
Keep responses concise because the badge has a small display.
Example interaction:
Player encounters the Promises flower.
Agent:
“Una promesa espera su destino. ¿Qué imprimirá este código?”
If the player requests a hint:
“Observa qué valor entrega Promise.resolve().”
When the player succeeds:
“¡Excelente! Has iluminado otra flor del camino.”
AI architecture
Use:

Strands Agents SDK
Amazon Bedrock
AWS Lambda
Amazon API Gateway
AWS CDK
Architecture:
ESP32-S3 → HTTPS → API Gateway → Lambda → Strands Agent → Bedrock
The agent runs in AWS, not on the microcontroller.
Define a compact JSON contract for communication.
Example response:
{
  "type": "challenge",
  "concept": "promises",
  "question": "What does this code print?",
  "code": "Promise.resolve(3).then(console.log)",
  "options": ["3", "undefined", "Error"],
  "correctAnswerId": 0,
  "hint": "Look at the resolved value.",
  "reward": "flower_03"
}
Do not expose correct answers to the device before the player submits a response in online mode. The example is illustrative; design a safer production API contract with server-side validation.
The backend must include:

Authentication
Request validation
Rate limiting
Cost controls
Timeout handling
Error handling
Structured logging without secrets
A fallback when AI services are unavailable
Never embed AWS credentials in firmware.
7. Offline-first experience
The game must be completely playable without Wi-Fi.
Offline mode uses:

Predefined JavaScript questions
Local hints
Local explanations
Local game progression
Online mode enhances the experience with:

AI-generated narrative
Adaptive challenges
Personalized hints
Dynamic congratulatory messages
The user must never lose game progress because the network is unavailable.
Avoid requiring Wi-Fi configuration during initial gameplay.
8. Game architecture
Prefer ESP-IDF and a modular C/C++ implementation for the embedded game.
Suggested modules:

board/ — hardware abstraction
display/ — graphics and display driver
input/ — buttons and debouncing
game/ — state machine, physics, collisions
sprites/ — pixel-art assets
ui/ — menus and question screens
questions/ — offline question bank
network/ — Wi-Fi and HTTPS client
agent/ — backend API client
Keep game logic independent of hardware-specific rendering.
Evaluate LVGL or a lightweight custom renderer after identifying the actual display.
Use fixed-size buffers and memory-conscious design.
Avoid unnecessary heap allocations inside the game loop.
Target smooth animation appropriate to the hardware.
9. Development milestones
Milestone 1 — Hardware discovery
Identify the display controller, resolution, GPIO assignments, and available memory.
Document all verified information and unknowns.
Milestone 2 — Desktop prototype
Create a playable desktop simulation of the game.
The simulator should:

Reproduce the badge’s eventual screen aspect ratio
Support keyboard controls
Render the frog and environment
Include all four JavaScript challenges
Support victory and retry flows
Use a lightweight simulator or browser-based implementation for fast iteration.
Milestone 3 — Embedded rendering
Port the game to ESP32-S3.
Verify display initialization and button handling.
Milestone 4 — Complete offline game
Implement the full level, sprites, animations, questions, and victory screen.
Milestone 5 — AI backend
Implement the Strands agent and AWS infrastructure.
Include local tests and mocked model responses.
Milestone 6 — Wi-Fi integration
Connect the badge to the backend using HTTPS.
Implement offline fallback and secure credential handling.
Milestone 7 — Final polish
Optimize performance, improve animations, and document the setup.
10. Expected deliverables
Create:

requirements.md
design.md
tasks.md
.kiro/steering/product.md
.kiro/steering/tech.md
.kiro/steering/structure.md
README.md
docs/hardware.md
docs/game-design.md
docs/architecture.md
docs/backup-and-recovery.md
Also create the project structure for:

Desktop simulator
ESP32 firmware
AWS backend
Game assets
Tests
11. Engineering principles

Never assume undocumented GPIO mappings.
Never flash the badge without explicit approval.
Never commit firmware backups or secrets.
Build the game incrementally.
Prefer tested, maintainable code.
Keep gameplay functional offline.
Validate all AI-generated data.
Avoid unnecessary cloud costs.
Use authentic, respectful Mexican cultural references.
Prioritize an enjoyable, polished experience over excessive features.
12. Start here
Begin by:

Generating the complete requirements.
Designing the gameplay and state machine.
Creating a technical architecture.
Defining implementation tasks.
Building the first playable desktop prototype.
Do not flash the ESP32 yet. First deliver a working desktop version of Mictlán.js that we can test and refine before porting it to the badge.