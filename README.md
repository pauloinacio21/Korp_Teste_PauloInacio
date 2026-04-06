# Korp — Sistema de Notas Fiscais

Sistema de emissão de notas fiscais com controle de estoque, desenvolvido com .NET 9, Angular e PostgreSQL.

## Pré-requisitos

- [Docker](https://www.docker.com/products/docker-desktop) instalado e rodando

## Como rodar

```bash
git clone https://github.com/pauloinacio21/Korp_Teste_PauloInacio
cd Korp_Teste_PauloInacio/Korp_Teste_PauloInacio
```

Crie um arquivo `.env` na raiz do projeto com sua chave da API Anthropic:

```
Claude_API=sua-chave-aqui
```

Depois suba os containers:

```bash
docker-compose up --build
```

Aguarde o build e acesse **http://localhost:4200**

## Serviços

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:4200 |
| Estoque API | http://localhost:5001 |
| Faturamento API | http://localhost:5002 |
