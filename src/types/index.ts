export type WellType = 'cylindrical' | 'square' | 'irregular'

export const WELL_TYPE_OPTIONS = [
  { label: '圆形井', value: 'cylindrical' },
  { label: '方形井', value: 'square' },
  { label: '不规则井', value: 'irregular' }
]

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'foggy'

export const WEATHER_OPTIONS = [
  { label: '☀️ 晴天', value: 'sunny' },
  { label: '☁️ 多云', value: 'cloudy' },
  { label: '🌧️ 雨天', value: 'rainy' },
  { label: '❄️ 雪天', value: 'snowy' },
  { label: '💨 大风', value: 'windy' },
  { label: '🌫️ 雾天', value: 'foggy' }
]

export type WindLevel = 'calm' | 'light' | 'moderate' | 'strong' | 'violent'

export const WIND_LEVEL_OPTIONS = [
  { label: '0级 无风', value: 'calm' },
  { label: '1-3级 轻风', value: 'light' },
  { label: '4-6级 中风', value: 'moderate' },
  { label: '7-9级 强风', value: 'strong' },
  { label: '10级以上 狂风', value: 'violent' }
]

export type OperatorRole = 'researcher' | 'assistant' | 'volunteer' | 'expert' | 'student'

export const OPERATOR_ROLE_OPTIONS = [
  { label: '研究员', value: 'researcher' },
  { label: '助理研究员', value: 'assistant' },
  { label: '志愿者', value: 'volunteer' },
  { label: '领域专家', value: 'expert' },
  { label: '实习学生', value: 'student' }
]

export type LiftingPosture = 'standing_two_hand' | 'standing_one_hand' | 'sitting' | 'teamwork' | 'crank'

export const LIFTING_POSTURE_OPTIONS = [
  { label: '站立双手摇', value: 'standing_two_hand' },
  { label: '站立单手摇', value: 'standing_one_hand' },
  { label: '坐姿摇', value: 'sitting' },
  { label: '多人协作', value: 'teamwork' },
  { label: '曲柄式', value: 'crank' }
]

export interface EnvironmentConditions {
  weather: WeatherType
  temperature: number
  humidity: number
  windLevel: WindLevel
  waterLevelFluctuation: number
}

export interface OperatorInfo {
  id: string
  name: string
  role: OperatorRole
  yearsOfExperience?: number
}

export interface MaintenanceIntervention {
  type: 'lubrication' | 'adjustment' | 'repair' | 'replacement' | 'cleaning'
  targetComponent: string
  description: string
  duration: number
}

export interface HumanOperationRecord {
  operatorCount: number
  operators: OperatorInfo[]
  liftingPosture: LiftingPosture
  midPauseCount: number
  totalPauseDuration: number
  maintenanceInterventions: MaintenanceIntervention[]
  operationNotes?: string
}

export interface EnvHumanFilterCriteria {
  schemeIds?: string[]
  roundNos?: number[]
  weather?: WeatherType[]
  temperatureRange?: [number, number]
  humidityRange?: [number, number]
  windLevel?: WindLevel[]
  waterLevelFluctuationRange?: [number, number]
  operatorRoles?: OperatorRole[]
  operatorCountRange?: [number, number]
  liftingPostures?: LiftingPosture[]
  hasMaintenance?: boolean
  abnormalTypes?: AbnormalType[]
}

export type ComponentType = 'wheel' | 'shaft' | 'support' | 'crank'

export const COMPONENT_TYPE_OPTIONS = [
  { label: '汲水轮（轮盘）', value: 'wheel' },
  { label: '轴（中轴）', value: 'shaft' },
  { label: '支架（支撑架）', value: 'support' },
  { label: '曲柄（摇柄）', value: 'crank' }
]

export type RopeMaterial = 'hemp' | 'sisal' | 'cotton' | 'leather' | 'bamboo'

export const ROPE_MATERIAL_OPTIONS = [
  { label: '麻绳', value: 'hemp' },
  { label: '剑麻', value: 'sisal' },
  { label: '棉绳', value: 'cotton' },
  { label: '皮绳', value: 'leather' },
  { label: '竹篾绳', value: 'bamboo' }
]

export type BucketMaterial = 'wood' | 'ceramic' | 'metal' | 'bamboo'

export const BUCKET_MATERIAL_OPTIONS = [
  { label: '木桶', value: 'wood' },
  { label: '陶桶', value: 'ceramic' },
  { label: '金属桶', value: 'metal' },
  { label: '竹桶', value: 'bamboo' }
]

