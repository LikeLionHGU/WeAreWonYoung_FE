import type { AnalysisWarning } from '../api/types'

// The backend reports every analyzer that is switched off; those are not problems with this video.
export function visibleWarnings(warnings: AnalysisWarning[]): AnalysisWarning[] {
  return warnings.filter(warning => !warning.code.endsWith('_NOT_ENABLED'))
}
