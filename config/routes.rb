Rails.application.routes.draw do
  # Devise routes for authentication
  devise_for :users, controllers: {
    sessions: "users/sessions",
    registrations: "users/registrations",
    omniauth_callbacks: "users/omniauth_callbacks"
  }

  # Root path
  root "dashboard#index"

  # Main application routes
  resources :expense_sheets, path: "sheets" do
    member do
      post :verify_pin
      get :analytics
    end
    resources :expenses, shallow: true
    resources :categories, only: [:index, :create, :update, :destroy], shallow: true
  end

  # API namespace for JSON endpoints
  namespace :api do
    namespace :v1 do
      resources :sheets, controller: "expense_sheets" do
        member do
          get :analytics
        end
      end
      resources :expenses
      resources :categories
      resources :descriptions do
        collection do
          delete "expense/:expense_id", action: :destroy_by_expense
        end
      end
      get "analytics", to: "analytics#show"
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
