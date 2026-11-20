import * as Effect from 'effect/Effect'

import { GitHubSessionPort } from '../../ports/github-session.port.ts'

export const signOutGitHubProgram = Effect.flatMap(GitHubSessionPort, (sessions) => sessions.clear)
