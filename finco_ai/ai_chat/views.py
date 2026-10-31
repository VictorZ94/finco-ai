from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from finco_ai.identity import get_user_id
from transactions.serializers import TransactionSerializer

from .agent import NoPendingProposal, answer_proposal, run_turn
from .llm import LLMUnavailable
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    ProposalAnswerSerializer,
    SendMessageSerializer,
)

UNAVAILABLE = {"detail": "The assistant is unavailable right now. Try again in a moment."}


def turn_payload(messages, entry):
    return {
        "messages": MessageSerializer(messages, many=True).data,
        "transaction": TransactionSerializer(entry).data if entry else None,
    }


class ConversationListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/chat/conversations/ — the user's latest conversations; POST starts a new one."""

    serializer_class = ConversationSerializer
    pagination_class = None

    def get_queryset(self):
        return Conversation.objects.filter(user_id=get_user_id(self.request)).order_by("-updated_at")[:20]

    def perform_create(self, serializer):
        serializer.save(user_id=get_user_id(self.request))


class ConversationMixin:
    def get_conversation(self):
        return get_object_or_404(Conversation, pk=self.kwargs["pk"], user_id=get_user_id(self.request))


class MessageListCreateView(ConversationMixin, APIView):
    """GET/POST /api/chat/conversations/<id>/messages/ — history; POST sends a message and runs the agent."""

    def get(self, request, pk):
        conversation = self.get_conversation()
        return Response(MessageSerializer(conversation.messages.order_by("created_at"), many=True).data)

    def post(self, request, pk):
        conversation = self.get_conversation()
        payload = SendMessageSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        client_id = payload.validated_data.get("client_id")
        today = payload.validated_data.get("today") or timezone.localdate()

        if client_id:
            # A retried request: answer with what the first one produced instead of running it again.
            previous = conversation.messages.filter(client_id=client_id).first()
            if previous:
                return self.replay(conversation, previous)
        try:
            with transaction.atomic():
                user_message = Message.objects.create(
                    conversation=conversation,
                    role=Message.Role.USER,
                    content=payload.validated_data["content"],
                    client_id=client_id,
                )
        except IntegrityError:
            return self.replay(conversation, conversation.messages.get(client_id=client_id))
        if not conversation.title:
            conversation.title = user_message.content[:120]
        conversation.save(update_fields=["title", "updated_at"])

        try:
            result = run_turn(conversation, request, today)
        except LLMUnavailable:
            # The user's message is kept, so the history shows what they asked.
            return Response(UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(turn_payload([user_message, *result.messages], result.transaction), status=201)

    @staticmethod
    def replay(conversation, user_message):
        """The user message plus the replies it got (up to the next user message)."""
        later = conversation.messages.filter(created_at__gt=user_message.created_at).order_by("created_at")
        replies = []
        for message in later:
            if message.role == Message.Role.USER:
                break
            replies.append(message)
        entry = next((tx for reply in replies for tx in reply.transactions.all()), None)
        return Response(turn_payload([user_message, *replies], entry))


class ProposalAnswerView(ConversationMixin, APIView):
    """POST /api/chat/conversations/<id>/account-proposal/ — {accept}: answer the pending new-account card."""

    def post(self, request, pk):
        conversation = self.get_conversation()
        payload = ProposalAnswerSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        today = payload.validated_data.get("today") or timezone.localdate()
        try:
            result = answer_proposal(conversation, request, today, payload.validated_data["accept"])
        except NoPendingProposal:
            return Response({"detail": "There is no account proposal to answer."}, status=400)
        except LLMUnavailable:
            return Response(UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(turn_payload(result.messages, result.transaction))
