class Api::TodosController < ApplicationController
  include Paginatable

  before_action :set_todo, only: %i[ show update destroy ]

  # GET /api/todos?status=all|active|completed&page=1
  # meta.counts holds the number of todos per status for filter tabs.
  def index
    status = params.fetch(:status, "all")
    unless status.in?(Todo::STATUSES)
      return render json: { error: "status must be one of: #{Todo::STATUSES.join(', ')}" }, status: :bad_request
    end

    render_paginated Todo.with_status(status).in_display_order, meta: { status: status, counts: Todo.status_counts }
  end

  # GET /api/todos/:id
  def show
    render json: @todo
  end

  # POST /api/todos
  def create
    todo = Todo.new(todo_params)

    if todo.save
      render json: todo, status: :created, location: api_todo_url(todo)
    else
      render json: { errors: todo.errors }, status: :unprocessable_content
    end
  end

  # PATCH/PUT /api/todos/:id
  def update
    if @todo.update(todo_params)
      render json: @todo
    else
      render json: { errors: @todo.errors }, status: :unprocessable_content
    end
  end

  # DELETE /api/todos/:id
  def destroy
    @todo.destroy!
    head :no_content
  end

  # DELETE /api/todos/completed
  def destroy_completed
    deleted = Todo.completed.delete_all
    render json: { deleted: deleted }
  end

  private
    def set_todo
      @todo = Todo.find(params.expect(:id))
    end

    def todo_params
      params.expect(todo: [ :title, :completed, :due_on ])
    end
end
