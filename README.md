# ScoutAI

ScoutAI is a browser-based, AI-powered sports performance analysis application. Upload sports footage, select the sport, identify one or more athletes, and generate a detailed scouting report using Google Gemini vision AI.

The project is intentionally lightweight: it is a static front-end application built with HTML, CSS, and vanilla JavaScript. There is no application server, database, build system, or framework required.

> **Project status:** This repository contains a front-end prototype/application. AI analysis requires a valid Google Gemini API key and an internet connection.

## Features

- Modern responsive dark-themed interface branded as ScoutAI.
- Drag-and-drop or button-based video upload.
- Local video preview before analysis.
- Sport-specific analysis criteria.
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
- Progress indicators for upload, processing, player selection, metric generation, and report creation.
- Retry and fallback flows when player detection is unsuccessful.
- API key modal with password visibility toggle.
- API key persistence through browser `localStorage`.
- Responsive layouts for desktop, tablet, and mobile screens.
- Smooth scrolling, animated backgrounds, glass-style cards, charts, toasts, and interactive UI states.

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

## How the application works

1. **Choose a sport** from the supported sports grid.
2. **Upload a video** by dropping it into the upload area or selecting it from the file picker.
3. **Preview the video** locally in the browser.
4. **Connect Google Gemini** by entering an API key through the `Connect API Key` button.
5. **Detect players.** ScoutAI first extracts several keyframes locally and sends them to Gemini for player identification. If that approach does not produce a result, it uploads the video to the Gemini Files API and performs detection against the uploaded video.
6. **Select players.** For multiple-player footage, select one or more detected players. A single detected player can proceed directly to analysis.
7. **Generate the report.** The selected footage and sport-specific prompt are sent to Gemini. The response is expected as structured JSON.
8. **Review the results.** The report is rendered with charts, score cards, metrics, strengths, weaknesses, recommendations, narrative analysis, and comparisons.
9. **Download or start again.** Download the report as a `.txt` file or analyze another video.

## Repository structure

```text
.
├── index.html   # Application markup, sections, modals, upload UI, and report layout
├── app.js       # Application state, Gemini integration, player detection, analysis, rendering, and downloads
├── style.css    # Responsive visual design system and component styles
└── README.md    # Project documentation
```

## Technology stack

- HTML5
- CSS3
- Vanilla JavaScript
- Google Gemini API
- Gemini Files API for video uploads
- Chart.js via jsDelivr CDN
- Google Fonts:
  - Outfit
  - JetBrains Mono
- Browser APIs:
  - `File` and `FileReader`-style file handling
  - Drag-and-drop events
  - `URL.createObjectURL()` for local video previews
  - Canvas and video APIs for keyframe extraction
  - `fetch()` for Gemini requests
  - `localStorage` for the API key
  - Blob downloads for generated reports

## Requirements

- A modern browser with support for HTML5 video, Canvas, ES6 JavaScript, `fetch`, and `localStorage`.
- Internet access for Google Gemini requests and CDN assets.
- A Google Gemini API key with access to the configured Gemini model and Files API.
- A supported video file. The interface advertises support for MP4, MOV, AVI, and WEBM files with a maximum size of 100 MB.

## Getting started

### 1. Clone the repository

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

The configured model list in `app.js` starts with `gemini-3.8-flash` and automatically falls back to other Flash models when a model is unavailable or under high demand.

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
