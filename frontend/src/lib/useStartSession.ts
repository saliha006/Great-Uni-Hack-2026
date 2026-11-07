import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Method } from '../api/types'
import { setLocal } from './local'

// Home → Start → first item in one tap (brief M1 acceptance).
export function useStartSession() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (v: { subjectId: number; subjectName: string; method?: Method }) =>
      api.createSession({ subject_id: v.subjectId, method: v.method }).then((session) => ({ session, subjectName: v.subjectName })),
    onSuccess: ({ session, subjectName }) => {
      setLocal({ resume: { session, subjectName, itemsDone: 0, savedAt: new Date().toISOString() } })
      navigate(`/session/${session.id}`)
    },
  })
}
