from django.contrib import admin
from django.urls import path
from api import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/send-otp/', views.send_otp),
    path('api/auth/register-otp/', views.register_with_otp),
    path('api/auth/login/', views.login_user),
    path('api/bootstrap/', views.bootstrap_data),
    path('api/subscriptions/<int:sub_id>/stage/', views.change_sub_stage),
    path('api/subscriptions/<int:sub_id>/pause/', views.toggle_sub_pause),
    path('api/billing/run/', views.run_billing_day),
    path('api/invoices/<int:inv_id>/pay/', views.record_payment),
    path('api/admin/create-entity/', views.admin_create_entity),
]
