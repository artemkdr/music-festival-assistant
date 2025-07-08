
# Music Festival Assistant

Modern, modular TypeScript/Next.js app for discovering artists and planning your music festival experience. Built with Clean Architecture, strong validation, and a focus on extensibility.

## Features

- **Festival Discovery**: Get artist recommendations for supported festivals
- **Personalized Matching**: AI-powered suggestions based on genres and discovery mode
- **Flexible Discovery Modes**: Conservative (popular), Balanced (mix), Adventurous (hidden gems)
- **Performance Schedules**: See when and where artists perform
- **External Links**: Quick access to Spotify, artist sites, etc
- **Admin Tools**: (WIP) Manage artists and festivals via admin UI

---

## Tech Stack

- **Frontend**: Next.js 15+, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Clean Architecture
- **Database**: Prisma ORM (schema defined, migration scripts ready)
- **AI Integration**: Google Vertex AI for recommendations
- **Validation**: Zod schemas for type-safe API contracts
- **Testing**: Vitest for unit and integration tests
- **Logging**: tslog with dependency injection throughout
- **Architecture**: Layered services, Repository pattern, DI container
- **External APIs**: Spotify integration for artist data

## Getting Started

### Prerequisites

- Node.js 19+ 
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

1. **Festival Discovery**: Browse available festivals
2. **Set Preferences**: Select your favorite music genres from the grid
3. **Choose Discovery Mode**: 
   - Conservative: Popular, well-known artists
   - Balanced: Mix of popular and emerging artists  
   - Adventurous: Hidden gems and new discoveries
4. **Get AI Recommendations**: View personalized artist suggestions with performance details
5. **Admin Access**: Use `/admin` to manage artists and festivals (development feature)

## API Endpoints

### Core Discovery Flow
- `GET /api/discover/festivals` - List available festivals with summary info
- `GET /api/discover/festivals/[id]` - Get detailed festival information
- `GET /api/discover/festivals/[id]/genres` - Get genres available at a specific festival
- `POST /api/discover/recommendations` - Get AI-powered personalized recommendations

### Authentication & User Management
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `GET /api/auth/profile` - Get user profile

### Admin - Artist Management
- `GET /api/admin/artists` - List all artists
- `GET /api/admin/artists/search?q={query}` - Search artists by name (up to 10 results)
- `GET /api/admin/artists/[id]` - Get artist details by ID
- `PUT /api/admin/artists/[id]` - Update artist information
- `GET /api/admin/artists/[id]/acts` - Get festival acts for an artist

### Admin - Festival Management  
- `GET /api/admin/festivals` - List all festivals
- `GET /api/admin/festivals/[id]` - Get festival details by ID
- `POST /api/admin/festivals/[id]/link-artist-to-act` - Link festival acts with artists
- `GET /api/admin/festivals/cache/[cacheId]` - Get cached festival data

### Admin - Data Crawling
- `POST /api/admin/crawl/artists` - Crawl and import artist data (by festival or artist names)
- `POST /api/admin/crawl/artist` - Crawl individual artist data
- `POST /api/admin/crawl/festival` - Crawl festival lineup data

### Admin - Statistics & External APIs
- `GET /api/admin/stats` - Get system statistics (artists, festivals, etc.)
- `GET /api/admin/spotify/search?q={query}` - Search Spotify for artist data
```

## Development

### Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables (copy .env.example to .env.local)
# Configure Google Vertex AI credentials if needed

# Run database migrations (when ready)
npx prisma migrate dev

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint:fix     # Check code quality and fix issues (prettier + eslint)
npm run type-check   # TypeScript validation
```

### Code Quality & Standards
- **TypeScript**: Strict type checking enabled, no `any` types
- **ESLint + Prettier**: Consistent code formatting
- **Clean Architecture**: Modular, testable design
- **Dependency Injection**: Loose coupling between layers
- **File Size Limit**: Keep files under 300 lines, split when needed

## Data Sources & Integration

### Current Implementation
- **Mock Data**: Possibility to use mock data for development
- **Local Storage**: Possibility to store everything locally in json files
- **Neon Database + Prisma ORM**: Neon Postgres + Prisma schema
- **Spotify API**: Artist search and profile linking (admin features)
- **LLM Providers (Vertex, OpenAI, Groq..)**: Recommendation engine integration


## Contributing

We follow clean code practices and modular architecture. Please ensure your contributions align with these guidelines:

### Development Guidelines
1. **Architecture**: Follow Clean Architecture patterns, use dependency injection
2. **TypeScript**: Strict typing, no `any` types allowed
3. **File Organization**: Keep files under 300 lines, use kebab-case naming
4. **Testing**: Write tests for business logic and API endpoints
5. **Documentation**: Include JSDoc comments for complex functions

### Contribution Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow coding standards (TypeScript strict, ESLint, Prettier)
4. Add tests for new functionality
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request with detailed description

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap
- [x] Clean Architecture foundation with DI
- [x] AI-powered recommendations via Google Vertex / OpenAI
- [x] Admin panel for artist/festival management
- [x] Complete Prisma database integration
- [ ] Unit tests for all business logic and UI
- [ ] User authentication and profiles
- [ ] Enhanced recommendation algorithms
- [x] Multi-language support