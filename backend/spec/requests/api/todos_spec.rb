require "rails_helper"

RSpec.describe "Api::Todos", type: :request do
  let(:json) { response.parsed_body }

  describe "GET /api/todos" do
    it "lists todos with counts per status" do
      open_todo = create(:todo)
      create(:todo, :completed)

      get api_todos_path, as: :json

      expect(response).to have_http_status(:ok)
      expect(json["data"].first["id"]).to eq(open_todo.id)
      expect(json["meta"]).to include("page" => 1, "per_page" => 50, "total_count" => 2, "status" => "all")
      expect(json["meta"]["counts"]).to eq("all" => 2, "active" => 1, "completed" => 1)
    end

    it "filters by status" do
      create(:todo)
      done = create(:todo, :completed)

      get api_todos_path(status: "completed"), as: :json

      expect(json["data"].pluck("id")).to eq([ done.id ])
      expect(json["meta"]["total_count"]).to eq(1)
    end

    it "rejects an unknown status" do
      get api_todos_path(status: "bogus"), as: :json

      expect(response).to have_http_status(:bad_request)
    end

    it "paginates 50 todos per page" do
      create_list(:todo, 51)

      get api_todos_path(page: 2), as: :json

      expect(json["data"].size).to eq(1)
      expect(json["meta"]).to include("page" => 2, "total_pages" => 2)
    end
  end

  describe "GET /api/todos/:id" do
    it "returns the todo" do
      todo = create(:todo, :due)

      get api_todo_path(todo), as: :json

      expect(json).to include("id" => todo.id, "title" => todo.title, "completed" => false, "due_on" => todo.due_on.iso8601)
    end

    it "returns 404 when missing" do
      get api_todo_path(id: 0), as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/todos" do
    it "creates a todo" do
      due_on = Faker::Date.forward(days: 10)

      expect {
        post api_todos_path, params: { todo: { title: "Buy milk", due_on: due_on } }, as: :json
      }.to change(Todo, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json).to include("title" => "Buy milk", "completed" => false, "due_on" => due_on.iso8601)
    end

    it "returns errors for a blank title" do
      post api_todos_path, params: { todo: { title: "" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to have_key("title")
    end
  end

  describe "PATCH /api/todos/:id" do
    let(:todo) { create(:todo) }

    it "marks the todo completed" do
      patch api_todo_path(todo), params: { todo: { completed: true } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(todo.reload.completed).to be(true)
    end

    it "updates the title and clears the due date" do
      todo.update!(due_on: Date.current)

      patch api_todo_path(todo), params: { todo: { title: "Renamed", due_on: nil } }, as: :json

      expect(todo.reload).to have_attributes(title: "Renamed", due_on: nil)
    end

    it "rejects a blank title" do
      patch api_todo_path(todo), params: { todo: { title: "" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "DELETE /api/todos/:id" do
    it "deletes the todo" do
      todo = create(:todo)

      expect { delete api_todo_path(todo), as: :json }.to change(Todo, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end

  describe "DELETE /api/todos/completed" do
    it "deletes only completed todos" do
      open_todo = create(:todo)
      create_list(:todo, 2, :completed)

      delete completed_api_todos_path, as: :json

      expect(response).to have_http_status(:ok)
      expect(json).to eq("deleted" => 2)
      expect(Todo.all).to contain_exactly(open_todo)
    end
  end
end
