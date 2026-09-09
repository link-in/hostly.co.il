#!/usr/bin/env node
/**
 * Posts the Vercel Preview URL onto the linked Linear issue.
 * Keep extract/comment helpers in sync with `src/lib/linear/previewComment.ts`.
 */
import fs from 'node:fs'

const ISSUE_ID_RE = /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g
const FIXES_ISSUE_RE = /\b(?:fixes|closes|resolves)\s+([A-Z][A-Z0-9]{1,9}-\d+)\b/i

function extractLinearIssueId(text) {
  if (!text) return null
  const fixes = text.match(FIXES_ISSUE_RE)
  if (fixes?.[1]) return fixes[1].toUpperCase()
  const matches = [...text.matchAll(ISSUE_ID_RE)]
  if (matches.length === 0) return null
  return matches[0][1].toUpperCase()
}

function extractLinearIssueIdFromSources(sources) {
  for (const source of sources) {
    const id = extractLinearIssueId(source)
    if (id) return id
  }
  return null
}

function alreadyPostedPreviewUrl(existingBodies, previewUrl) {
  return existingBodies.some((body) => body.includes(previewUrl))
}

function buildLinearPreviewComment({ previewUrl, prUrl, branch }) {
  const lines = ['קישור Preview לבדיקה במובייל:', '', previewUrl]
  if (branch) lines.push('', 'ענף:', branch)
  if (prUrl) lines.push('', 'בקשת משיכה:', prUrl)
  return lines.join('\n')
}

function readEvent() {
  return JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
}

async function githubJson(path) {
  const token = process.env.GITHUB_TOKEN
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json, application/vnd.github.groot-preview+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub ${path} failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function linearGraphql(query, variables) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (!res.ok || json.errors) {
    throw new Error(`Linear GraphQL failed: ${JSON.stringify(json.errors || json)}`)
  }
  return json.data
}

async function main() {
  const event = readEvent()
  const deployment = event.deployment || {}
  const status = event.deployment_status || {}
  const state = String(status.state || '').toLowerCase()
  const environment = String(status.environment || deployment.environment || '')
  const previewUrl = status.environment_url || status.target_url || ''
  const sha = deployment.sha
  const ref = String(deployment.ref || '').replace(/^refs\/heads\//, '')

  if (state !== 'success') {
    console.log(`Skip: deployment state is ${state}`)
    return
  }
  if (/production/i.test(environment)) {
    console.log('Skip: production deployment')
    return
  }
  if (!previewUrl || !/^https?:\/\//.test(previewUrl)) {
    console.log('Skip: no preview URL on this deployment')
    return
  }
  if (!process.env.LINEAR_API_KEY) {
    console.log('Skip: LINEAR_API_KEY secret is not set')
    return
  }

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
  const associated = await githubJson(
    `/repos/${owner}/${repo}/commits/${sha}/pulls`
  )
  const pr = Array.isArray(associated) ? associated[0] : null
  const issueId = extractLinearIssueIdFromSources([
    pr?.body,
    pr?.title,
    pr?.head?.ref,
    ref,
  ])

  if (!issueId) {
    console.log('Skip: no Linear issue id in PR title/body/branch (need Fixes HOS-123)')
    return
  }

  const issueData = await linearGraphql(
    `query($id: String!) {
      issue(id: $id) {
        id
        identifier
        comments(first: 50) { nodes { body } }
      }
    }`,
    { id: issueId }
  )

  if (!issueData.issue) {
    console.log(`Skip: Linear issue ${issueId} not found`)
    return
  }

  const existing = (issueData.issue.comments?.nodes || []).map((node) => node.body || '')
  if (alreadyPostedPreviewUrl(existing, previewUrl)) {
    console.log(`Skip: ${issueId} already has this preview URL`)
    return
  }

  const body = buildLinearPreviewComment({
    previewUrl,
    prUrl: pr?.html_url,
    branch: pr?.head?.ref || ref,
  })

  const created = await linearGraphql(
    `mutation($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
        comment { id url }
      }
    }`,
    { issueId: issueData.issue.id, body }
  )

  if (!created.commentCreate?.success) {
    throw new Error(`Linear commentCreate failed for ${issueId}`)
  }

  console.log(`Posted preview link to ${issueData.issue.identifier}: ${created.commentCreate.comment.url}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
