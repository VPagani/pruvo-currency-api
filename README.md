# Pruvo Currency API

Coding assignment by Pruvo

## Running

Requirements:

- Docker v20
- Docker Compose v2
- [Open Exchange Rates](https://openexchangerates.org) app id

Create a `.env` file, paste contents from `.env.example` and add your OpenExchangeRate app id to `OXR_APP_ID` variable, then just run:

```bash
yarn install
yarn build
docker compose up --build
```

To request a currency conversion, fetch the API in another terminal like this:

```bash
curl -X POST http://localhost:8000/conversion \
  -H 'Content-Type: application/json' \
  -d '{ "amount": 546, "baseCurrency": "USD", "targetCurrency": "BRL", "email":  "myself@home.local" }'
```

The dummy email message should appear in the terminal after API and Conversion logs, like in this example:

```
pruvo-currency-api-api-1         | {"level":30,"time":1675145523287,"pid":1,"hostname":"da05cf70796e","reqId":"req-4","req":{"method":"POST","url":"/conversion","hostname":"localhost:8000","remoteAddress":"172.26.0.1","remotePort":50158},"msg":"incoming request"}
pruvo-currency-api-api-1         | {"level":30,"time":1675145523306,"pid":1,"hostname":"da05cf70796e","reqId":"req-4","res":{"statusCode":200},"responseTime":18.87491000071168,"msg":"request completed"}
pruvo-currency-api-conversion-1  | Converted 1000 USD to 5116.857999999999 BRL (fetched rate 5116.857999999999)
pruvo-currency-api-mailer-1      | Send mail to "myself@home.local" from "no-reply@home.local" with subject "Currency Conversion" and text "Converted 1000 USD to 5116.857999999999 BRL"
```

## Architecture

This API is separated in 3 services:

1. [**API:**](./src/api/) Receives the requests for currency conversion and delegates the task to the **Conversion Worker**;
2. [**Conversion Worker:**](./src/conversion/) Fetches currency conversion rates from Open Exchange Rates or from cache (1 hour timeout by default) and delegates the mail sending task to the **Mailer Worker**;
3. [**Mailer Worker:**](./src/mailer/) Send the currency conversion result to the user that requested.

Each service is intended to run on 1 of the 3 cloud instances available (1 CPU and 2GB RAM) to prevent one slowing down the other, smoothly handle burstable loads and be highly available.

This project uses [_AWS SQS_](https://aws.amazon.com/pt/sqs/) to provide communication and delagate tasks between the service workers.

## API

### Request currency conversion

`POST /conversion`

Body parameters:

- `amount`: number; represents the amount of the base currency;
- `baseCurrency`: string; currency symbol from which to calculate the conversion;
- `targetCurrency`: string; symbol of the wanted currency;
- `email`: string; email to send the conversion result.

#### Responses

If request is valid (doesn't mean the conversion is successful):

```json
{
  "ok": true
}
```

Otherwise, if a field is missing from the body:

```json
{
  "ok": false,
  "issues": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "undefined",
      "path": ["amount"],
      "message": "Required"
    }
  ]
}
```
