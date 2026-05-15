import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'
global.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder
global.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder
global.ReadableStream = ReadableStream as unknown as typeof globalThis.ReadableStream
