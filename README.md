# ScoutAI

ScoutAI is a browser-based, AI-powered sports performance analysis application. Upload sports footage, select the sport, identify one or more athletes, and generate a detailed scouting report using Google Gemini vision AI.

The project is intentionally lightweight: it is a static front-end application built with HTML, CSS, and vanilla JavaScript. There is no application server, database, build system, or framework required.

> **Project status:** This repository contains a complete front-end application with Dynamic Model Resolution. AI analysis requires a valid Google Gemini API key and an internet connection.

## Features

- Modern responsive dark-themed interface branded as ScoutAI.
- **Dynamic Model Resolution Engine**: Built-in priority fallback list across stable models (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-2.5-flash-lite` → `gemini-1.5-pro`). If the primary or requested model is unavailable (404), rate-limited (429), or overloaded (503), the engine automatically switches to a working alternative without interrupting the user.
- Interactive model settings modal with live fallback testing and active model badge.
- Drag-and-drop or button-based video upload.
- Local video preview before analysis.
- Sport-specific analysis criteria across 10 major sports.
- AI-powered player detection from video keyframes or uploaded video files.
- Support for analyzing a single player or multiple selected players.
- Individual player cards containing:
  - Player label or jersey number
  - Team or side
  - Position or role
  - Visual description
  - Standout trait
  - Team color and emoji
- AI-generated scouting reports containing:
  - Overall score from 0–100
  - Overall grade from S to D
  - Player summary and one-line assessment
  - Descriptive tags
  - Sport-specific performance metrics
  - Metric notes and visual score bars
  - Performance radar chart
  - Metric breakdown bar chart
  - Strengths
  - Areas for improvement
  - Actionable training recommendations
  - Full scouting narrative
  - Professional player comparisons
  - Potential rating, position, and age category
- Multi-player report tabs for reviewing reports one athlete at a time.
- Downloadable plain-text scouting reports.
- Resilient JSON extraction and self-healing parser for truncated or markdown-wrapped model responses.
- Progress indicators for upload, processing, player selection, metric generation, and report creation.
- Retry and fallback flows when player detection is unsuccessful.
- API key modal with password visibility toggle and model selector.
- API key persistence through browser `localStorage`.
- Responsive layouts for desktop, tablet, and mobile screens.

## Supported sports

ScoutAI currently provides tailored metrics for the following sports:

| Sport | Example analysis areas | Example roles |
| --- | --- | --- |
| Football / Soccer | Pace, dribbling, shooting, passing, defending, stamina, vision, positioning | Attacker, midfielder, defender |
| Basketball | Shooting, ball handling, passing, defense, athleticism, basketball IQ, rebounding, speed | Guard, forward, center |
| Tennis | Serve, forehand, backhand, volley, footwork, mental strength, consistency, power | Baseline player, net player |
| Swimming | Technique, stroke rate, turn efficiency, breathing, endurance, start, kick, arm pull | Freestyle, backstroke, and other events |
| Athletics | Speed, acceleration, technique, endurance, reaction time, form, stride length, efficiency | Sprinter, long-distance runner, jumper |
| Volleyball | Serving, spiking, blocking, setting, digging, positioning, teamwork, jump | Setter, libero, spiker |
| Boxing | Jab, cross, hook, defense, footwork, chin, power, stamina | Orthodox, southpaw |
| Gymnastics | Flexibility, balance, strength, coordination, artistry, landings, difficulty, execution | Artistic, rhythmic |
| Cycling | Power output, cadence, climbing, sprinting, aerodynamics, endurance, cornering, recovery | Climber, sprinter, all-rounder |
| Baseball | Batting average, power, contact, speed, fielding, arm strength, pitch velocity, control | Pitcher, batter, fielder |

The sport configuration, metric names, radar labels, emojis, and role descriptions are defined in `app.js` in the `SPORT_CONFIG` object.

## Dynamic Model Resolution

The application implements an intelligent **Dynamic Model Resolution** architecture to guarantee maximum reliability and continuous uptime:

1. **Priority List of Stable Models**:
   - `gemini-2.5-flash`: Primary high-intelligence fast multimodal model.
   - `gemini-2.0-flash`: Proven multimodal workhorse.
   - `gemini-1.5-flash`: Universally supported reliable fallback with wide global quota.
   - `gemini-2.5-flash-lite`: Ultra-fast lightweight fallback.
   - `gemini-2.0-flash-lite`: Fast lightweight fallback.
   - `gemini-1.5-pro`: Deep reasoning Pro fallback.

2. **Automatic Failure Detection & Seamless Fallback**:
   - If the requested or primary model returns `404 Not Found` (such as experimental, obsolete, or non-existent identifiers like `gemini-3.8-flash`), the engine detects the unavailability and automatically promotes the next working alternative from the priority list.
   - If a model encounters capacity/quota limits (`429 Too Many Requests` or `503 Service Unavailable`), the engine switches to alternative stable models instead of leaving the user stalled.
   - Successful fallback updates the active working model in `localStorage` and the UI badge so subsequent requests execute immediately against the working alternative.

3. **Live Testing & Verification**:
   - The settings modal includes a **Test Dynamic Resolution** button. Users can test any primary model (including testing invalid models like `gemini-3.8-flash`) to verify live that the system automatically resolves to a working stable alternative.

## Technology stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Google Gemini API (`v1beta:generateContent`)
- Gemini Files API for video uploads
- Chart.js via jsDelivr CDN
- Google Fonts: Outfit & JetBrains Mono

## Getting started

Run locally using any static web server:

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Open `http://localhost:8000` in your browser, connect your Gemini API key, and begin analyzing sports footage.
