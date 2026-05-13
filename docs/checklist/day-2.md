# Day 2 Checklist — OpenAI SDK in NestJS + Service Architecture

**Project focus:** AI Chat Assistant (backend integration) + Progressive Gen (service pipeline)

---

## 1. Setup

- [ ] Install OpenAI SDK in NestJS project (`npm install openai`)
- [ ] Add `OPENAI_API_KEY` to `.env` and NestJS `ConfigModule`
- [ ] Verify environment variable loads correctly inside the NestJS app
- [ ] Learn OpenAI SDK for Node.js API and usage patterns

---

## 2. Core Learning

- [ ] Learn service composition patterns in NestJS
- [ ] Understand how to inject `ConfigService` for API key management
- [ ] Learn rate limiting concepts for generation endpoints
- [ ] Understand NestJS module and provider wiring

---

## 3. Services

- [ ] Create `NarrativeGeneratorService` (replaces `ChatService`) with OpenAI integration
- [ ] Create stub `GraphService` (loads graph/meta data)
- [ ] Create stub `StateService` (manages session/state)
- [ ] Create stub `EngineService` (orchestrates pipeline)
- [ ] Wire `NarrativeGeneratorService` to load meta directives + style guide at runtime
- [ ] Register all services in the appropriate NestJS module

---

## 4. Endpoint

- [ ] Create `POST /api/generate` endpoint in the controller
- [ ] Wire endpoint to call `NarrativeGeneratorService`
- [ ] Return generated narrative text in the response payload
- [ ] Return hardcoded `choices` array alongside the narrative
- [ ] Verify endpoint works end-to-end from Postman

---

## 5. Error Handling & Logging

- [ ] Handle OpenAI API errors gracefully (network failures, auth errors, bad requests)
- [ ] Handle rate limit errors from OpenAI with appropriate response codes
- [ ] Add request logging (method, path, body) for the generate endpoint
- [ ] Add response logging (status, generated text length, latency)
- [ ] Implement rate limiting on the `/api/generate` endpoint

---

## 6. Success Criteria

- [ ] OpenAI SDK installed and working inside NestJS
- [ ] `NarrativeGeneratorService` created with OpenAI integration
- [ ] `/api/generate` endpoint implemented and reachable
- [ ] Stub services created for graph and engine pipeline
- [ ] API key managed securely via environment variables
- [ ] Response returns both narrative text and choices array
- [ ] OpenAI errors handled gracefully with proper status codes
- [ ] Rate limiting applied to the generation endpoint
- [ ] Requests and responses are logged
- [ ] Endpoint verified working from Postman
