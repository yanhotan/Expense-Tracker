source "https://rubygems.org"
ruby "3.2.2"

# Rails framework
gem "rails", "~> 7.1.0"

# Database
gem "pg", "~> 1.5"

# Web server
gem "puma", "~> 6.4"

# Asset pipeline
gem "sprockets-rails"
gem "importmap-rails"
gem "turbo-rails"
gem "stimulus-rails"

# CSS
gem "tailwindcss-rails"

# Authentication
gem "devise", "~> 4.9"
gem "omniauth-google-oauth2", "~> 1.1"
gem "omniauth-rails_csrf_protection", "~> 1.0"

# JSON API
gem "jbuilder"
gem "rack-cors"

# Use Redis adapter to run Action Cable in production
gem "redis", ">= 4.0.1"

# Windows does not include zoneinfo files
gem "tzinfo-data", platforms: %i[mingw mswin x64_mingw jruby]

# Reduces boot times through caching
gem "bootsnap", require: false

# Charts
gem "chartkick"
gem "groupdate"

group :development, :test do
  gem "debug", platforms: %i[mri mingw mswin x64_mingw]
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "faker"
  gem "dotenv-rails"
end

group :development do
  gem "web-console"
  gem "error_highlight", ">= 0.4.0", platforms: [:ruby]
end

group :test do
  gem "capybara"
  gem "selenium-webdriver"
end
