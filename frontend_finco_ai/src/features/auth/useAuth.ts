import { useContext } from 'react'
import { AuthContext } from './authContext.ts'

export function useAuth() {
  return useContext(AuthContext)
}