export interface ComponentConfig {
  id: string
  componentNo: string
  type: ComponentType
  material: string
  diameter?: number
  length?: number
  weight?: number
  wearResistance: number
  notes?: string
}

export interface RopeConfig {
  id: string
  ropeNo: string
  material: RopeMaterial
  diameter: number
  length: number
  breakingStrength: number
  wearResistance: number
  notes?: string
}

export interface BucketConfig {
  id: string
  bucketNo: string
  material: BucketMaterial
  capacity: number
  weight: number
  wallThickness?: number
  wearResistance: number
  notes?: string
}

export interface WellConfig {
  type: WellType
  depth: number
  diameter: number
  waterLevel: number
  wallMaterial?: string
}

export type AbnormalType = 'timeout' | 'highLeakage' | 'wearSpike' | 'none'

export const ABNORMAL_TYPE_LABELS: Record<AbnormalType, string> = {
  timeout: '超时异常',
  highLeakage: '漏水过高',
  wearSpike: '磨损突增',
  none: '正常'
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待审查',
  approved: '已通过',
  rejected: '已驳回'
}

export interface AbnormalRuleConfig {
  timeoutThreshold: number
  highLeakageThreshold: number
  wearSpikeThreshold: number
}

export const DEFAULT_ABNORMAL_RULES: AbnormalRuleConfig = {
  timeoutThreshold: 120,
  highLeakageThreshold: 30,
  wearSpikeThreshold: 3
}

export interface TrialRound {
  roundNo: number
  hidden: boolean
  timeCost: number
  leakageRate: number
  componentWear: Record<string, number>
  ropeWear: number
  bucketWear: number
  notes?: string
  createdAt: number
  ropeId: string | null
  bucketId: string | null
  abnormalType: AbnormalType
  abnormalReason: string
  reviewStatus: ReviewStatus
  reviewer?: string
  reviewComment?: string
  reviewedAt?: number
  environmentConditions?: EnvironmentConditions
  humanOperation?: HumanOperationRecord
}

export interface RecoveryScheme {
  id: string
  name: string
  description?: string
  wellConfig: WellConfig | null
  components: ComponentConfig[]
  ropes: RopeConfig[]
  buckets: BucketConfig[]
  totalRounds: number
  completedRounds: number
  trials: TrialRound[]
  assemblyComplete: boolean
  createdAt: number
  updatedAt: number
  templateId?: string
  abnormalRules: AbnormalRuleConfig
}

export interface SchemeImportResult {
  success: boolean
  schemes: RecoveryScheme[]
  error?: string
}

export interface TrialTemplate {
  id: string
  name: string
  description?: string
  wellConfig: WellConfig | null
  components: Omit<ComponentConfig, 'id'>[]
  ropes: Omit<RopeConfig, 'id'>[]
  buckets: Omit<BucketConfig, 'id'>[]
  totalRounds: number
  abnormalRules: AbnormalRuleConfig
  tag?: string
  createdAt: number
  updatedAt: number
  usageCount: number
}

export interface TemplateFilterCriteria {
  wellType?: WellType
  componentType?: ComponentType
  ropeMaterial?: RopeMaterial
  bucketMaterial?: BucketMaterial
  tag?: string
}

export interface TemplateImportResult {
  success: boolean
  templates: TrialTemplate[]
  error?: string
}

export interface TraceableTrialDetail {
  schemeId: string
  schemeName: string
  templateId: string | undefined
  templateName: string | undefined
  roundNo: number
  timeCost: number
  leakageRate: number
  effectiveWater: number
  efficiency: number
  ropeNo: string
  bucketNo: string
  ropeWear: number
  bucketWear: number
  avgComponentWear: number
  abnormalType: string
  abnormalTypeLabel: string
  abnormalReason: string
  reviewStatus: string
  reviewStatusLabel: string
  reviewer: string
  reviewComment: string
  createdAt: string
  reviewedAt: string
  ropeId: string | null
  bucketId: string | null
  componentWear: Record<string, number>
  weather?: string
  weatherLabel?: string
  temperature?: number
  humidity?: number
  windLevel?: string
  windLevelLabel?: string
  waterLevelFluctuation?: number
  operatorCount?: number
  operatorNames?: string
  operatorRoles?: string
  liftingPosture?: string
  liftingPostureLabel?: string
  midPauseCount?: number
  totalPauseDuration?: number
  hasMaintenance?: boolean
  maintenanceCount?: number
  operationNotes?: string
}
