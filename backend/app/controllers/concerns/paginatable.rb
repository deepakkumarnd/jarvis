module Paginatable
  extend ActiveSupport::Concern

  PER_PAGE = 50

  private
    # Renders one page of +scope+ as { data: [...], meta: { page, per_page, total_count, total_pages } }.
    # Out-of-range pages return an empty data array.
    def render_paginated(scope)
      total_count = scope.count
      page = [ params[:page].to_i, 1 ].max

      render json: {
        data: scope.limit(PER_PAGE).offset((page - 1) * PER_PAGE),
        meta: {
          page: page,
          per_page: PER_PAGE,
          total_count: total_count,
          total_pages: (total_count / PER_PAGE.to_f).ceil
        }
      }
    end
end
