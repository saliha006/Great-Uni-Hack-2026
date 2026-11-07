// Compile-time check that the hand-written types.ts still matches the backend's /openapi.json.
// Regenerate schema.d.ts with `npm run gen:api`; `npm run build` then fails here on any drift.
// Each pair is an identity function both ways: it only type-checks if the shapes are compatible.
import type { components } from './schema'
import type * as T from './types'

type S = components['schemas']

export const contractChecks = {
  Subject: [(x: S['Subject']): T.Subject => x, (x: T.Subject): S['Subject'] => x],
  Plan: [(x: S['Plan']): T.Plan => x, (x: T.Plan): S['Plan'] => x],
  MethodStatView: [(x: S['MethodStatView']): T.MethodStatView => x, (x: T.MethodStatView): S['MethodStatView'] => x],
  Readiness: [(x: S['Readiness']): T.Readiness => x, (x: T.Readiness): S['Readiness'] => x],
  SubjectSummary: [(x: S['SubjectSummary']): T.SubjectSummary => x, (x: T.SubjectSummary): S['SubjectSummary'] => x],
  Session: [(x: S['Session']): T.Session => x, (x: T.Session): S['Session'] => x],
  Item: [(x: S['Item']): T.Item => x, (x: T.Item): S['Item'] => x],
  AnswerBody: [(x: S['AnswerBody']): T.AnswerBody => x, (x: T.AnswerBody): S['AnswerBody'] => x],
  AnswerResult: [(x: S['AnswerResult']): T.AnswerResult => x, (x: T.AnswerResult): S['AnswerResult'] => x],
  SessionEvent: [(x: S['SessionEvent']): T.SessionEvent => x, (x: T.SessionEvent): S['SessionEvent'] => x],
  AttentionReading: [(x: S['AttentionReading']): T.AttentionReading => x, (x: T.AttentionReading): S['AttentionReading'] => x],
  Intervention: [(x: S['Intervention']): T.Intervention => x, (x: T.Intervention): S['Intervention'] => x],
  EventsResult: [(x: S['EventsResult']): T.EventsResult => x, (x: T.EventsResult): S['EventsResult'] => x],
  FeynmanTurn: [(x: S['FeynmanTurn']): T.FeynmanTurn => x, (x: T.FeynmanTurn): S['FeynmanTurn'] => x],
  FeynmanResult: [(x: S['FeynmanResult']): T.FeynmanResult => x, (x: T.FeynmanResult): S['FeynmanResult'] => x],
  Decision: [(x: S['Decision']): T.Decision => x, (x: T.Decision): S['Decision'] => x],
  Reflection: [(x: S['Reflection']): T.Reflection => x, (x: T.Reflection): S['Reflection'] => x],
  ProbeBody: [(x: S['ProbeBody']): T.ProbeBody => x, (x: T.ProbeBody): S['ProbeBody'] => x],
  VoiceContext: [(x: S['VoiceContext']): T.VoiceContext => x, (x: T.VoiceContext): S['VoiceContext'] => x],
  SignedUrl: [(x: S['SignedUrl']): T.SignedUrl => x, (x: T.SignedUrl): S['SignedUrl'] => x],
  AdvanceDaysResult: [(x: S['AdvanceDaysResult']): T.AdvanceDaysResult => x, (x: T.AdvanceDaysResult): S['AdvanceDaysResult'] => x],
}
