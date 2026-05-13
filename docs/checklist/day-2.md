# Day 2 Checklist — OpenAI SDK in NestJS + Service Architecture

**Project focus:** AI Chat Assistant (backend integration) + Progressive Gen (service pipeline)

---

## 1. Setup

- [x] Install OpenAI SDK in NestJS project (`npm install openai`)
- [x] Add `OPENAI_API_KEY` to `.env` and NestJS `ConfigModule`
- [x] Verify environment variable loads correctly inside the NestJS app
- [x] Learn OpenAI SDK for Node.js API and usage patterns

---

## 2. Core Learning

- [x] Learn service composition patterns in NestJS
- [x] Understand how to inject `ConfigService` for API key management
- [x] Learn rate limiting concepts for generation endpoints
- [x] Understand NestJS module and provider wiring

---

## 3. Services

- [x] Create `NarrativeGeneratorService`  with OpenAI integration
- [x] Create stub `GraphService` (loads graph/meta data)
- [x] Create stub `StateService` (manages session/state)
- [x] Create stub `EngineService` (orchestrates pipeline)
- [x] Wire `NarrativeGeneratorService` to load meta directives + style guide at runtime
- [x] Register all services in the appropriate NestJS module

---

## 4. Endpoint

- [x] Create `POST /api/generate` endpoint in the controller
- [x] Wire endpoint to call `NarrativeGeneratorService`
- [x] Return generated narrative text in the response payload
- [x] Return hardcoded `choices` array alongside the narrative
- [x] Verify endpoint works end-to-end from Postman

---

## 5. Error Handling & Logging

- [x] Handle OpenAI API errors gracefully (network failures, auth errors, bad requests)
- [x] Handle rate limit errors from OpenAI with appropriate response codes
- [x] Add request logging (method, path, body) for the generate endpoint
- [x] Add response logging (status, generated text length, latency)
- [x] Implement rate limiting on the `/api/generate` endpoint

---

## 6. Success Criteria

- [x] OpenAI SDK installed and working inside NestJS
- [x] `NarrativeGeneratorService` created with OpenAI integration
- [x] `/api/generate` endpoint implemented and reachable
- [x] Stub services created for graph and engine pipeline
- [x] API key managed securely via environment variables
- [ ] Response returns both narrative text and choices array
- [x] OpenAI errors handled gracefully with proper status codes
- [x] Rate limiting applied to the generation endpoint
- [x] Requests and responses are logged
- [ ] Endpoint verified working from Postman
