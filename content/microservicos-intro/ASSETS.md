# ASSETS — `microservicos-intro`

Depende de: `SCRIPT.md` aprovado.

## Cenas HTML

| Id | Arquivo | Notas |
| --- | --- | --- |
| S01 | `scenes/S01.html` | gancho |
| S02 | `scenes/S02.html` | lojas |
| S03 | `scenes/S03.html` | três pilares |
| S04 | `scenes/S04.html` | exemplo estudo |
| S05 | `scenes/S05.html` | erro comum |
| S06 | `scenes/S06.html` | recap + CTA |

## TTS

- Voz: `pt-BR-ThalitaMultilingualNeural` (rate +10%)
- Manifesto: `scenes.yaml`

## Checklist pré-render

- [x] HTML 1080×1920 com `tools/scene-kit/base.css`
- [x] `scenes.yaml` alinhado ao SCRIPT
- [x] FFmpeg e edge-tts disponíveis
- [x] Duração narrada no alvo ~40s

## Comando

```bash
npm run render -- microservicos-intro
```

Aprovado pelo usuário em 2026-10-29
