# Adapta Hackathon

<img width="1440" height="120" alt="image" src="https://github.com/user-attachments/assets/878650a8-e90d-4ca5-a50d-ca0e178a83c3" />

Reduza o treinamento do seu vendedor de 30 dias para 3! Nos trazemos a resposta certa na hora certa.

## Stack Tecnológico

- `app` - Aplicativo Electron
  - grava áudio do microfone e áudio do sistema
  - corta o áudio quando o usuário para de falar por 500ms
  - recebe os insights via websocket

- `api` - API
  - recebe áudio do app, usa ffmpeg para acelerar o áudio (reduz custos e tempo)
  - usa modelos open source groq (pensando na velocidade de resposta)
  - salva todas as transcrições no supabase
  - usa supabase realtime para detectar quando o cliente responde
  - usa o llama 8b para entender as últimas 30 conversas, o que o usuário quer e gerar um insight para o vendedor
  - rag para atender o contexto empresarial (está mockado para esta poc apenas para velocidade)

## Configuração do Projeto

```bash
$ pnpm install
```

```bash
$ pnpm dev
```
