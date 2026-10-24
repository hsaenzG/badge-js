Project: Hazel Badge OS
You are a senior embedded systems engineer specializing in ESP32-S3, ESP-IDF, embedded graphics, and interactive applications. You also have experience with AWS serverless architectures, Amazon Bedrock, and the Strands Agents SDK.
Help me build Hazel Badge OS, a custom interactive firmware for my JSConf México 2026 conference badge manufactured by Electronic Cats.
I want to use spec-driven development. Start by researching the hardware, defining requirements, designing the architecture, and creating an incremental implementation plan. Do not flash the board until the hardware configuration has been verified and I explicitly approve it.
1. Hardware: verified facts
I am developing on a MacBook Air running macOS.
The badge has:

ESP32-S3, QFN56, revision v0.2
Dual-core CPU, up to 240 MHz
Wi-Fi and Bluetooth LE
8 MB external flash, Quad SPI, 3.3 V
USB-C connection using native USB-Serial/JTAG
Integrated color display, exact controller and resolution not yet confirmed
Four front buttons labeled UP, DOWN, BACK, SELECT
Rear BOOT and RST buttons
Physical ON/OFF switch
Original JSConf firmware currently running and showing a conference splash screen
The USB serial device detected on macOS is:
/dev/cu.usbmodem101
This path may change after reconnecting the board.
Existing development environment
Python virtual environment:
~/esp32-dev/.venv
esptool version: 5.6.0
Successful commands:
python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 chip-id
python -m esptool --chip esp32s3 --port /dev/cu.usbmodem101 flash-id
The bootloader image identifies:

ESP-IDF v5.5.5
Flash size: 8 MB
Flash frequency: 80 MHz
Flash mode: DIO
Valid image checksum and validation hash
Firmware backup
A full 8 MB flash dump has already been created:
~/esp32-dev/backups/jsconf-original.bin
The beginning of the backup passed esptool image-info validation. This does not guarantee the integrity of the entire dump.
Critical safety requirements:

Never erase or overwrite the original firmware without explicit permission.
Never execute erase-flash automatically.
Never execute write-flash, flash, or any equivalent programming command without explicit permission.
Keep the backup outside the Git repository.
Do not upload the flash dump or any device credentials to external services.
Before flashing, document the partition table, flash settings, expected changes, and a tested recovery procedure.
Never assume the display controller, GPIO pin assignments, backlight configuration, or button wiring.
2. Hardware discovery: first milestone
Research the specific Electronic Cats JSConf México 2026 badge.
Look for official repositories, schematics, pin mappings, display driver details, firmware sources, and examples.
The board appears to reference a repository named:
ElectronicCats/badge_JSCON_2026
This repository has not yet been verified as publicly accessible. Do not assume that it exists or contains the correct source.
If documentation is unavailable:

Explain which details are still unknown.
Propose safe, read-only hardware identification steps.
Inspect existing firmware metadata where useful.
Consider how to identify the display controller and button wiring without damaging the hardware.
Request photographs, markings, or other information from me when necessary.
Do not invent pin mappings or use mappings from unrelated Electronic Cats boards without verification.
Deliver a hardware discovery report before attempting device-specific display initialization.
3. Product vision
The application should turn my conference badge into a small, interactive personal identity and developer experience device.
The product has three phases:
Phase 1: Animated digital business card
Phase 2: Single-level frog minigame inspired by Strands Agents
Phase 3: Wi-Fi-connected AI experience using Strands Agents and AWS
Each phase must work independently before proceeding to the next.
4. Phase 1: Animated digital business card
Reference GitHub profile:
https://github.com/hsaenzG
Reference profile README:
https://github.com/hsaenzG/hsaenzG/blob/main/README.md
Recreate the visual language of my existing GitHub dashboard.
Visual design

Background: #0D0D0D
Primary accent: #F5E000
White and gray secondary text
Monospaced terminal-inspired typography
JetBrains Mono or an embedded-friendly equivalent
Minimalist, hacker-style aesthetic
Smooth, readable animations optimized for the badge’s actual display
My GitHub README uses a typing animation based on readme-typing-svg.
Recreate this effect natively in firmware, without requiring internet access.
Animated content
The startup sequence should progressively type:
>_ LATAM Developer Advocate @ AWS
>_ Serverless + GenAI + Comunidad
>_ Empoderando builders en LATAM
Then show my identity:
>_ whoami
Hazel Sáenz
Developer Advocate @ AWS
SERVERLESS · GENAI · LATAM
The interface should support accented characters where possible.
Digital card content
Name: Hazel Sáenz
Role: LATAM Developer Advocate @ AWS
Specialties:

