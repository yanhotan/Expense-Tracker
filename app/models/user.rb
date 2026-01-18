class User < ApplicationRecord
  # Devise modules
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :trackable,
         :omniauthable, omniauth_providers: [:google_oauth2]

  # Associations
  has_many :expense_sheets, dependent: :destroy
  has_many :expenses, dependent: :destroy
  has_many :column_descriptions, dependent: :destroy

  # Validations
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :name, presence: true, on: :update

  # Callbacks
  before_validation :set_default_name, on: :create

  # Class methods for OmniAuth
  def self.from_omniauth(auth)
    where(google_id: auth.uid).first_or_create do |user|
      user.email = auth.info.email
      user.password = Devise.friendly_token[0, 20]
      user.name = auth.info.name
      user.picture = auth.info.image
    end
  end

  # Instance methods
  def display_name
    name.presence || email.split("@").first
  end

  private

  def set_default_name
    self.name ||= email.split("@").first if email.present?
  end
end
