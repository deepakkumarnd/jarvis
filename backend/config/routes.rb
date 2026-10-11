Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # All endpoints consumed by the frontend live under /api (proxied by Vite in development)
  namespace :api do
    resources :bookmarks do
      get :search, on: :collection
    end
    resources :notes
  end
end
