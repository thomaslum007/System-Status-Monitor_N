# Build and Packaging Instructions

## Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

## Installation
1. Clone the repository
2. Run `npm install`

## Running in Development
```bash
npm start
```

## Building for Production (Windows)
```bash
npm run build
```
The executable will be generated in the `dist` folder.

## Offline Usage
This application is designed to work completely offline. Tesseract.js language data should be pre-downloaded and placed in the `src/assets/tessdata` folder for true offline environments.
\n## Troubleshooting\nIf you see 'Cannot find module src/main.js', ensure you are running 'npm start' from the project root directory where package.json is located. Also, check that your Node.js version is compatible with the dependencies.
