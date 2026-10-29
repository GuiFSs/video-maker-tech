# Narração com voz humana ou TTS externo (100% free)

O `edge-tts` (Antonio/Thalita) é neural, mas ainda soa “robótico” no celular. Preferência do projeto: **áudio externo** — o render só sincroniza o visual.

## Opção A — gravar a própria voz (recomendado)

1. Grave o roteiro (`NARRATION.txt` do pacote) no WhatsApp, Ditafone ou Gravador.
2. Formatos ok: `.opus`, `.ogg`, `.m4a`, `.mp3`, `.wav`, `.aac`.
3. Coloque o arquivo em:

```text
content/<slug>/voice-record/voice-1.opus   # rascunho (gitignored)
```

ou já normalizado:

```text
content/<slug>/audio/external/S01.mp3     # usado pelo render (gitignored)
```

4. Peça ao agent: “usa minha voz e sincroniza a timeline”.
5. O pipeline converte `.opus` → MP3 via FFmpeg e **não chama** edge-tts se `audio/external/` tiver arquivo.

### Sync visual ↔ fala

A cena TechPulse-like (`scenes/main.html`) usa uma **timeline JS** (`phases[].at` em segundos). Depois de cada gravação, ajuste os timestamps às pausas da fala (ou peça ao agent com “no segundo X a tela adiantou”).

## Opção B — CapCut / TTSMaker

1. Cole `NARRATION.txt` no CapCut (Texto → Texto para fala) ou [TTSMaker](https://ttsmaker.com/).
2. Exporte MP3 → `audio/external/S01.mp3`.
3. `npm run render -- <slug>`.

## O que não versionar

Áudios de voz e renders ficam no `.gitignore`:

- `content/**/audio/`
- `content/**/voice-record/`
- `content/**/export/` (exceto `.gitkeep`)

Guarde backup local da gravação; o repo versiona só o roteiro e o HTML/timeline.
