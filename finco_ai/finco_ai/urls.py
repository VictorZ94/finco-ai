"""
URL configuration for finco_ai project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

from users.admin_views import admin_login

urlpatterns = [
    # Firebase sign-in replaces the admin's password login (must come before admin.site.urls).
    path('admin/login/', admin_login, name='admin_firebase_login'),
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('financial_accounts.urls')),
    path('api/', include('transactions.urls')),
    path('api/', include('dashboard.urls')),
    path('api/', include('ai_chat.urls')),
    path('api/', include('reports.urls')),
]
