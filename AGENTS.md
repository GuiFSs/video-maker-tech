# Guia de colaboração — video-maker-tech

Este repositório é um **estúdio de vídeos didáticos** short-form (TikTok, YouTube Shorts, Reels, LinkedIn). O objetivo é planejar com o usuário, aprovar fase a fase e, só então, renderizar um `.mp4` 9:16 com ferramentas **gratuitas** (edge-tts, FFmpeg, HTML/CSS + Playwright).

## Fonte de verdade

Leia antes de criar ou alterar um vídeo:

- `docs/process/video-workflow.md` — fluxo, gates, DoR/DoD e frase de aprovação
- `docs/pedagogy/short-form.md` — princípios didáticos
- `docs/style/techpulse-like.md` — 1 canvas, gancho, motion (anti-slide)
- `docs/style/voice-external.md` — voz humana / CapCut (preferido ao edge-tts)
- Templates em `docs/templates/`
- Skills em `skills/`
- Briefings em `agents/`

Não invente fatos técnicos. Se o brief apontar `fonte_estudo:` (ex.: outro repo de estudo), leia essa fonte em modo referência.

## Ciclo de produção

Cada vídeo em `content/<slug>/` segue:

**Brief → Outline → Storyboard → Script → Assets → Render → Publish**

Gates só fecham com a frase canônica:

`Aprovado pelo usuário em YYYY-MM-DD`

O orquestrador lê e corrige só o `STATUS.md`; não pula fases.

## Agents

1. `didactic-orchestrator` — coordena fases e gates (agente padrão).
2. `concept-planner` — BRIEF + OUTLINE.
3. `storyboarder` — STORYBOARD.
4. `scriptwriter` — SCRIPT.
5. `video-producer` — ASSETS, render free, PUBLISH pack.

## Stack free (não negociável no v1)

- Narração: **voz humana ou CapCut** em `audio/external/` (preferido); `edge-tts` só fallback
- Montagem: FFmpeg
- Visuais: HTML 1080×1920 **animado** gravado com Playwright (preferir 1 canvas + timeline)
- Comando: `npm run render -- <slug>`

Sem APIs pagas de vídeo, voz ou edição. Não versionar áudios nem exports (ver `.gitignore`).

## Regras

- Um vídeo = uma ideia central.
- Idioma padrão: português (Brasil).
- Master de export: 9:16 (~30–60s).
- Não versionar áudio/frames/export gerados (ver `.gitignore`).
- Não versionar segredos.
- Commits só quando o usuário pedir.
