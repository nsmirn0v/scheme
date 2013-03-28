Scheme::Application.routes.draw do
  root :to => 'staticpages#index'
  match "/google17f295fd94d447e7.html" => "staticpages#google17f295fd94d447e7"
end
