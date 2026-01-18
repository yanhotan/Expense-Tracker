# Expense Tracker v2 - Setup Guide

This guide covers the complete setup process for the Expense Tracker v2 application from scratch.

## Prerequisites

### System Requirements
- macOS (Linux/Windows users may need to adjust commands)
- Git
- Command Line Tools for Xcode (macOS)

### Install Command Line Tools (macOS)
```bash
xcode-select --install
```

## Step 1: Install rbenv (Ruby Version Manager)

### Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Install rbenv and ruby-build
```bash
brew install rbenv ruby-build
```

### Add rbenv to your shell
```bash
echo 'export PATH="$HOME/.rbenv/shims:$PATH"' >> ~/.zshrc
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
source ~/.zshrc
```

### Verify rbenv installation
```bash
rbenv --version
# Should show: rbenv 1.x.x
```

## Step 2: Install Ruby 3.2.2

### Install Ruby using rbenv
```bash
rbenv install 3.2.2
cd /path/to/expense-tracker-v2
rbenv local 3.2.2
```

### Verify Ruby installation
```bash
ruby -v
# Should show: ruby 3.2.2 (2023-03-30 revision e51014f9c0) [arm64-darwin25]
```

### Install Bundler
```bash
gem install bundler
```

## Step 3: Clone and Setup the Repository

### Clone the repository
```bash
git clone <repository-url>
cd expense-tracker-v2
```

### Set Ruby version for the project
```bash
rbenv local 3.2.2
```

## Step 4: Install Dependencies

### Install Ruby gems
```bash
bundle install
```

### Install JavaScript dependencies
```bash
# No additional JS package manager needed - Rails handles this via importmap
```

## Step 5: Database Setup

### Install PostgreSQL (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

### Create database user (optional - for production-like setup)
```bash
createuser expense_tracker_user --createdb --login
createdb expense_tracker_development -O expense_tracker_user
createdb expense_tracker_test -O expense_tracker_user
```

### Configure database connection
The application uses PostgreSQL. Update `config/database.yml` if needed:
```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: <%= ENV.fetch("DATABASE_USERNAME") { "your_postgres_username" } %>
  password: <%= ENV.fetch("DATABASE_PASSWORD") { "your_postgres_password" } %>

development:
  <<: *default
  database: expense_tracker_development

test:
  <<: *default
  database: expense_tracker_test

production:
  <<: *default
  database: expense_tracker_production
```

### Create and migrate database
```bash
bin/rails db:create
bin/rails db:migrate
bin/rails db:seed
```

## Step 6: Environment Configuration

### Create environment variables file
```bash
cp .env.example .env  # or create manually
```

### Edit .env file with your configuration
```bash
# Google OAuth Configuration
# Get these from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Database Configuration (optional, uses database.yml by default)
# DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_tracker_v2_development

# Rails Configuration
RAILS_ENV=development
```

### Set up Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials for a web application
3. Add these authorized redirect URIs:
   - `http://localhost:3000/users/auth/google_oauth2/callback`
   - `http://127.0.0.1:3000/users/auth/google_oauth2/callback`
4. Copy Client ID and Client Secret to `.env`

## Step 7: Build Assets

### Build Tailwind CSS
```bash
bin/rails tailwindcss:build
```

### Precompile assets for production (optional)
```bash
RAILS_ENV=production bin/rails assets:precompile
```

## Step 8: Run the Application

### Start the Rails server
```bash
bin/rails server
```

### Access the application
Open your browser and go to:
- **Development**: http://localhost:3000
- **Admin interface** (if configured): http://localhost:3000/admin

### Demo Account
- **Email**: `demo@expense-tracker.local`
- **Password**: `password123`

## Step 9: Development Workflow

### Start development servers
```bash
# Terminal 1: Rails server
bin/rails server

# Terminal 2: Auto-rebuild Tailwind CSS (optional)
bin/rails tailwindcss:watch
```

### Run tests
```bash
# Run all tests
bin/rails test

# Run specific test
bin/rails test test/models/user_test.rb
```

### Database management
```bash
# Reset database
bin/rails db:reset

# Migrate database
bin/rails db:migrate

# Seed database
bin/rails db:seed
```

## Troubleshooting

### Ruby Version Issues
```bash
# Check current Ruby version
ruby -v

# List available Ruby versions
rbenv versions

# Set Ruby version for project
rbenv local 3.2.2

# Reinstall Ruby if needed
rbenv install 3.2.2
```

### Bundle Issues
```bash
# Clear gem cache
bundle clean --force

# Reinstall gems
bundle install

# Update bundler
gem update bundler
```

### Database Issues
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql

# Reset database
bin/rails db:drop db:create db:migrate db:seed
```

### Asset Issues
```bash
# Clear asset cache
bin/rails tmp:clear

# Rebuild Tailwind
bin/rails tailwindcss:build

# Precompile assets
bin/rails assets:precompile
```

## Features Overview

### Core Features
- ✅ Spreadsheet-style expense entry
- ✅ Real-time totals calculation
- ✅ Category management
- ✅ Monthly/year navigation
- ✅ Analytics charts (daily, monthly, category breakdown)
- ✅ PIN protection for sheets
- ✅ Dark/light theme toggle
- ✅ User authentication (Devise)
- ✅ Google OAuth integration
- ✅ Multiple expense sheets
- ✅ Responsive design

### Technical Stack
- **Framework**: Ruby on Rails 7.1
- **Ruby Version**: 3.2.2
- **Database**: PostgreSQL
- **Frontend**: Hotwire (Turbo + Stimulus)
- **Styling**: Tailwind CSS
- **Authentication**: Devise + OmniAuth
- **Charts**: Custom SVG-based charts

## Deployment

### Production Deployment
For production deployment, you'll need:
1. Set `RAILS_ENV=production` in environment
2. Configure production database
3. Set up proper Google OAuth credentials
4. Configure web server (nginx/puma)
5. Set up SSL certificates
6. Configure environment variables

### Docker Deployment (Optional)
```bash
# Build and run with Docker
docker-compose up --build
```

## Support

If you encounter issues during setup:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure Ruby version is correctly set
4. Check database connectivity
5. Verify environment variables are set

For more detailed documentation, see the README.md file in the project root.