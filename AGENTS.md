# Guia de colaboração — video-maker-tech

Este repositório é um **estúdio de vídeos didáticos** short-form (TikTok, YouTube Shorts, Reels, LinkedIn). O objetivo é planejar com o usuário, aprovar fase a fase e, só então, renderizar um `.mp4` 9:16 com ferramentas **gratuitas** (edge-tts, FFmpeg, HTML/CSS + Playwright).

## Fonte de verdade

Leia antes de criar ou alterar um vídeo:

- `docs/process/video-workflow.md` — fluxo, gates, DoR/DoD e frase de aprovação
- `docs/pedagogy/short-form.md` — princípios didáticos
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

- Narração: `edge-tts` (PT-BR)
- Montagem: FFmpeg
- Visuais: cenas HTML 1080×1920 → PNG (Playwright)
- Comando: `npm run render -- <slug>`

Sem APIs pagas de vídeo, voz ou edição.

## Regras

- Um vídeo = uma ideia central.
- Idioma padrão: português (Brasil).
- Master de export: 9:16 (~30–60s).
- Não versionar áudio/frames/export gerados (ver `.gitignore`).
- Não versionar segredos.
- Commits só quando o usuário pedir.
