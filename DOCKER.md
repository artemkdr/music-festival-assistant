# Docker Guide for Music Festival Assistant

This guide explains how to build, run, and develop the Music Festival Assistant app using Docker. It covers local development, production builds, environment variables and troubleshooting.

---

## 🐳 Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS/Linux)
- (Optional) [Docker Compose](https://docs.docker.com/compose/) if you want to orchestrate DB/services
- Node.js, npm, and Prisma are **not** required on your host

---

## 🚀 Quick Start (Production)

1. **Build the Docker image:**
   ```sh
   docker build -t music-festival-assistant .
   ```
2. **Run the container:**
   ```sh
   docker run --env-file .env -p 3000:3000 music-festival-assistant
   ```
   - The app will be available at [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Local Development with Docker

1. **Start a development container (with hot reload):**
   ```sh
   docker build -t music-festival-assistant-dev -f Dockerfile .
   docker run --env-file .env -p 3000:3000 -v ${PWD}:/app -v /app/node_modules music-festival-assistant-dev npm run dev
   ```
   - Mounts your code for live reload
   - Installs dependencies if needed

2. **With Docker Compose (optional):**
   - Create a `docker-compose.yml` to orchestrate DB and app

---

## ⚙️ Environment Variables
- Copy `.env.example` to `.env` and fill in required values
- Pass with `--env-file .env` or set in Compose
- **Never** commit secrets to git

---

## 🧪 Running Tests in Docker

- To run Vitest tests inside the container:
   ```sh
   docker run --rm --env-file .env music-festival-assistant npm run test
   ```

---

## 🐞 Troubleshooting

- **File changes not detected?**
  - Ensure volume mounts are correct (`-v ${PWD}:/app`)
- **Port already in use?**
  - Change the host port: `-p 3001:3000`
- **DB connection errors?**
  - Check your `.env` and DB container/network
- **Permission issues on Windows?**
  - Use Git Bash or WSL for better volume support

---

## 📚 References
- [Next.js Docker Docs](https://nextjs.org/docs/deployment#docker-image)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Vitest Docker Docs](https://vitest.dev/guide/docker.html)
- [TailwindCSS Docker](https://tailwindcss.com/docs/installation)

---

> For advanced orchestration, see `docker-compose.yml` (if present) or extend this guide.
