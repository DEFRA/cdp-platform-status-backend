# cdp-platform-status-backend

Core delivery platform Node.js Backend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [AWS services (Floci)](#aws-services-floci)
  - [Development](#development)
  - [Testing](#testing)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [API endpoints](#api-endpoints)
- [Development helpers](#development-helpers)
  - [MongoDB Locks](#mongodb-locks)
  - [Proxy](#proxy)
  - [Testing Squid proxy locally](#testing-squid-proxy-locally)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v24` and [npm](https://nodejs.org/) `>= v11`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd cdp-platform-status-backend
nvm use
```

## Local development

> **Docker Compose:** This repository does not include a `compose.yml`. The full local stack (Floci, Redis, MongoDB, backend, and frontend) is defined in [cdp-platform-status-frontend/compose.yml](../cdp-platform-status-frontend/compose.yml). Start it from the frontend repo:
>
> ```bash
> cd ../cdp-platform-status-frontend
> docker compose up --build -d
> ```
>
> Init scripts and compose env files live under `cdp-platform-status-frontend/compose/`. See the [frontend README](../cdp-platform-status-frontend/README.md#docker-compose) for details.

### Setup

Install application dependencies:

```bash
npm install
```

### Git hooks

Install git hooks (optional)

```bash
npm run git:hooks
```

### AWS services (Floci)

This service requires S3, SQS, and SNS. For local development these are emulated by
[Floci](https://floci.io) on port `4566`.

**Recommended:** use Docker Compose in the frontend repository — Floci starts automatically and creates the required resources via `compose/floci/start.d/10-setup-resources.sh`. See [Docker Compose](#docker-compose) below.

**Manual setup** (only if you are not using compose):

**1. Start Floci:**

```bash
docker run -d -p 4566:4566 \
  -e FLOCI_DEFAULT_REGION=eu-west-2 \
  hectorvent/floci:latest-aws
```

**2. Create the required resources** (requires the AWS CLI):

```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://platform-status
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name platform_status
aws --endpoint-url=http://localhost:4566 sns create-topic --name platform_status
```

**3. Configure environment variables:**

Copy `.env.example` to `.env` — the Floci values are already filled in.

```bash
cp .env.example .env
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Testing

To test the application run:

```bash
npm run test
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## API endpoints

| Endpoint             | Description                                       |
| :------------------- | :------------------------------------------------ |
| `GET: /health`       | Health                                            |
| `GET: /status/mongo` | MongoDB connectivity (connect/insert/find/delete) |
| `GET: /status/squid` | Squid proxy (default + app-specific routes)       |
| `GET: /status/s3`    | S3 (list/put/get/delete)                          |
| `GET: /status/sqs`   | SQS (send/receive/delete)                         |
| `GET: /status/sns`   | SNS (publish)                                     |

## Development helpers

### MongoDB Locks

If you require a write lock for Mongo you can acquire it via `server.locker` or `request.locker`:

```javascript
async function doStuff(server) {
  const lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  try {
    // do stuff
  } finally {
    await lock.free()
  }
}
```

Keep it small and atomic.

You may use **using** for the lock resource management.
Note test coverage reports do not like that syntax.

```javascript
async function doStuff(server) {
  await using lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  // do stuff

  // lock automatically released
}
```

Helper methods are also available in `/src/helpers/mongo-lock.js`.

### Proxy

On CDP all outbound traffic goes via the Squid proxy sidecar. The proxy URL is injected automatically as `HTTP_PROXY` /
`HTTPS_PROXY`, and `NODE_USE_ENV_PROXY=1` is set so most Node.js HTTP clients pick it up without extra configuration.

| Client     | Default (CDP)                      | Required tenant setup                  |
| ---------- | ---------------------------------- | -------------------------------------- |
| undici     | Via Squid (automatic)              | None                                   |
| node-fetch | Via Squid (automatic)              | None                                   |
| axios      | Via Squid (`proxy: false` pattern) | Set `axios.defaults.proxy = false`     |
| Wreck      | **Not automatic** — bypasses proxy | Set `Wreck.agents = Https.globalAgent` |

See the [CDP proxy docs](https://github.com/DEFRA/cdp-documentation/blob/main/how-to/proxy.md) for full details.

### Testing Squid proxy locally

By default `HTTP_PROXY` is `null` locally, so all routing behaves as direct. To test the proxy paths in the
network checker, run a local Squid container and start the backend with the proxy env vars set.

A restricted Squid config is provided at [`local/squid/squid.conf`](./local/squid/squid.conf). It only allows
outbound access to the domains in its allowlist (e.g. `example.com`, `www.gov.uk`), blocking everything else with
a 307 — mirroring CDP egress controls.

**1. Start Squid:**

```bash
docker run -d \
  --name local-squid \
  -p 3128:3128 \
  -v $(pwd)/local/squid/squid.conf:/etc/squid/squid.conf:ro \
  ubuntu/squid:latest
```

**2. Add proxy env vars to `.env`:**

```bash
HTTP_PROXY=http://localhost:3128
HTTPS_PROXY=http://localhost:3128
```

**3. Start the backend with `NODE_USE_ENV_PROXY` in the shell:**

```bash
NODE_USE_ENV_PROXY=1 npm run dev
```

> **Note:** `NODE_USE_ENV_PROXY` cannot be set in `.env` — Node processes it during startup
> before `--env-file-if-exists` is loaded. `HTTP_PROXY` / `HTTPS_PROXY` in `.env` are fine
> because they are read by application code at request time. On CDP the platform injects
> `NODE_USE_ENV_PROXY` directly into the process environment, so Default routing works
> automatically there.

Each `/network/check` request logs `env.HTTP_PROXY`, `env.HTTPS_PROXY`, and `env.NODE_USE_ENV_PROXY` so you can
confirm the proxy vars are active.

**What to expect in the network checker:**

| URL                                   | Routing               | Result                                     |
| ------------------------------------- | --------------------- | ------------------------------------------ |
| `https://example.com` (in ACL)        | Default / Force proxy | `200 OK` via Squid                         |
| `https://www.google.com` (not in ACL) | Default / Force proxy | Squid **307 blocked**                      |
| Any external URL                      | Force direct          | **Timeout** — bypasses Squid               |
| Any external URL                      | Default (Wreck only)  | **Timeout** — Wreck does not use env proxy |

To add more allowed domains for testing, edit `local/squid/squid.conf` and restart the container.

**Follow Squid access logs:**

```bash
docker exec local-squid tail -f /var/log/squid/access.log
```

HTTPS requests appear as `CONNECT` entries (e.g. `TCP_TUNNEL/200` for allowed, `TCP_DENIED/403` for blocked).

**Stop Squid when done:**

```bash
docker stop local-squid && docker rm local-squid
```

## Docker

Build:

```bash
docker build --no-cache --tag cdp-platform-status-backend .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 cdp-platform-status-backend
```

### Docker Compose

There is no `compose.yml` in this repository. Use the frontend repo for local development:

| What | Where |
|------|--------|
| Compose file | [../cdp-platform-status-frontend/compose.yml](../cdp-platform-status-frontend/compose.yml) |
| App env (passwords) | [../cdp-platform-status-frontend/compose/app.env](../cdp-platform-status-frontend/compose/app.env) |
| Floci / Mongo init | [../cdp-platform-status-frontend/compose/](../cdp-platform-status-frontend/compose/) |

**Start the full stack:**

```bash
cd ../cdp-platform-status-frontend
docker compose up --build -d
```

**Stop and remove everything (including Mongo data):**

```bash
cd ../cdp-platform-status-frontend
docker compose down -v --remove-orphans
```

**URLs:**

- Backend: http://localhost:3101
- Frontend: http://localhost:3100
- Admin password (compose): see `compose/app.env` in the frontend repo

To run **only this backend** on the host against compose infra, start compose as above, then copy `.env.example` to `.env` and run `npm run dev`.

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
