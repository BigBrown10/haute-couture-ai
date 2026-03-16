# Zaute AI — Brutally Honest 3D Fashion Designer

Welcome to **Zaute AI**, a state-of-the-art 3D fashion orchestration platform powered by Gemini 2.5 and Gemini 3.1. Zaute combines real-time multimodal interaction with high-fidelity fashion generation, allowing users to collaborate with AI stylists (like Gina and Despina) to create, critique, and visualize the future of fashion.

## 🚀 Purpose
The platform bridges the gap between AI intuition and high-end fashion design. It uses real-time audio and vision to create a seamless feedback loop where the AI doesn't just "chat"—it thinks, sketches, and renders fashion concepts in a 3D studio environment.

## 🛠️ Tech Stack (A-Z)

### Frontend
- **Framework**: Next.js 16 (React 19)
- **3D Engine**: Three.js with `@pixiv/three-vrm` for real-time 3D avatar rendering.
- **Audio**: `wawa-lipsync` for high-fidelity audio synchronization with 3D model expressions.
- **Styling**: Vanilla CSS & Modern Typography.

### Backend & Orchestration
- **API Layers**: Next.js API Routes for image processing and asset management.
- **Real-time Server**: Standalone Node.js server using **Socket.IO** for low-latency agent-client communication.
- **Orchestration**: Custom Gemini Live SDK implementing the v1alpha Bidi WebSocket protocol.

### AI Models (Google Gemini)
- **Gemini 2.5 Flash Native Audio**: Powers the real-time voice, vision, and internal reasoning of the agents.
- **Gemini 3.1 Flash Image**: Handles "Nano Banana" (Virtual Try-On) and high-fashion sketch generation.

### Cloud & DevOps
- **Infrastructure**: Google Cloud Platform (GCP).
- **Deployment**: Google Cloud Run (Serverless GPU-ready container hosting).
- **CI/CD**: Google Cloud Build with GitHub trigger integration.
- **Containerization**: Docker.

## 🏗️ Architecture
For a detailed look at the system architecture, see our [Platform Architecture Diagram](./platform_architecture.md).

## 🏃 Getting Started

### Prerequisites
- Node.js 18+
- A valid `GEMINI_API_KEY` in your `.env` file.

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
You need to run both the frontend and the orchestration server:

1. **Start the Frontend**:
   ```bash
   npm run dev
   ```
2. **Start the Orchestration Server**:
   ```bash
   npm run dev:server
   ```
   *The server will listen on port 3001 for Socket.IO connections.*

Open [http://localhost:3100](http://localhost:3100) (or your configured port) to enter the studio.

## 🖼️ Primary Features
- **Real-time 3D Stylist**: Interact with VRM avatars that respond to your voice and text.
- **Nano Banana (VTO)**: Generate virtual try-on images on a sculptural mannequin.
- **Fashion Sketching**: Ask the AI to visualize high-fashion concepts on the fly.
- **Studio Interface**: A premium, "brutally honest" environment for fashion exploration.

---
*Created with ❤️ by the Zaute Collections team. Finalized by Antigravity AI.*
