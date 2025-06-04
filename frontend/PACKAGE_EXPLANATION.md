# Understanding Your Frontend Project's Package.json

## Basic Project Information
- `name`: "frontend" - The name of your project
- `private`: true - Prevents accidental publishing to npm
- `version`: "0.0.0" - Current version of your project
- `type`: "module" - Specifies that this project uses ES modules (modern JavaScript)

## Available Scripts
These are commands you can run using `npm run <script-name>`:
- `dev`: Starts the development server with hot reload (changes appear instantly)
- `build`: Creates a production-ready build of your application
- `lint`: Runs ESLint to check your code for potential errors
- `preview`: Lets you preview the production build locally

## Production Dependencies
These packages are needed to run your application:

### Animation and UI Libraries
- `@gsap/react` (^2.1.2): React wrapper for GSAP animation library
- `gsap` (^3.13.0): Professional animation library for smooth animations
- `lucide-react` (^0.503.0): Beautiful icons for React components
- `react-icons` (^5.5.0): Popular icon library with many icon sets
- `remixicon` (^4.6.0): Another comprehensive icon library

### React and Routing
- `react` (^19.0.0): The core React library for building user interfaces
- `react-dom` (^19.0.0): React's DOM and server renderers
- `react-router-dom` (^7.4.1): Library for handling navigation in React apps

### UI/UX Components
- `react-hot-toast` (^2.5.2): For showing toast notifications
- `react-toastify` (^11.0.5): Another library for toast notifications

### Maps and Location
- `@react-google-maps/api` (^2.20.6): For integrating Google Maps into your app

### HTTP and Real-time Communication
- `axios` (^1.9.0): HTTP client for making API calls
- `socket.io-client` (^4.8.1): For real-time, bidirectional communication

### PDF and Document Handling
- `html2canvas` (^1.4.1): Converts HTML elements to canvas
- `jspdf` (^2.5.2): For generating PDF documents

### Payment Processing
- `razorpay` (^2.9.6): For integrating Razorpay payment gateway

## Development Dependencies
These packages are only needed during development:

### TypeScript Type Definitions
- `@types/react` (^19.0.10): TypeScript definitions for React
- `@types/react-dom` (^19.0.4): TypeScript definitions for React DOM

### Build Tools
- `@vitejs/plugin-react` (^4.3.4): Vite plugin for React support
- `vite` (^6.2.0): The build tool and development server

### Code Quality and Linting
- `@eslint/js` (^9.21.0): Core ESLint functionality
- `eslint` (^9.21.0): JavaScript linter for code quality
- `eslint-plugin-react-hooks` (^5.1.0): ESLint rules for React Hooks
- `eslint-plugin-react-refresh` (^0.4.19): ESLint rules for React Refresh

### CSS Processing
- `autoprefixer` (^10.4.21): Adds vendor prefixes to CSS
- `postcss` (^8.5.3): Tool for transforming CSS
- `tailwindcss` (^4.1.7): Utility-first CSS framework
- `@tailwindcss/vite` (^4.1.7): Vite plugin for Tailwind CSS

## How to Use This Project

1. **Installation**
   ```bash
   npm install
   ```
   This will install all dependencies listed above.

2. **Development**
   ```bash
   npm run dev
   ```
   This starts the development server. Your app will be available at http://localhost:3000

3. **Building for Production**
   ```bash
   npm run build
   ```
   This creates an optimized production build in the `dist` directory.

4. **Preview Production Build**
   ```bash
   npm run preview
   ```
   This lets you preview the production build locally.

5. **Code Quality Check**
   ```bash
   npm run lint
   ```
   This checks your code for potential issues.

## Important Notes
1. The `^` symbol before version numbers means "compatible with version". It will install the latest minor/patch version but not major versions.
2. Some version numbers might need updating as they're currently set to non-existent versions (like React 19.0.0).
3. You have two toast notification libraries installed - you might want to stick to just one.
4. The Tailwind CSS setup might need adjustment as the current version (4.1.7) doesn't exist. 