# Step 09 — Chat agent that records ledger entries (LangChain + memory)

## Why
`/chat` was a mock that echoed the text back. Now the user describes money events in plain words ("Pagué 80.000 de gasolina", "Mi mamá me regaló 200.000", "Me prestaron 1.000.000") and the app records them as double-entry transactions.

Rules from the user:
1. **Never save an unbalanced transaction.** The same rules as `/ledger` apply.
2. **Never assume the payment method.** If the user didn't say how they paid, ask.
3. **A clear category is required before recording.** Use an existing account whenever one fits.

Decisions:
- **Saving:** automatic once the information is complete.
- **Missing category:** if no account fits, the agent **proposes** one, and it is created only after a tap.
- **History:** conversations are persisted, and each entry links to the message that created it.
- **Framework and memory:** **LangChain v1** (`create_agent` + tools) with **conversation memory**: a LangGraph Postgres checkpointer plus summarization.
- **LLM:** **Ollama cloud**, `gemma4:31b`.
- **Privacy note:** messages and account names are sent to ollama.com.

## Architecture (`finco_ai/ai_chat/`)
```
POST /api/chat/conversations/<id>/messages/  {content, today, client_id}
  └─ views.MessageListCreateView ─ saves the user Message, then agent.run_turn()
       ├─ context.load_context()     snapshot: postable accounts, level-3 groups, next codes, the user's own words
       ├─ create_agent(ChatOllama, tools, middleware=[dynamic_prompt, SummarizationMiddleware], checkpointer=PostgresSaver)
       │    .invoke(user text, thread_id=conversation id, context=ChatContext)
       │      tools: record_movement / propose_new_account  →  rules.py checks  →  stage in ctx.effects
       ├─ memory.save_summary()      mirror the summary (if any) into ConversationMemory
       └─ agent._persist()           one transaction: assistant Message + staged entry (TransactionSerializer) or proposal
```

| File | Role |
|---|---|
| `llm.py` | `get_chat_model()` → `ChatOllama(model, base_url, temperature=0, client_kwargs={headers, timeout})`. This is the swap point for any LangChain chat model. `LLM_ERRORS` → `LLMUnavailable` → 503. |
| `prompts.py` | `SYSTEM_PROMPT` (rules + kinds), `build_context` (date, accounts, groups, pending proposal), `SUMMARY_PROMPT` (bookkeeping-specific; the default is written for coding sessions). |
| `context.py` | `ChatContext`, `Effects` and `StagedMovement`; `load_context()`. |
| `rules.py` | `check_movement`, `check_proposal`: pure functions that return what to stage, or an instruction for the model. |
| `tools.py` | `@tool(parse_docstring=True)` `record_movement` and `propose_new_account`, with `ToolRuntime[ChatContext]`. |
| `movements.py` | `KINDS`, `build_lines` (always one debit and one credit), `parse_amount`, `evidence_in`. |
| `memory.py` | `open_checkpointer()` (`PostgresSaver`), `setup_checkpointer` (migration `0003`), `delete_thread`, `save_summary`. |
| `agent.py` | `build_agent`, `run_turn`, `_persist`, `answer_proposal`; the few server-written texts (es/en). |

### Why the tools only stage
LangGraph runs tools in a **worker thread** (verified: `ThreadPoolExecutor-…`). If the ORM were used there, Django would open another DB connection: it wouldn't see the request's transaction, wouldn't be cleaned up, and would break test isolation.

So the tools read a snapshot loaded in the request thread, and only stage what to save. `_persist` writes everything afterwards in one transaction. As a bonus, the rules are pure and easy to test.

### Movement kinds
| kind | Debit | Credit | category type | payment type |
|---|---|---|---|---|
| expense, gift_given | category | payment | EXPENSE | ASSET or LIABILITY (card) |
| income, gift_received | payment | category | INCOME | ASSET |
| loan_received | payment | category | LIABILITY | ASSET |
| loan_given | category | payment | ASSET | ASSET |
| debt_payment | category | payment | LIABILITY | ASSET |
| transfer | category (destination) | payment (source) | ASSET | ASSET |

### How the rules are enforced (in `rules.py`, not just in the prompt)
- **Balanced:** the model never writes lines. `build_lines` makes one debit and one credit of the same amount, and `TransactionSerializer` re-checks balance, ownership and postability.
- **Payment method never assumed:** `payment_evidence` must be words the user actually wrote in this conversation (case- and accent-insensitive, ignoring filler words). Otherwise the tool answers "Not saved: the user never said how they paid… ask them; options: …" and the model asks.
- **Clear category:** the same check on `category_evidence`. The account must be one of the user's postable accounts, with a type that fits the kind.
- **No double save in one turn**, and idempotent requests: the frontend sends a `client_id`, and a repeated POST replays the first answer.
- **New accounts need a tap:**
  - `propose_new_account` stages a proposal, which is saved to `Conversation.pending_account` and shown as a card.
  - `POST …/account-proposal/ {accept}` creates the account (`create_child_account`, next `<parent>NN` code (6 digits since step 10), level 4, type and nature from the parent).
  - It then runs a turn with the tap as text. That text is not stored as a `Message`, so it's never evidence.

