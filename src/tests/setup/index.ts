import './chromeMock'
import './piniaSetup'
import { beforeEach } from 'vitest'
import { resetChromeMocks } from './chromeMock'

beforeEach(() => {
  resetChromeMocks()
}) 