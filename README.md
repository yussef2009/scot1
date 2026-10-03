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
git clone https://github.com/yussef2009/scot1.git
cd scot1
```

### 2. Run the static site

The simplest option is to open `index.html` directly in a browser. For the most reliable behavior—especially for browser media and security policies—use a local HTTP server.

With Python:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Alternatively, use any static hosting service or local web server capable of serving HTML, CSS, and JavaScript files.

### 3. Add your Gemini API key

1. Open the application.
2. Click **Connect API Key**.
3. Paste a Google Gemini API key.
4. Click **Save & Connect**.
5. Upload a video and begin the player scan.

The key is saved in the browser under the `scoutai_gemini_key` local-storage key so it can be reused in future visits in the same browser profile.

## Google Gemini integration

The application communicates directly from the browser with Google Gemini using `fetch()`.

The integration performs two primary operations:

### Player detection

- Captures three keyframes from the local video when possible.
- Sends those JPEG frames to Gemini for rapid player detection.
- Falls back to uploading the full video through the Gemini Files API if keyframe detection fails or finds no players.
- Requests structured player data including IDs, labels, teams, positions, descriptions, traits, colors, and emojis.

### Performance analysis

- Reuses the uploaded file URI when available.
- Sends the video and a sport-specific scouting prompt to Gemini.
- Optionally includes a selected-player context so the model focuses on one athlete.
- Requests a JSON report with scores, metrics, strengths, weaknesses, recommendations, narrative text, and comparisons.
- Cleans code fences and extracts JSON if the model includes surrounding text.

The configured API calls are located in `app.js`, including:

- `detectPlayersWithFrames()`
- `detectPlayersWithGemini()`
- `uploadVideoToGemini()`
- `analyzeWithGemini()`
- `buildPrompt()`

The configured model identifier is `gemini-3.8-flash`. If Google changes model availability or API requirements, update the model identifier and request format in `app.js`.

## Data, privacy, and security

- There is no project backend in this repository.
- Videos are processed in the browser and uploaded directly to Google Gemini when analysis is requested.
- The Gemini API key is stored in browser `localStorage`; it is not stored in a repository or project server.
- Anyone with access to the browser profile may be able to inspect the stored key. Do not use this storage approach for shared, public, or untrusted devices.
- Never commit an API key to source control.
- Do not upload private, sensitive, or personally identifiable footage unless you have the appropriate consent and understand the third-party processing terms.
- AI-generated scores and observations are estimates based on the quality and content of the supplied footage. They should not be treated as a substitute for qualified coaching, medical advice, officiating, or professional recruitment decisions.
- For production use, consider moving API calls behind a secure server, adding authentication and rate limiting, validating uploads server-side, and implementing a formal privacy policy and retention policy.

## Report scoring

Metric and overall scores use a 0–100 scale. The UI maps scores to visual tiers as follows:

| Score | Tier / color |
| --- | --- |
| 85–100 | S / green |
| 70–84 | A / cyan |
| 55–69 | B / indigo |
| 40–54 | C / amber |
| 0–39 | D / rose |

The prompt describes the score calibration as:

- 50: average amateur level
- 70: good club-player level
- 85+: elite level

These values are AI-generated estimates and may vary depending on footage quality, camera angle, sport, context, and model output.

## Downloaded reports

The **Download Report** action creates a plain-text file named using the player summary and selected sport, for example:

```text
ScoutAI_Report_Dynamic_Left-footed_Winger_football.txt
```

The downloaded report includes the generation date, sport, player information, overall assessment, metrics, strengths, improvement areas, recommendations, narrative, and professional comparisons.

## Troubleshooting

### The app asks for an API key

Enter a valid Gemini API key using **Connect API Key**. The application cannot scan or analyze footage without one.

### Player detection fails

- Confirm that the video is readable by the browser.
- Use a shorter or clearer clip with the player visible.
- Make sure the player is not consistently obscured or too distant.
- Retry the scan.
- Use **Proceed to Full Video Analysis** when the fallback option is offered.

### Analysis returns an API error

- Check that the API key is valid and has the required access.
- Confirm that the configured model is available for the key and API version.
- Check the browser developer console and network tab for the API response.
- Confirm that the video has finished processing before analysis begins.
- Try a smaller video file or a shorter clip.

### Charts do not appear

Chart.js is loaded from jsDelivr. Confirm that the browser has internet access and that the CDN request is not blocked.

### The local preview does not work when opening the file directly

Serve the project through a local HTTP server instead of using a `file://` URL:

```bash
python3 -m http.server 8000
```

## Development notes

- The application has no build step or package manager configuration.
- Keep the application entry points at the repository root unless the script and stylesheet references in `index.html` are updated.
- Add or modify sports in `SPORT_CONFIG` in `app.js`, then update the corresponding sport buttons in `index.html`.
- If changing the AI response schema, update the prompt, parser, renderer, and report downloader together.
- If changing report DOM IDs, update both the static markup in `index.html` and the dynamic multi-player markup generated by `getReportHTML()`.
- Use the browser developer console for client-side errors and API diagnostics.
- Before deploying changes, test upload, drag-and-drop, API-key persistence, player detection, single-player analysis, multi-player analysis, chart rendering, report download, and reset flows.

## Deployment

Because ScoutAI is a static site, it can be deployed to any service that serves static files, including GitHub Pages, Netlify, Vercel static hosting, Cloudflare Pages, or a conventional web server.

Deploy these files together:

- `index.html`
- `app.js`
- `style.css`

No server-side environment variables are currently used. If the project is adapted for production, avoid exposing long-lived API keys in client-side code or browser storage.

## Limitations

- Analysis quality depends on video resolution, camera angle, lighting, visibility, sport context, and the Gemini model.
- The application does not independently verify AI observations or scores.
- There is no user account system, database, cloud report history, server-side validation, or centralized key management.
- Reports are downloaded as plain text rather than PDF or a persisted web document.
- The current implementation depends on external Google Fonts, Chart.js, and Gemini services.
- API model names and API behavior may change over time.

## Contributing

Contributions are welcome. A typical contribution workflow is:

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes.
4. Test the complete browser flow locally.
5. Confirm that no API keys or private footage are committed.
6. Open a pull request describing the change and how it was tested.

## License

No license file is currently included in this repository. Until a license is added, the project should be treated as all rights reserved. Add an appropriate `LICENSE` file before redistributing or accepting external contributions under defined terms.

## Acknowledgements

- Google Gemini for multimodal AI analysis.
- Chart.js for report visualizations.
- Google Fonts for the Outfit and JetBrains Mono typefaces.

---

Built as **ScoutAI — AI-Powered Sports Intelligence**.
