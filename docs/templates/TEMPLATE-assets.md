# ASSETS — `<slug>`

Depende de: `SCRIPT.md` aprovado.

## Cenas HTML

| Id | Arquivo | Notas |
| --- | --- | --- |
| S01 | `scenes/S01.html` | |
| S02 | `scenes/S02.html` | |

## TTS

- Voz: `pt-BR-AntonioNeural`
- Arquivos gerados em `audio/` pelo render (não versionar)

## Checklist pré-render

- [ ] Todos os HTML abrem em 1080×1920 sem overflow grave
- [ ] `scenes.yaml` alinhado ao SCRIPT
- [ ] FFmpeg e edge-tts disponíveis
- [ ] Duração narrada cabe no alvo do BRIEF

## Comando

```bash
npm run render -- <slug>
```

<!-- Gate: aprovar assets *antes* do render final -->
