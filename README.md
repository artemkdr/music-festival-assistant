# Music Festival Assistant

A TypeScript/Next.js application that helps users discover artists at music festivals based on their preferences.

## Features

🎵 **Festival Discovery**: Enter any festival URL to get personalized artist recommendations  
🎯 **Smart Recommendations**: AI-powered matching based on your music preferences  
📊 **Discovery Modes**: Conservative, Balanced, or Adventurous recommendation styles  
👍 **User Feedback**: Like/dislike system to improve recommendations  
📅 **Performance Details**: Complete schedule information for recommended artists  
🔗 **External Links**: Direct links to Spotify, artist websites, and social media  

## Tech Stack

- **Frontend**: Next.js 15.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Clean Architecture pattern
- **Validation**: Zod schemas for type-safe API contracts
- **Testing**: Vitest for unit and integration tests
- **Logging**: tslog with dependency injection
- **Architecture**: Repository pattern with mock data services

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone and install dependencies**:
```bash
cd music-festival-assistant
npm install
```

2. **Start the development server**:
```bash
npm run dev
```

3. **Open your browser** to [http://localhost:3000](http://localhost:3000)

### Usage

1. **Enter Festival URL**: Paste any festival website URL (currently using mock data)
2. **Select Preferences**: Choose your favorite music genres
3. **Pick Discovery Mode**: 
   - Conservative: Popular, well-known artists
   - Balanced: Mix of popular and emerging artists  
   - Adventurous: Hidden gems and new discoveries
4. **Get Recommendations**: View personalized artist suggestions with performance details
5. **Provide Feedback**: Like/dislike artists to improve future recommendations

## Architecture

The application follows clean architecture principles:

```
src/
├── app/                 # Next.js App Router (pages, layouts, API routes)
├── components/          # React components
├── services/           # Business logic layer
├── repositories/       # Data access layer  
├── controllers/        # API request handlers
├── types/              # TypeScript type definitions
├── schemas/            # Zod validation schemas
├── lib/                # Utility functions and configurations
└── test/               # Test utilities and setup
```

### Key Design Patterns

- **Dependency Injection**: Loose coupling between layers
- **Repository Pattern**: Abstract data access
- **Clean Architecture**: Separation of concerns
- **SOLID Principles**: Maintainable and extensible code

## API Endpoints

### Festival Discovery
`POST /api/festivals/discover`
```json
{
  "festivalUrl": "https://festival-website.com",
  "userPreferences": {
    "genres": ["Electronic", "Indie Rock"],
    "discoveryMode": "balanced"
  }
}
```

### User Feedback
`POST /api/feedback`
```json
{
  "recommendationId": "perf-1",
  "artistId": "artist-1", 
  "rating": "like",
  "sessionId": "session-123"
}
```

## Development

### Running Tests
```bash
npm test           # Run tests once
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

### Code Quality
```bash
npm run lint       # Check linting
npm run lint:fix   # Fix linting issues
npm run type-check # TypeScript type checking
```

### Building for Production
```bash
npm run build      # Build for production
npm start          # Start production server
```

## Mock Data

Currently using mock data for:
- Festival lineup (Summer Sound Festival 2024)
- Artist information with genres and descriptions
- Performance schedules across multiple stages

In production, this would be replaced with:
- Web scraping services for festival data
- Music APIs (Spotify, Last.fm) for artist information
- External recommendation engines

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Real festival website scraping
- [ ] Spotify API integration
- [ ] User accounts and saved preferences
- [ ] Calendar export functionality
- [ ] Mobile app companion
- [ ] Social sharing features
- [ ] Advanced recommendation algorithms
