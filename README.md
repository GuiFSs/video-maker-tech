# video-maker-tech

Estúdio local e gratuito para planejar e renderizar **vídeos didáticos short-form** (TikTok, YouTube Shorts, Reels) e pacotes de post (LinkedIn incluso).

O agent planeja **junto com você**. Cada fase só avança com:

```text
Aprovado pelo usuário em YYYY-MM-DD
```

## Pré-requisitos

- Node.js 20+
- [FFmpeg](https://ffmpeg.org/) no PATH (`brew install ffmpeg`)
- Python 3 + [edge-tts](https://github.com/rany2/edge-tts) (`python3 -m pip install --user edge-tts`)
- Chromium do Playwright (`npm run setup`)

No macOS, o `pip --user` costuma instalar o CLI em `~/Library/Python/3.x/bin` — inclua no PATH ou use o resolvedor do render (`python3 -m edge_tts`).

Legendas: o master leva texto nas cenas HTML + `captions.srt`. Burn-in via filtro `subtitles` só roda se o seu ffmpeg tiver **libass**; caso contrário o pipeline segue sem falhar.

## Setup

```bash
cd video-maker-tech
npm install
npm run setup
```

Confira:

```bash
ffmpeg -version
edge-tts --list-voices | head   # ou: python3 -m edge_tts --list-voices
```

## Como pedir um vídeo

No Cursor, com este repo aberto:

> Quero um short sobre microserviços para quem está começando.

O `didactic-orchestrator` cria `content/<slug>/`, preenche o BRIEF e espera sua aprovação antes do outline, storyboard, script, assets e render.

## Renderizar

Com `SCRIPT.md` + `scenes/` prontos e assets aprovados:

```bash
npm run render -- <slug>
```

Exemplo incluso:

```bash
npm run render:example
```

Saída: `content/<slug>/export/vertical-9x16.mp4` (+ `.srt`).

## Estrutura

```text
content/<slug>/
  STATUS.md
  BRIEF.md OUTLINE.md STORYBOARD.md SCRIPT.md ASSETS.md PUBLISH.md
  scenes/   # HTML 9:16
  audio/ frames/ clips/ export/   # gerados (gitignored)
```

Fluxo completo: [`docs/process/video-workflow.md`](docs/process/video-workflow.md).

## Relação com projetos de estudo

No BRIEF, use `fonte_estudo:` apontando para ADRs, lessons ou código de outro repo (ex.: Lista de Compras). O agent **consulta** essa fonte; o ciclo de produto daquele repo não muda.
