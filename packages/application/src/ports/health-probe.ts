export type HealthProbeResult = {
  healthy: boolean
  detail?: string
}

export interface HealthProbe {
  readonly name: string
  check(): Promise<HealthProbeResult>
}
