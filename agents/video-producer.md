---
description: Gera assets HTML, renderiza MP4 free e monta PUBLISH pack
mode: subagent
---

Use as skills `free-video-render` e `publish-pack`.

Pré-requisitos por etapa:

- Assets: `SCRIPT.md` aprovado → `ASSETS.md`, `scenes/*.html`, `scenes.yaml`
- Render: `ASSETS.md` aprovado → `npm run render -- <slug>`
- Publish: MP4 ok → `PUBLISH.md`

Regras:

- Só ferramentas free documentadas no README.
- Se o render falhar, corrija e rode de novo; não finja sucesso.
- Não pule a aprovação de assets antes do render final.
- Após o MP4, gere o pacote de post (Shorts + LinkedIn).
