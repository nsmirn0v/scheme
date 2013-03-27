Scheme::Application.routes.draw do
  get "staticpages/index"

  root :to => 'staticpages#index'
end
