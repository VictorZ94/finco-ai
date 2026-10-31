"""The chat model behind the agent. Any LangChain chat model with tool calling works: change
get_chat_model() to use Claude, OpenAI or a local Ollama model."""

import httpx
import ollama
from django.conf import settings
from langchain_ollama import ChatOllama


class LLMUnavailable(Exception):
    """The model could not be reached or refused the request (network, timeout, bad key, quota)."""


# Errors from the model call that mean "try again later", not a bug.
LLM_ERRORS = (ollama.ResponseError, ollama.RequestError, httpx.HTTPError, ConnectionError, TimeoutError)


def get_chat_model():
    headers = {"Authorization": f"Bearer {settings.OLLAMA_API_KEY}"} if settings.OLLAMA_API_KEY else {}
    return ChatOllama(
        model=settings.OLLAMA_MODEL,
        base_url=settings.OLLAMA_HOST,
        temperature=0,
        client_kwargs={"headers": headers, "timeout": settings.OLLAMA_TIMEOUT},
    )
