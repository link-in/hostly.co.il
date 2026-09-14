#!/usr/bin/env node
/**
 * Marks a Linear issue Done (completed workflow state) and posts a Hebrew
 * completion comment. Used when a cloud agent ships directly to main and
 * cannot call Linear from the VM (no LINEAR_API_KEY locally).
 *
 * Env:
 *   LINEAR_API_KEY  — repo secret
 *   LINEAR_ISSUE_ID — e.g. HOS-12
 *   LINEAR_COMMENT  — optional Markdown body
 */
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

function pickCompletedState(states) {
  const completed = (states || []).filter((state) => state.type === 'completed')
  if (completed.length === 0) return null
  const done = completed.find((state) => /done|הושלם|complete/i.test(state.name))
  return done || completed[0]
}

async function main() {
  const issueId = process.env.LINEAR_ISSUE_ID
  if (!process.env.LINEAR_API_KEY) {
    throw new Error('LINEAR_API_KEY is not set')
  }
  if (!issueId) {
    throw new Error('LINEAR_ISSUE_ID is not set')
  }

  const data = await linearGraphql(
    `query($id: String!) {
      issue(id: $id) {
        id
        identifier
        url
        state { id name type }
        team {
          states {
            nodes { id name type }
          }
        }
      }
    }`,
    { id: issueId },
  )

  const issue = data.issue
  if (!issue) {
    throw new Error(`Linear issue ${issueId} not found`)
  }

  if (issue.state?.type === 'completed') {
    console.log(`${issue.identifier} is already ${issue.state.name}`)
    return
  }

  const completedState = pickCompletedState(issue.team?.states?.nodes)
  if (!completedState) {
    throw new Error(`No completed workflow state found for ${issue.identifier}`)
  }

  const updated = await linearGraphql(
    `mutation($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
        issue { identifier state { name type } }
      }
    }`,
    { id: issue.id, stateId: completedState.id },
  )

  if (!updated.issueUpdate?.success) {
    throw new Error(`issueUpdate failed for ${issue.identifier}`)
  }

  console.log(
    `${issue.identifier} → ${updated.issueUpdate.issue.state.name} (${issue.url})`,
  )

  const body = process.env.LINEAR_COMMENT
  if (!body) return

  const created = await linearGraphql(
    `mutation($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
        comment { url }
      }
    }`,
    { issueId: issue.id, body },
  )

  if (!created.commentCreate?.success) {
    throw new Error(`commentCreate failed for ${issue.identifier}`)
  }
  console.log(`Commented: ${created.commentCreate.comment.url}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
