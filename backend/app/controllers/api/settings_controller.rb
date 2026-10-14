class Api::SettingsController < ApplicationController
  # GET /api/settings
  def show
    render json: Setting.current
  end

  # PATCH /api/settings
  def update
    setting = Setting.current

    if setting.update(params.expect(setting: %i[ brand_name tagline ]))
      render json: setting
    else
      render json: { errors: setting.errors }, status: :unprocessable_content
    end
  end
end
