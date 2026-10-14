Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Health check: 200 when the app and database are up, 503 otherwise. Used by load balancers,
  # uptime monitors and the dashboard (which also reads the system metrics it returns).
  get "up" => "health#show", as: :health_check

  # All endpoints consumed by the frontend live under /api (proxied by Vite in development)
  namespace :api do
    resources :bookmarks do
      get :search, on: :collection
    end
    resources :notes
    resources :documents, except: %i[ new edit ] do
      resources :files, controller: "document_files", only: %i[ create destroy ] do
        get :download, on: :member
      end
    end
    resources :credential_groups, except: %i[ new edit ] do
      resources :credentials, only: %i[ create update destroy ] do
        get :secret, on: :member
      end
    end
    resources :todos do
      delete :completed, on: :collection, action: :destroy_completed
    end
  end
end
