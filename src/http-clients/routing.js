import http from 'node:http'
import https from 'node:https'
import { Agent, ProxyAgent } from 'undici'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { config } from '#/config.js'

function getProxyUrl() {
  return config.get('httpProxy')
}

export function createDirectAgents() {
  return {
    http: new http.Agent(),
    https: new https.Agent()
  }
}

export function createProxyAgents(proxyUrl) {
  const agent = new HttpsProxyAgent(proxyUrl)
  return {
    http: agent,
    https: agent
  }
}

export function resolveHttpAgents(routing) {
  if (routing === 'direct') {
    return createDirectAgents()
  }

  if (routing === 'proxy') {
    const proxyUrl = getProxyUrl()
    return proxyUrl ? createProxyAgents(proxyUrl) : undefined
  }

  return undefined
}

export function agentForUrl(url, agents) {
  if (!agents) {
    return undefined
  }

  return url.startsWith('https:') ? agents.https : agents.http
}

export function resolveUndiciDispatcher(routing) {
  if (routing === 'direct') {
    return new Agent()
  }

  if (routing === 'proxy') {
    const proxyUrl = getProxyUrl()
    return proxyUrl ? new ProxyAgent(proxyUrl) : undefined
  }

  return undefined
}