### Memory
- **Short-term:** a LangGraph `PostgresSaver` (`thread_id` = conversation id) stores the full agent state in the app's database. Its tables are created by `migrate`.
  - The agent sees the whole conversation, including its own tool calls and results.
  - That's how "igual que la primera vez, pero por 30.000" works.
- **Long chats:** `SummarizationMiddleware` replaces older messages with a summary once the history passes `CHAT_SUMMARY_TRIGGER_TOKENS` (4000), keeping the last `CHAT_SUMMARY_KEEP_MESSAGES` (20). The summary is mirrored into `ConversationMemory.summary` (visible in the admin).
- **The UI transcript** is the `Message` table, with cards; the checkpointer is the model's memory. Each conversation has its own memory, and "New conversation" starts empty.

## Frontend
- **Hooks:** `src/hooks/chat/useChat.ts` has `useConversations`, `useMessages`, `useCreateConversation`, `useSendMessage` (optimistic message, `clientId`, `today`) and `useAnswerProposal`, plus `chatKeys`.
- **Refreshes:** a saved entry invalidates the ledger and the dashboard; accepting a proposal refreshes the postable accounts.
- **Cards:** `RecordedEntryCard` (number, date, two lines, link to the ledger) and `AccountProposalCard` (Create account / No, then the outcome). `features/chat/cards.ts` holds the tested helpers.
- **`ChatPage`** follows the latest conversation and has a "New conversation" button. The mock `chatService.ts` is gone.

## Configuration
In `finco_ai/.env`:
- `OLLAMA_API_KEY` is required for the chat.
- `OLLAMA_HOST` defaults to `https://ollama.com`; use `http://127.0.0.1:11434` for a local model.
- `OLLAMA_MODEL` defaults to `gemma4:31b`.
- Optional: `OLLAMA_TIMEOUT`, `CHAT_SUMMARY_TRIGGER_TOKENS`, `CHAT_SUMMARY_KEEP_MESSAGES`.

## Verification
- **Backend:** 83 tests OK, 27 of them in `ai_chat`.
  - The chat tests use `FakeToolModel`, which replays scripted text and tool calls, together with the real Postgres checkpointer in the test DB.
  - They cover the rules, proposals, memory across turns, separate memory per conversation, summarization, the 503, idempotency and auth.
  - `makemigrations --check` is clean.
- **Frontend:** build, lint and tests pass (54).
- **Live run** (gemma4 on Ollama cloud, a throwaway account deleted afterwards along with its rows and memory thread):

| User said | Agent | Result |
|---|---|---|
| "Pagué 80.000 de gasolina" | "¿Cómo realizaste el pago?" | nothing saved |
| "Con la tarjeta Nubank" | saved | #0001 5135-03 Gasolina / 2105-02 Nubank, 80.000 |
| "Tomé un taxi por 25.000" → "En efectivo" | asked how they paid, then proposed **5135-04 Taxi** → Create | #0002 Taxi / Efectivo, 25.000 |
| "Mi mamá me regaló 200.000, me llegó a la cuenta de Bancolombia" | saved | #0003 1110-10 Bancolombia / 4135-05 Ingresos |
| "Me prestaron 1.000.000 y me los consignaron a Bancolombia" | "¿A quién le debes…?" → "Es el préstamo de Bancolombia" | #0004 1110-10 / 2105-01 Prestamo Bancolombia |
| "Gasté 50 mil" → "Fue un almuerzo" → "Con la Nubank" | asked for the category, then the payment | #0005 5125-01 Alimentación / Nubank |
| "Ah, y ayer también eché gasolina igual que la primera vez, pero por 30.000" | memory: reused Gasolina + Nubank, date = yesterday | #0006 (26/10) Gasolina / Nubank, 30.000 |

- **Afterwards:** all 6 entries were balanced and linked to their message, and the dashboard showed income 200.000, expenses 185.000 and net worth 15.000. Reloading `/chat` restored the history and the cards, and there was no horizontal overflow at 390px.
- **How gemma4 behaved:**
  - **Tool calling:** reliable. It always asked for the payment method instead of guessing, and it used existing accounts when they fit (lunch → Alimentación).
  - **Proposals:** it proposed a new account only when nothing fit.
  - **Small quirks:**
    - it wrote "mi mamá" as the supplier of the gift;
    - it asked who lent the money before using the existing loan account.
  - **Summarization:** didn't trigger in this short chat (default 4000 tokens); the tests cover it.
