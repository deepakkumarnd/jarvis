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
    resources :todos do
      delete :completed, on: :collection, action: :destroy_completed
    end
  end
end
