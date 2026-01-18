module Api
  module V1
    class BaseController < ApplicationController
      skip_before_action :verify_authenticity_token
      skip_before_action :authenticate_user!
      before_action :authenticate_api_user!

      respond_to :json

      rescue_from ActiveRecord::RecordNotFound, with: :not_found
      rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
      rescue_from ActionController::ParameterMissing, with: :bad_request

      private

      def authenticate_api_user!
        # For development, use demo user if no auth header
        return if Rails.env.development? && !request.headers["Authorization"].present?

        token = request.headers["Authorization"]&.split(" ")&.last
        if token.present?
          # JWT authentication would go here
          # For now, just use demo user in development
        end
      end

      def current_user
        @current_user ||= User.find_or_create_by!(email: "demo@expense-tracker.local") do |user|
          user.password = "password123"
          user.name = "Demo User"
        end
      end

      def not_found(exception)
        render json: {
          success: false,
          error: "NOT_FOUND",
          message: exception.message
        }, status: :not_found
      end

      def unprocessable_entity(exception)
        render json: {
          success: false,
          error: "VALIDATION_ERROR",
          message: exception.record.errors.full_messages.join(", ")
        }, status: :unprocessable_entity
      end

      def bad_request(exception)
        render json: {
          success: false,
          error: "BAD_REQUEST",
          message: exception.message
        }, status: :bad_request
      end

      def render_success(data, options = {})
        response = {
          success: true,
          data: data,
          timestamp: Time.current.iso8601
        }
        response[:count] = options[:count] if options[:count]
        response[:message] = options[:message] if options[:message]
        
        render json: response, status: options[:status] || :ok
      end

      def render_error(error_code, message, status = :bad_request)
        render json: {
          success: false,
          error: error_code,
          message: message,
          timestamp: Time.current.iso8601
        }, status: status
      end
    end
  end
end
