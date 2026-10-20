# Img Gen Playground

A multi-model AI image generation playground powered by [Vercel AI Gateway](https://vercel.com/ai-gateway). Generate and edit images with models from OpenAI, Google, xAI, Black Forest Labs (FLUX), Recraft, and ByteDance — all through a single API key. No login, no database.

## Features

- **Many models, one selector** — GPT Image, Gemini, Grok, FLUX.2, Recraft, Seedream.
- **Per-model aspect ratios** — the selector only offers ratios each model supports; switching models snaps to the closest.
- **GPT quality control**, Gemini thinking/resolution/grounding.
- **Text-to-image and image editing** (drag & drop or paste a URL).
- Generated images are stored in **Vercel Blob**; history is kept in your browser (localStorage).

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/vercel-labs/v0-nanobanana-template.git
   cd v0-nanobanana-template
   pnpm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Required | Description |
   |----------|----------|-------------|
   | `AI_GATEWAY_API_KEY` | Yes | Your [Vercel AI Gateway](https://vercel.com/ai-gateway) API key — every generation is billed to it |
   | `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob token where generated images are stored |

3. **Run**

   ```bash
   pnpm dev
   ```

## How it works

The app runs each generation as a durable [Vercel Workflow](https://vercel.com/docs/workflow). Gemini models generate via the AI SDK's `generateText` (with image response modalities); all other providers go through `generateImage`. Every request uses **your** AI Gateway key, so you control the models and the spend — there's no per-user login or credit system.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel-labs/v0-nanobanana-template)

Add `AI_GATEWAY_API_KEY` and attach **Blob** storage (which provides `BLOB_READ_WRITE_TOKEN`) in your Vercel project settings.