Serverless
Generative AI
Amazon Bedrock
Developer Communities
Public links:

Website: https://hazelsaenz.tech
GitHub: https://github.com/hsaenzG
LinkedIn: https://www.linkedin.com/in/hazelsaenz/
If screen resolution permits, consider displaying a QR code linking to my website or GitHub.
Navigation
Use the four physical buttons:

UP: previous menu item
DOWN: next menu item
SELECT: open or confirm
BACK: return to previous screen
Include button debouncing, clear focus indicators, and sensible behavior when buttons are held.
Functional requirements

Works completely offline
Fast boot time
Smooth typing animation
No unnecessary network initialization
Graceful handling of display constraints
No dynamic allocation in animation loops unless justified
Clear separation between display drivers, input handling, application state, and UI rendering
Phase 1 acceptance criteria:
The badge boots into the animated introduction, displays my digital card, and responds reliably to all four buttons.
5. Phase 2: Strands Frog Quest
Reference:
https://strandsagents.com/
Build a simple, single-level arcade game featuring a small frog character inspired by the Strands Agents mascot.
Research the official Strands branding assets and usage guidelines before incorporating the original logo. If official artwork cannot be reused, create a clearly original frog character inspired by the general theme.
Game concept
Working title: Frog Quest: Build Your Agent
The player controls a frog navigating a small level.
The frog must collect items representing agent-building concepts:

Model
Tools
Memory
Guardrails
The player wins after collecting the required items and reaching the goal.
Controls

UP: jump
DOWN: crouch
SELECT: start / confirm
BACK: pause / return to menu
Adapt mechanics to the actual screen size and performance.
Technical constraints

One short level
Pixel-art or sprite-based rendering
Simple collision detection
Predictable game loop
No Wi-Fi requirement
Minimal memory footprint
Clear win and retry screens
Phase 2 acceptance criteria:
The minigame is playable using only the physical badge buttons, runs smoothly, and can be launched from the main menu.
6. Phase 3: AI integration
After the offline experience works, add an optional Wi-Fi-connected feature.
Preferred cloud stack:

AWS Lambda
Amazon API Gateway
Strands Agents SDK
Amazon Bedrock
AWS CDK for infrastructure as code
Proposed feature
When the player completes Frog Quest, the badge can request a short AI-generated message or a tiny developer challenge from an agent running in AWS.
Example:
>_ mission complete
Agent assembled!
Next challenge:
Build a tool with Lambda.
The ESP32 should not run a large language model locally.
Instead:

The badge connects to Wi-Fi.
It makes a secure HTTPS request to a backend.
API Gateway invokes a Lambda function.
Lambda executes a Strands agent using Amazon Bedrock.
The backend returns a compact JSON response.
The badge displays the result.
Security requirements

Never embed AWS credentials in firmware.
Never expose unrestricted Bedrock access through a public API.
Use appropriate authentication, throttling, request validation, and cost controls.
Avoid logging secrets or personal data.
Provide offline fallback behavior.
Keep the backend optional and separate from the game engine.
7. Technical architecture
Prefer ESP-IDF, ideally aligned with the existing firmware’s ESP-IDF v5.5.5 toolchain where practical.
Evaluate LVGL for the UI, but only adopt it after confirming the display hardware, memory constraints, and performance requirements.
Use modular components for:

Board support package
Display driver
Button input
Animation engine
UI navigation
Digital card
Game engine
Asset management
Wi-Fi and HTTP client
Backend integration
Keep hardware-specific code separate from application logic.
Design for testability: where possible, make the animation, navigation, and game logic runnable in host-based tests without requiring the physical badge.
8. Development workflow
Create and maintain:

requirements.md
design.md
tasks.md
.kiro/steering/product.md
.kiro/steering/tech.md
.kiro/steering/structure.md
README.md
docs/hardware.md
docs/backup-and-recovery.md
Use Git with meaningful commits.
Build incrementally.
Suggested milestones:

Hardware discovery and verification
ESP-IDF environment setup
Minimal display initialization
Button input verification
Animated terminal UI
Digital card and navigation
Frog sprite and game loop
Complete single-level game
AWS backend
Secure AI integration
9. How I want you to work
Act as a collaborative engineering partner.
Before implementing a major feature:

Explain the design choice.
Identify assumptions and unknowns.
Provide alternatives when relevant.
Define acceptance criteria.
Implement the smallest testable increment.
Explain how to verify the result.
Prioritize a working, reliable badge over unnecessary complexity.
Do not generate large amounts of unverified embedded code based on guessed hardware specifications.
Start now by generating the project spec, performing hardware discovery, and proposing the first implementation milestone. Do not flash the board yet.