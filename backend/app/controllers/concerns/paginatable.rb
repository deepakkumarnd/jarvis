module Paginatable
  extend ActiveSupport::Concern

  PER_PAGE = 50

  private
    # Renders one page of +scope+ as { data: [...], meta: { page, per_page, total_count, total_pages } }.
    # Out-of-range pages return an empty data array. Pass a block to customise how each record is serialised,
    # and +meta+ to add extra keys to the meta object.
    def render_paginated(scope, meta: {}, &serialize)
      total_count = scope.count
      page = [ params[:page].to_i, 1 ].max
      records = scope.limit(PER_PAGE).offset((page - 1) * PER_PAGE)

      render json: {
        data: serialize ? records.map(&serialize) : records,
        meta: {
          page: page,
          per_page: PER_PAGE,
          total_count: total_count,
          total_pages: (total_count / PER_PAGE.to_f).ceil,
          **meta
        }
      }
    end
end
