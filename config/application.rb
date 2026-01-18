require_relative "boot"

require "rails/all"

Bundler.require(*Rails.groups)

module ExpenseTrackerV2
  class Application < Rails::Application
    config.load_defaults 7.1

    # Time zone
    config.time_zone = "UTC"

    # API configuration
    config.api_only = false

    # Autoload paths
    config.autoload_lib(ignore: %w(assets tasks))

    # Session store
    config.session_store :cookie_store, key: "_expense_tracker_session"

    # CORS configuration
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins "*"
        resource "*",
          headers: :any,
          methods: [:get, :post, :put, :patch, :delete, :options, :head],
          credentials: false
      end
    end

    # Generators
    config.generators do |g|
      g.orm :active_record, primary_key_type: :uuid
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: "spec/factories"
    end
  end
end
