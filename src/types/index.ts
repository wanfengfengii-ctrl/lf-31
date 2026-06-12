export type WellType = 'cylindrical' | 'square' | 'irregular'

export const WELL_TYPE_OPTIONS = [
  { label: '圆形井', value: 'cylindrical' },
  { label: '方形井', value: 'square' },
  { label: '不规则井', value: 'irregular' }
]

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
}

export interface SchemeImportResult {
  success: boolean
  schemes: RecoveryScheme[]
  error?: string
}
