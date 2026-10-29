# Fluxo de produção de vídeo didático

Ciclo canônico por pacote em `content/<slug>/`:

**Brief → Outline → Storyboard → Script → Assets → Render → Publish**

## Frase de aprovação

Todo gate de artefato fecha **somente** com a linha (no final do arquivo aprovado):

```text
Aprovado pelo usuário em YYYY-MM-DD
```

Sem essa frase, o orquestrador **não** avança de fase. `STATUS.md` reflete a realidade dos artefatos; se divergir, corrige-se só o STATUS.

## Fases

| Fase | Artefato | Agent / skill | DoR (entrada) | DoD (saída) |
| --- | --- | --- | --- | --- |
| Brief | `BRIEF.md` | concept-planner / concept-brief | Tema ou pergunta do usuário | Tema, público, gancho, 1 ideia, redes, duração alvo, `fonte_estudo` opcional + aprovação |
| Outline | `OUTLINE.md` | concept-planner / concept-brief | BRIEF aprovado | Objetivos de aprendizagem, arco pedagógico, beats + aprovação |
| Storyboard | `STORYBOARD.md` | storyboarder / storyboard | OUTLINE aprovado | Cenas 3–8s, texto na tela, visual, tempo estimado + aprovação |
| Script | `SCRIPT.md` | scriptwriter / short-form-script | STORYBOARD aprovado | Narração PT-BR por cena, legendas, CTA + aprovação |
| Assets | `ASSETS.md` + `scenes/*.html` | video-producer / free-video-render | SCRIPT aprovado | HTML das cenas, lista de TTS, checklist de render + aprovação |
| Render | `export/vertical-9x16.mp4` | video-producer / free-video-render | ASSETS aprovado | MP4 9:16 + SRT; duração ~30–60s (salvo BRIEF) |
| Publish | `PUBLISH.md` | video-producer / publish-pack | Render ok | Caption Shorts/TikTok, post LinkedIn, hashtags, texto de capa + aprovação |

## STATUS.md

Campos mínimos:

- **Fase atual**
- **Próxima ação**
- **Bloqueios** (perguntas ao usuário)
- **Histórico** curto de aprovações

O orquestrador é o único papel que edita `STATUS.md` por padrão (demais agents atualizam ao concluir a tarefa delegada, via handoff).

## Handoff padronizado

Ao encerrar uma fase, o agent reporta:

1. Artefato(s) tocados
2. O que falta para aprovação do usuário
3. Próxima fase sugerida (sem executá-la se o gate não fechou)

## Regras de avanço

1. Sequencial: não pule fases.
2. Perguntas só quando a resposta muda brief, arco, visual ou narração.
3. Stack free: edge-tts + FFmpeg + HTML/Playwright. Sem ferramentas pagas.
4. Falha de render: corrigir assets/script; não “aprovar” o vídeo quebrado.
5. Retrabalho: se o usuário rejeitar, atualize o artefato, remova a frase de aprovação antiga e peça nova aprovação.

## Duração e formato

- Master: **1080×1920** (9:16)
- Alvo default: **30–60 segundos**
- Idioma: **pt-BR**
