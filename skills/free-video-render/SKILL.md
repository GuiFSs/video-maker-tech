---
name: free-video-render
description: Gera scenes HTML 9:16, scenes.yaml e renderiza MP4 com edge-tts + FFmpeg + Playwright.
---

# Free video render

1. Exija `SCRIPT.md` aprovado.
2. Crie `scenes/Sxx.html` usando o kit em `tools/scene-kit/` (1080×1920, tokens do CSS).
3. Escreva `scenes.yaml` e `ASSETS.md`; peça aprovação de assets.
4. Com assets aprovados, rode `npm run render -- <slug>`.
5. Verifique `export/vertical-9x16.mp4` e `export/captions.srt`.
6. Se falhar (ffmpeg, edge-tts, playwright), diagnostique e corrija — não marque sucesso.

Stack permitida: edge-tts, FFmpeg, Playwright, Node scripts deste repo.
