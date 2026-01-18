# Expense Tracker v2 - Ruby on Rails

A modern, full-stack expense tracking application built with Ruby on Rails 7, PostgreSQL, and Hotwire (Turbo + Stimulus). This is a Ruby on Rails implementation of the original React + Spring Boot expense tracker.

## 🚀 Features

- **Spreadsheet-style Expense Management**: Intuitive grid interface for managing daily expenses
- **Multiple Expense Sheets**: Organize expenses across different sheets (personal, business, etc.)
- **PIN Protection**: Secure sensitive sheets with 4-digit PIN codes
- **Real-time Updates**: Hotwire-powered instant updates without page reloads
- **Dark/Light Mode**: Toggle between themes with system preference support
- **Analytics Dashboard**: View spending patterns by category and month
- **User Authentication**: Secure login with email/password or Google OAuth
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🏗️ Tech Stack

- **Backend**: Ruby on Rails 7.1
- **Database**: PostgreSQL 15
- **Frontend**: Hotwire (Turbo + Stimulus)
- **Styling**: Tailwind CSS 3
- **Authentication**: Devise + OmniAuth (Google)
- **Caching**: Redis
- **Deployment**: Docker & Docker Compose

## 📋 Prerequisites

- Ruby 3.2.2
- PostgreSQL 15+
- Redis 7+
- Node.js 18+ (for Tailwind CSS compilation)
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Set up the database
docker-compose exec web bin/rails db:setup

# Visit http://localhost:3000
```

### Option 2: Local Development

#### 1. Clone and Install Dependencies

```bash
cd expense-tracker-v2

# Install Ruby dependencies
bundle install

# Install Tailwind CSS
rails tailwindcss:install
```

#### 2. Database Setup

First, make sure PostgreSQL is running. You can use Docker for just the database:

```bash
# Start PostgreSQL with Docker
docker run --name expense-tracker-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expense_tracker_v2_development \
  -p 5432:5432 \
  -d postgres:15-alpine
```

Or configure your existing PostgreSQL:

```sql
-- Connect to PostgreSQL and run:
CREATE DATABASE expense_tracker_v2_development;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE expense_tracker_v2_development TO postgres;
```

#### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Rails
RAILS_ENV=development
SECRET_KEY_BASE=your_secret_key_here  # Generate with: rails secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Redis (optional for development)
REDIS_URL=redis://localhost:6379/1
```

#### 4. Set Up Database

```bash
# Create database and run migrations
bin/rails db:create db:migrate

# Seed with demo data (optional)
bin/rails db:seed
```

#### 5. Start the Application

```bash
# Start Rails server
bin/rails server

# In a separate terminal, start Tailwind CSS watcher
bin/rails tailwindcss:watch
```

Visit `http://localhost:3000` in your browser.

## 📊 Database Schema

### Tables

```
users
├── id (UUID)
├── email
├── encrypted_password
├── name
├── picture
├── google_id
└── timestamps

expense_sheets
├── id (UUID)
├── name
├── pin
├── has_pin
├── user_id (FK)
└── timestamps

expenses
├── id (UUID)
├── date
├── amount (DECIMAL 15,2)
├── category
├── description
├── user_id (FK)
├── expense_sheet_id (FK)
└── timestamps

sheet_categories
├── id (UUID)
├── expense_sheet_id (FK)
├── name
├── display_order
└── timestamps

column_descriptions
├── id (UUID)
├── expense_id (FK)
├── column_name
├── description
├── user_id (FK)
└── timestamps
```

## 🔌 API Endpoints

The application provides a JSON API for integration:

### Expense Sheets
- `GET /api/v1/sheets` - List all sheets
- `POST /api/v1/sheets` - Create sheet
- `GET /api/v1/sheets/:id` - Get sheet details
- `PUT /api/v1/sheets/:id` - Update sheet
- `DELETE /api/v1/sheets/:id` - Delete sheet
- `GET /api/v1/sheets/:id/analytics` - Get sheet analytics

### Expenses
- `GET /api/v1/expenses?sheetId=&month=` - List expenses
- `POST /api/v1/expenses` - Create expense
- `PUT /api/v1/expenses/:id` - Update expense
- `DELETE /api/v1/expenses/:id` - Delete expense

### Categories
- `GET /api/v1/categories?sheetId=` - List categories
- `POST /api/v1/categories` - Create category
- `PUT /api/v1/categories` - Rename category
- `DELETE /api/v1/categories` - Delete category

### Analytics
- `GET /api/v1/analytics?sheetId=&month=&year=` - Get analytics data

## 🧪 Testing

```bash
# Run all tests
bin/rails test

# Run RSpec tests
bundle exec rspec

# Run with coverage
COVERAGE=true bundle exec rspec
```

## 🐳 Docker Commands

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f web

# Run migrations
docker-compose exec web bin/rails db:migrate

# Open Rails console
docker-compose exec web bin/rails console

# Stop all services
docker-compose down

# Remove volumes (reset data)
docker-compose down -v
```

## 📁 Project Structure

```
expense-tracker-v2/
├── app/
│   ├── controllers/
│   │   ├── api/v1/          # JSON API controllers
│   │   ├── users/           # Devise controllers
│   │   ├── dashboard_controller.rb
│   │   ├── expense_sheets_controller.rb
│   │   └── expenses_controller.rb
│   ├── javascript/
│   │   └── controllers/     # Stimulus controllers
│   ├── models/
│   └── views/
├── config/
│   ├── routes.rb
│   └── database.yml
├── db/
│   ├── migrate/
│   └── seeds.rb
├── docker-compose.yml
├── Dockerfile
└── Gemfile
```

## 🔒 Security

- JWT-based API authentication (optional)
- Devise authentication with encrypted passwords
- Google OAuth 2.0 integration
- Sheet-level PIN protection
- CSRF protection
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add your feature'`
5. Push to the branch: `git push origin feature/your-feature`
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Ruby on Rails](https://rubyonrails.org/) - Web framework
- [Hotwire](https://hotwired.dev/) - Modern Rails frontend
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Devise](https://github.com/heartcombo/devise) - Authentication
- Original [Expense Tracker](../expense-tracer/) - React + Spring Boot implementation
