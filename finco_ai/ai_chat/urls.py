from django.urls import path

from .views import ConversationListCreateView, MessageListCreateView, ProposalAnswerView

urlpatterns = [
    path("chat/conversations/", ConversationListCreateView.as_view(), name="chat-conversations"),
    path("chat/conversations/<uuid:pk>/messages/", MessageListCreateView.as_view(), name="chat-messages"),
    path(
        "chat/conversations/<uuid:pk>/account-proposal/",
        ProposalAnswerView.as_view(),
        name="chat-account-proposal",
    ),
]
