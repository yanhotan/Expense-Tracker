# Expense Tracker

A modern expense tracking application with spreadsheet-style entry, real-time analytics, and multi-sheet management.

## Tech Stack

- **Ruby on Rails** 7.1 | **Ruby** 3.2.2+
- **PostgreSQL** - Database
- **Hotwire** (Turbo + Stimulus) - Frontend interactivity
- **Tailwind CSS** - Styling
- **Devise + OmniAuth** - Authentication (Google OAuth)
- **Chartkick** - Analytics charts

## Features

- Spreadsheet-style expense entry with real-time calculation
- Category management & analytics (daily/monthly/category breakdown)
- Multiple expense sheets with PIN protection
- Dark/light theme toggle
- Google OAuth integration
- Responsive design

## Setup

### Prerequisites

- Ruby 3.2.2+ (via rbenv: `rbenv install 3.2.2`)
- PostgreSQL (`brew install postgresql && brew services start postgresql`)
- Bundler (`gem install bundler`)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd expense-tracker

# Set Ruby version
rbenv local 3.2.2

# Install dependencies
bundle install

# Setup database
bin/rails db:create db:migrate db:seed

# Build assets
bin/rails tailwindcss:build

# Start server
bin/rails server
```

Access at `http://localhost:3000`

### Configuration

Create `.env` file (optional):

```bash
# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Database (uses config/database.yml by default)
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

**Google OAuth Setup:**
1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add redirect URI: `http://localhost:3000/users/auth/google_oauth2/callback`
3. Copy credentials to `.env`

## Project Structure

```
app/
├── controllers/       # Request handlers
│   ├── api/v1/       # REST API endpoints
│   └── users/        # Devise customizations
├── models/           # Business logic & database models
├── views/            # ERB templates
├── javascript/       # Stimulus controllers
└── assets/           # Stylesheets & images

config/
├── routes.rb         # URL routing
├── database.yml      # Database configuration
├── initializers/     # App configuration (CORS, Devise)
└── environments/     # Environment-specific settings

db/
├── migrate/          # Database migrations
└── schema.rb         # Current database structure

public/               # Static files & compiled assets
```

## Development

```bash
# Terminal 1: Rails server
bin/rails server

# Terminal 2: Auto-rebuild Tailwind CSS
bin/rails tailwindcss:watch

# Run tests
bin/rails test

# Database commands
bin/rails db:reset      # Reset & reseed
bin/rails db:migrate    # Run migrations
bin/rails db:seed       # Load seed data
```

## Deployment

### Railway (Recommended)

1. **Push to GitHub/GitLab**
   ```bash
   git push origin main
   ```

2. **Create Railway project**
   - Go to [railway.app](https://railway.app)
   - Create new project → Deploy from GitHub
   - Select repository

3. **Add PostgreSQL database**
   - Add service → PostgreSQL
   - Railway auto-configures `DATABASE_URL`

4. **Set environment variables**
   ```bash
   RAILS_ENV=production
   RAILS_SERVE_STATIC_FILES=true
   RAILS_LOG_TO_STDOUT=true
   SECRET_KEY_BASE=<run: bin/rails secret>
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

5. **Deploy**
   - Railway auto-deploys on git push
   - Runs: `bundle install`, `db:migrate`, `assets:precompile`

**Important:** Add your Railway domain to `config/environments/production.rb`:
```ruby
config.hosts << "your-app.up.railway.app"
```

### Alternative Platforms

- **Render**: Similar to Railway, auto-detects Rails
- **Heroku**: Add `Procfile` with `web: bundle exec puma -C config/puma.rb`
- **Docker**: Use included `Dockerfile` and `docker-compose.yml`

## Troubleshooting

```bash
# Ruby version issues
rbenv local 3.2.2
ruby -v

# Bundle issues
bundle clean --force
bundle install

# Database issues
brew services restart postgresql
bin/rails db:reset

# Asset issues
bin/rails tmp:clear
bin/rails tailwindcss:build
bin/rails assets:precompile
```

## Documentation

See [Setup.md](Setup.md) for detailed installation guide.

---

Built with Ruby on Rails | [Report Issue](#) | [License: MIT](#)
