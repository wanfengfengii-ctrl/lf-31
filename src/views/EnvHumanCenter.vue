<template>
  <div>
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 18px; font-weight: 600">🌤️ 环境与人力干预记录中心</span>
          <n-space>
            <n-button type="default" @click="handleExportCsv">
              📤 导出明细
            </n-button>
          </n-space>
        </div>
      </template>

      <n-collapse v-model:expanded-names="filterExpandedNames">
        <n-collapse-item title="筛选条件" name="filter">
          <n-grid :cols="4" :x-gap="12" :y-gap="12">
            <n-form-item label="试验方案">
              <n-select
                v-model:value="filterCriteria.schemeIds"
                :options="schemeOptions"
                multiple
                clearable
                placeholder="选择方案"
              />
            </n-form-item>
            <n-form-item label="轮次范围">
              <n-input-number
                v-model:value="filterRoundMin"
                :min="1"
                placeholder="最小轮次"
                style="width: 48%"
              />
              <span style="margin: 0 8px">~</span>
              <n-input-number
                v-model:value="filterRoundMax"
                :min="1"
                placeholder="最大轮次"
                style="width: 48%"
              />
            </n-form-item>
            <n-form-item label="天气">
              <n-select
                v-model:value="filterCriteria.weather"
                :options="WEATHER_OPTIONS"
                multiple
                clearable
                placeholder="选择天气"
              />
            </n-form-item>
            <n-form-item label="风力等级">
              <n-select
                v-model:value="filterCriteria.windLevel"
                :options="WIND_LEVEL_OPTIONS"
                multiple
                clearable
                placeholder="选择风力"
              />
            </n-form-item>
            <n-form-item label="气温范围 (℃)">
              <n-input-number
                v-model:value="filterTempMin"
                placeholder="最低"
                style="width: 48%"
              />
              <span style="margin: 0 8px">~</span>
              <n-input-number
                v-model:value="filterTempMax"
                placeholder="最高"
                style="width: 48%"
              />
            </n-form-item>
            <n-form-item label="湿度范围 (%)">
              <n-input-number
                v-model:value="filterHumidityMin"
                :min="0"
                :max="100"
                placeholder="最低"
                style="width: 48%"
              />
              <span style="margin: 0 8px">~</span>
              <n-input-number
                v-model:value="filterHumidityMax"
                :min="0"
                :max="100"
                placeholder="最高"
                style="width: 48%"
              />
            </n-form-item>
            <n-form-item label="井水位波动 (cm)">
              <n-input-number
                v-model:value="filterWaterMin"
                placeholder="最小"
                style="width: 48%"
              />
              <span style="margin: 0 8px">~</span>
              <n-input-number
                v-model:value="filterWaterMax"
                placeholder="最大"
                style="width: 48%"
              />
            </n-form-item>
            <n-form-item label="提水姿态">
              <n-select
                v-model:value="filterCriteria.liftingPostures"
                :options="LIFTING_POSTURE_OPTIONS"
                multiple
                clearable
                placeholder="选择姿态"
              />
            </n-form-item>
            <n-form-item label="操作者身份">
              <n-select
                v-model:value="filterCriteria.operatorRoles"
                :options="OPERATOR_ROLE_OPTIONS"
                multiple
                clearable
                placeholder="选择身份"
              />
            </n-form-item>
            <n-form-item label="具体人员">
              <n-select
                v-model:value="filterCriteria.operatorNames"
                :options="operatorNameOptions"
                multiple
                clearable
                filterable
                placeholder="选择人员姓名"
              />
            </n-form-item>
            <n-form-item label="操作人数">
              <n-input-number
                v-model:value="filterOpCountMin"
                :min="1"
                placeholder="最少"
                style="width: 48%"
              />
              <span style="margin: 0 8px">~</span>
              <n-input-number
                v-model:value="filterOpCountMax"
                :min="1"
                placeholder="最多"
                style="width: 48%"
              />
            </n-form-item>
            <n-form-item label="维护干预">
              <n-select
                v-model:value="filterCriteria.hasMaintenance"
                :options="[
                  { label: '有维护', value: true },
                  { label: '无维护', value: false }
                ]"
                clearable
                placeholder="选择"
              />
            </n-form-item>
            <n-form-item label="异常类型">
              <n-select
                v-model:value="filterCriteria.abnormalTypes"
                :options="[
                  { label: '超时异常', value: 'timeout' },
                  { label: '漏水过高', value: 'highLeakage' },
                  { label: '磨损突增', value: 'wearSpike' },
                  { label: '正常', value: 'none' }
                ]"
                multiple
                clearable
                placeholder="选择异常类型"
              />
            </n-form-item>
          </n-grid>
          <n-space style="margin-top: 12px">
            <n-button type="primary" @click="applyFilter">应用筛选</n-button>
            <n-button @click="resetFilter">重置</n-button>
          </n-space>
        </n-collapse-item>
      </n-collapse>

      <n-space :size="24" style="flex-wrap: wrap; margin-top: 16px">
        <n-statistic label="记录总数" :value="stats.totalTrials" />
        <n-statistic label="有效记录" :value="stats.approvedTrials" />
        <n-statistic
          label="平均提水耗时 (秒)"
          :value="Number(stats.avgTimeCost.toFixed(2))"
        />
        <n-statistic
          label="平均漏水率 (%)"
          :value="Number(stats.avgLeakageRate.toFixed(2))"
          value-style="color: #f0a020"
        />
        <n-statistic
          label="平均效率 (L/s)"
          :value="Number(stats.avgEfficiency.toFixed(3))"
          value-style="color: #18a058"
        />
        <n-statistic
          label="异常率"
          :value="Number(stats.abnormalRate.toFixed(1))"
          suffix="%"
          value-style="color: #d03050"
        />
        <n-statistic
          label="平均井绳磨损"
          :value="Number(stats.avgRopeWear.toFixed(2))"
        />
        <n-statistic
          label="平均汲桶磨损"
          :value="Number(stats.avgBucketWear.toFixed(2))"
        />
      </n-space>
    </n-card>

    <n-card style="margin-bottom: 16px">
      <template #header>
        <span style="font-size: 16px; font-weight: 600">📊 数据分析</span>
      </template>

      <n-tabs type="line" animated v-model:value="analysisTab">
        <n-tab-pane name="trend" tab="📈 趋势分析">
          <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
            <n-gi>
              <n-card title="提水效率 & 温湿度趋势" size="small">
                <v-chart class="chart" :option="efficiencyTrendOption" autoresize />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="提水耗时 & 漏水率趋势" size="small">
                <v-chart class="chart" :option="timeLeakageTrendOption" autoresize />
              </n-card>
            </n-gi>
            <n-gi :span="2">
              <n-card title="构件磨损累计趋势" size="small">
                <v-chart class="chart" :option="wearTrendOption" autoresize />
              </n-card>
            </n-gi>
          </n-grid>
        </n-tab-pane>

        <n-tab-pane name="cross" tab="📋 交叉统计分析">
          <n-space vertical :size="12" style="width: 100%">
            <div>
              <span style="font-weight: 500; margin-right: 12px">分析维度：</span>
              <n-radio-group v-model:value="crossDimension">
                <n-radio value="weather">按天气</n-radio>
                <n-radio value="windLevel">按风力</n-radio>
                <n-radio value="liftingPosture">按提水姿态</n-radio>
                <n-radio value="operatorCount">按操作人数</n-radio>
                <n-radio value="operatorRole">按操作者身份</n-radio>
              </n-radio-group>
            </div>

            <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
              <n-gi>
                <n-card title="不同维度效率对比 (L/s)" size="small">
                  <v-chart class="chart" :option="crossEfficiencyOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi>
                <n-card title="不同维度异常率对比 (%)" size="small">
                  <v-chart class="chart" :option="crossAbnormalOption" autoresize />
                </n-card>
              </n-gi>
              <n-gi :span="2">
                <n-card title="交叉统计汇总表" size="small">
                  <n-data-table
                    :columns="crossTableColumns"
                    :data="crossTableData"
                    :pagination="false"
                    size="small"
                    bordered
                  />
                </n-card>
              </n-gi>
            </n-grid>
          </n-space>
        </n-tab-pane>

        <n-tab-pane name="correlation" tab="🔗 环境因素关联">
          <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
            <n-gi>
              <n-card title="气温 vs 提水效率" size="small">
                <v-chart class="chart" :option="tempEfficiencyScatter" autoresize />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="湿度 vs 漏水率" size="small">
                <v-chart class="chart" :option="humidityLeakageScatter" autoresize />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="风力 vs 提水耗时" size="small">
                <v-chart class="chart" :option="windTimeBoxOption" autoresize />
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="操作人数 vs 效率分布" size="small">
                <v-chart class="chart" :option="operatorCountOption" autoresize />
              </n-card>
            </n-gi>
          </n-grid>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>环境与人力干预记录列表</span>
          <n-tag type="info">共 {{ filteredData.length }} 条记录</n-tag>
        </div>
      </template>

      <n-alert v-if="filteredData.length === 0" type="info" :show-icon="true">
        暂无符合条件的记录，请调整筛选条件或前往试验记录页面录入环境与人力信息。
      </n-alert>

      <n-data-table
        v-else
        :columns="columns"
        :data="tableData"
        :row-key="(row: any) => `${row.schemeId}-${row.roundNo}`"
        :pagination="{ pageSize: 10 }"
        size="small"
      />
    </n-card>

    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="记录详情"
      style="width: 720px"
    >
      <div v-if="currentRecord" style="max-height: 70vh; overflow-y: auto">
        <n-descriptions bordered :column="2" size="small">
          <n-descriptions-item label="方案名称">
            {{ currentRecord.schemeName }}
          </n-descriptions-item>
          <n-descriptions-item label="轮次">
            第 {{ currentRecord.roundNo }} 轮
          </n-descriptions-item>
          <n-descriptions-item label="记录时间">
            {{ formatDate(currentRecord.createdAt) }}
          </n-descriptions-item>
          <n-descriptions-item label="审查状态">
            <n-tag :type="getReviewStatusType(currentRecord.reviewStatus)">
              {{ REVIEW_STATUS_LABELS[currentRecord.reviewStatus] }}
            </n-tag>
          </n-descriptions-item>
        </n-descriptions>

        <n-divider style="margin: 16px 0">🌤️ 环境条件</n-divider>
        <n-descriptions bordered :column="2" size="small">
          <n-descriptions-item label="天气">
            {{ getWeatherLabel(currentRecord.weather) }}
          </n-descriptions-item>
          <n-descriptions-item label="气温">
            {{ currentRecord.temperature !== undefined ? currentRecord.temperature + ' ℃' : '-' }}
          </n-descriptions-item>
          <n-descriptions-item label="湿度">
            {{ currentRecord.humidity !== undefined ? currentRecord.humidity + ' %' : '-' }}
          </n-descriptions-item>
          <n-descriptions-item label="风力等级">
            {{ getWindLevelLabel(currentRecord.windLevel) }}
          </n-descriptions-item>
          <n-descriptions-item label="井水位波动" :span="2">
            {{ currentRecord.waterLevelFluctuation !== undefined ? currentRecord.waterLevelFluctuation + ' cm' : '-' }}
          </n-descriptions-item>
        </n-descriptions>

        <n-divider style="margin: 16px 0">👤 人力操作</n-divider>
        <n-descriptions bordered :column="2" size="small">
          <n-descriptions-item label="操作人数">
            {{ currentRecord.operatorCount || '-' }}
          </n-descriptions-item>
          <n-descriptions-item label="提水姿态">
            {{ getPostureLabel(currentRecord.liftingPosture) }}
          </n-descriptions-item>
          <n-descriptions-item label="中途停顿次数">
            {{ currentRecord.midPauseCount ?? '-' }}
          </n-descriptions-item>
          <n-descriptions-item label="累计停顿时长">
            {{ currentRecord.totalPauseDuration !== undefined ? currentRecord.totalPauseDuration + ' 秒' : '-' }}
          </n-descriptions-item>
        </n-descriptions>

        <n-divider style="margin: 12px 0">操作者信息</n-divider>
        <n-data-table
          v-if="operators.length > 0"
          :columns="operatorColumns"
          :data="operators"
          :pagination="false"
          size="small"
        />
        <n-empty v-else description="暂无操作者信息" />

        <n-divider style="margin: 16px 0">🔧 维护干预</n-divider>
        <n-data-table
          v-if="maintenanceList.length > 0"
          :columns="maintenanceColumns"
          :data="maintenanceList"
          :pagination="false"
          size="small"
        />
        <n-empty v-else description="无维护干预记录" />

        <n-divider style="margin: 16px 0">📊 试验结果</n-divider>
        <n-descriptions bordered :column="2" size="small">
          <n-descriptions-item label="提水耗时">
            {{ currentRecord.timeCost }} 秒
          </n-descriptions-item>
          <n-descriptions-item label="漏水率">
            {{ currentRecord.leakageRate }} %
          </n-descriptions-item>
          <n-descriptions-item label="井绳磨损">
            {{ currentRecord.ropeWear }}
          </n-descriptions-item>
          <n-descriptions-item label="汲桶磨损">
            {{ currentRecord.bucketWear }}
          </n-descriptions-item>
          <n-descriptions-item label="异常类型">
            <n-tag :type="currentRecord.abnormalType === 'none' ? 'success' : 'error'">
              {{ ABNORMAL_TYPE_LABELS[currentRecord.abnormalType] }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="异常原因">
            {{ currentRecord.abnormalReason || '-' }}
          </n-descriptions-item>
        </n-descriptions>

        <n-divider v-if="currentRecord.operationNotes" style="margin: 16px 0">📝 操作备注</n-divider>
        <n-alert v-if="currentRecord.operationNotes" type="info">
          {{ currentRecord.operationNotes }}
        </n-alert>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showDetailModal = false">关闭</n-button>
          <n-button type="primary" @click="handleEdit">编辑环境与人力信息</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑环境与人力干预信息"
      style="width: 720px"
    >
      <div v-if="currentRecord" style="max-height: 65vh; overflow-y: auto">
        <n-form
          ref="editFormRef"
          :model="editForm"
          label-placement="left"
          label-width="120px"
        >
          <n-divider style="margin: 8px 0">🌤️ 环境条件</n-divider>
          <n-grid :cols="2" :x-gap="12">
            <n-form-item label="天气">
              <n-select
                v-model:value="editForm.environmentConditions.weather"
                :options="WEATHER_OPTIONS"
                clearable
                placeholder="请选择天气"
              />
            </n-form-item>
            <n-form-item label="风力等级">
              <n-select
                v-model:value="editForm.environmentConditions.windLevel"
                :options="WIND_LEVEL_OPTIONS"
                clearable
                placeholder="请选择风力"
              />
            </n-form-item>
            <n-form-item label="气温 (℃)">
              <n-input-number
                v-model:value="editForm.environmentConditions.temperature"
                :min="-50"
                :max="60"
                :step="0.1"
                style="width: 100%"
                placeholder="请输入气温"
              />
            </n-form-item>
            <n-form-item label="湿度 (%)">
              <n-input-number
                v-model:value="editForm.environmentConditions.humidity"
                :min="0"
                :max="100"
                :step="0.1"
                style="width: 100%"
                placeholder="请输入湿度"
              />
            </n-form-item>
          </n-grid>
          <n-form-item label="井水位波动 (cm)">
            <n-input-number
              v-model:value="editForm.environmentConditions.waterLevelFluctuation"
              :step="0.1"
              style="width: 50%"
              placeholder="请输入井水位波动值"
            />
          </n-form-item>

          <n-divider style="margin: 16px 0">👤 人力操作</n-divider>
          <n-grid :cols="2" :x-gap="12">
            <n-form-item label="操作人数">
              <n-input-number
                v-model:value="editForm.humanOperation.operatorCount"
                :min="1"
                :max="20"
                style="width: 100%"
                placeholder="请输入操作人数"
              />
            </n-form-item>
            <n-form-item label="提水姿态">
              <n-select
                v-model:value="editForm.humanOperation.liftingPosture"
                :options="LIFTING_POSTURE_OPTIONS"
                clearable
                placeholder="请选择提水姿态"
              />
            </n-form-item>
            <n-form-item label="中途停顿次数">
              <n-input-number
                v-model:value="editForm.humanOperation.midPauseCount"
                :min="0"
                style="width: 100%"
                placeholder="请输入停顿次数"
              />
            </n-form-item>
            <n-form-item label="累计停顿时长 (秒)">
              <n-input-number
                v-model:value="editForm.humanOperation.totalPauseDuration"
                :min="0"
                style="width: 100%"
                placeholder="请输入累计停顿时长"
              />
            </n-form-item>
          </n-grid>

          <n-divider style="margin: 16px 0">操作者列表</n-divider>
          <n-space vertical style="width: 100%; margin-bottom: 12px">
            <div
              v-for="(op, index) in editForm.humanOperation.operators"
              :key="index"
              style="display: flex; gap: 8px; align-items: flex-end"
            >
              <n-input
                v-model:value="op.name"
                placeholder="姓名"
                style="flex: 1"
              />
              <n-select
                v-model:value="op.role"
                :options="OPERATOR_ROLE_OPTIONS"
                placeholder="身份"
                style="width: 140px"
              />
              <n-input-number
                v-model:value="op.yearsOfExperience"
                placeholder="经验(年)"
                :min="0"
                style="width: 100px"
              />
              <n-button
                text
                type="error"
                @click="removeOperator(index)"
              >
                删除
              </n-button>
            </div>
          </n-space>
          <n-button type="default" size="small" @click="addOperator">
            + 添加操作者
          </n-button>

          <n-divider style="margin: 16px 0">🔧 维护干预记录</n-divider>
          <n-space vertical style="width: 100%; margin-bottom: 12px">
            <div
              v-for="(m, index) in editForm.humanOperation.maintenanceInterventions"
              :key="index"
              style="border: 1px solid #e0e0e0; padding: 12px; border-radius: 6px"
            >
              <n-grid :cols="2" :x-gap="12">
                <n-form-item label="维护类型">
                  <n-select
                    v-model:value="m.type"
                    :options="[
                      { label: '润滑', value: 'lubrication' },
                      { label: '调整', value: 'adjustment' },
                      { label: '修理', value: 'repair' },
                      { label: '更换', value: 'replacement' },
                      { label: '清洁', value: 'cleaning' }
                    ]"
                    placeholder="选择类型"
                  />
                </n-form-item>
                <n-form-item label="目标构件">
                  <n-input
                    v-model:value="m.targetComponent"
                    placeholder="如：中轴、支架"
                  />
                </n-form-item>
                <n-form-item label="维护时长 (分钟)">
                  <n-input-number
                    v-model:value="m.duration"
                    :min="0"
                    style="width: 100%"
                    placeholder="请输入时长"
                  />
                </n-form-item>
              </n-grid>
              <n-form-item label="维护描述">
                <n-input
                  v-model:value="m.description"
                  type="textarea"
                  :rows="2"
                  placeholder="请描述维护内容"
                />
              </n-form-item>
              <div style="text-align: right">
                <n-button text type="error" size="small" @click="removeMaintenance(index)">
                  删除此条维护记录
                </n-button>
              </div>
            </div>
          </n-space>
          <n-button type="default" size="small" @click="addMaintenance">
            + 添加维护记录
          </n-button>

          <n-divider style="margin: 16px 0">📝 操作备注</n-divider>
          <n-form-item label="操作备注">
            <n-input
              v-model:value="editForm.humanOperation.operationNotes"
              type="textarea"
              :rows="3"
              placeholder="请输入操作备注信息"
            />
          </n-form-item>
        </n-form>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="saveEdit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, h } from 'vue'
import { useMessage } from 'naive-ui'
import { useSchemeStore } from '@/stores/scheme'
import {
  WEATHER_OPTIONS,
  WIND_LEVEL_OPTIONS,
  OPERATOR_ROLE_OPTIONS,
  LIFTING_POSTURE_OPTIONS,
  ABNORMAL_TYPE_LABELS,
  REVIEW_STATUS_LABELS
} from '@/types'
import type {
  EnvHumanFilterCriteria,
  EnvironmentConditions,
  HumanOperationRecord,
  OperatorInfo,
  MaintenanceIntervention,
  ReviewStatus,
  WeatherType,
  WindLevel,
  LiftingPosture,
  OperatorRole
} from '@/types'

const message = useMessage()
const store = useSchemeStore()

const filterExpandedNames = ref<string[]>([])
const analysisTab = ref('trend')
const crossDimension = ref<'weather' | 'windLevel' | 'liftingPosture' | 'operatorRole' | 'operatorCount'>('weather')

const filterCriteria = reactive<EnvHumanFilterCriteria>({
  schemeIds: [],
  weather: [],
  windLevel: [],
  operatorRoles: [],
  operatorNames: [],
  liftingPostures: [],
  abnormalTypes: []
})

const filterRoundMin = ref<number | null>(null)
const filterRoundMax = ref<number | null>(null)
const filterTempMin = ref<number | null>(null)
const filterTempMax = ref<number | null>(null)
const filterHumidityMin = ref<number | null>(null)
const filterHumidityMax = ref<number | null>(null)
const filterWaterMin = ref<number | null>(null)
const filterWaterMax = ref<number | null>(null)
const filterOpCountMin = ref<number | null>(null)
const filterOpCountMax = ref<number | null>(null)

const showDetailModal = ref(false)
const showEditModal = ref(false)
const currentRecord = ref<any>(null)

const editForm = reactive<{
  environmentConditions: EnvironmentConditions
  humanOperation: HumanOperationRecord
}>({
  environmentConditions: {
    weather: 'sunny',
    temperature: 0,
    humidity: 0,
    windLevel: 'calm',
    waterLevelFluctuation: 0
  },
  humanOperation: {
    operatorCount: 1,
    operators: [],
    liftingPosture: 'standing_two_hand',
    midPauseCount: 0,
    totalPauseDuration: 0,
    maintenanceInterventions: [],
    operationNotes: ''
  }
})

const schemeOptions = computed(() => {
  return store.schemeList.map(s => ({
    label: s.name,
    value: s.id
  }))
})

const operatorNameOptions = computed(() => {
  const all = store.getDistinctOperators()
  return all.map(op => ({
    label: `${op.name}（${OPERATOR_ROLE_OPTIONS.find(r => r.value === op.role)?.label || op.role}）`,
    value: op.name
  }))
})

const appliedCriteria = computed(() => {
  const criteria: EnvHumanFilterCriteria = { ...filterCriteria }
  
  if (filterRoundMin.value !== null && filterRoundMax.value !== null) {
    const roundNos: number[] = []
    for (let i = filterRoundMin.value; i <= filterRoundMax.value; i++) {
      roundNos.push(i)
    }
    criteria.roundNos = roundNos
  }
  
  if (filterTempMin.value !== null && filterTempMax.value !== null) {
    criteria.temperatureRange = [filterTempMin.value, filterTempMax.value]
  }
  
  if (filterHumidityMin.value !== null && filterHumidityMax.value !== null) {
    criteria.humidityRange = [filterHumidityMin.value, filterHumidityMax.value]
  }
  
  if (filterWaterMin.value !== null && filterWaterMax.value !== null) {
    criteria.waterLevelFluctuationRange = [filterWaterMin.value, filterWaterMax.value]
  }
  
  if (filterOpCountMin.value !== null && filterOpCountMax.value !== null) {
    criteria.operatorCountRange = [filterOpCountMin.value, filterOpCountMax.value]
  }
  
  return criteria
})

const filteredData = computed(() => {
  return store.filterEnvHumanTrials(appliedCriteria.value)
})

const tableData = computed(() => {
  return filteredData.value.map(({ scheme, trial }) => {
    const env = trial.environmentConditions
    const human = trial.humanOperation
    const bucket = scheme.buckets[0]
    const effectiveWater = bucket ? bucket.capacity * (1 - trial.leakageRate / 100) : 0
    const efficiency = trial.timeCost > 0 ? effectiveWater / trial.timeCost : 0
    
    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      roundNo: trial.roundNo,
      weather: env?.weather,
      temperature: env?.temperature,
      humidity: env?.humidity,
      windLevel: env?.windLevel,
      waterLevelFluctuation: env?.waterLevelFluctuation,
      operatorCount: human?.operatorCount,
      operatorNames: human?.operators?.map(o => o.name).join('、') || '-',
      liftingPosture: human?.liftingPosture,
      hasMaintenance: (human?.maintenanceInterventions?.length || 0) > 0,
      timeCost: trial.timeCost,
      leakageRate: trial.leakageRate,
      efficiency: Number(efficiency.toFixed(3)),
      ropeWear: trial.ropeWear,
      bucketWear: trial.bucketWear,
      abnormalType: trial.abnormalType,
      reviewStatus: trial.reviewStatus,
      createdAt: trial.createdAt,
      midPauseCount: human?.midPauseCount,
      totalPauseDuration: human?.totalPauseDuration,
      operationNotes: human?.operationNotes,
      operators: human?.operators || [],
      maintenanceInterventions: human?.maintenanceInterventions || [],
      abnormalReason: trial.abnormalReason
    }
  })
})

const stats = computed(() => {
  return store.getEnvHumanStats(appliedCriteria.value)
})

const operators = computed(() => {
  return currentRecord.value?.operators || []
})

const maintenanceList = computed(() => {
  return currentRecord.value?.maintenanceInterventions || []
})

const trendData = computed(() => {
  return store.getEnvHumanTrendData(appliedCriteria.value)
})

const crossStats = computed(() => {
  return store.getEnvHumanCrossStats(appliedCriteria.value, crossDimension.value)
})

const palette = ['#18a058', '#2080f0', '#f0a020', '#d03050', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

const efficiencyTrendOption = computed(() => {
  const data = trendData.value
  if (data.labels.length === 0) return {}
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['提水效率(L/s)', '气温(℃)', '湿度(%)'] },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: data.labels, axisLabel: { rotate: 30, interval: 0 } },
    yAxis: [
      { type: 'value', name: 'L/s', position: 'left' },
      { type: 'value', name: '℃/%', position: 'right' }
    ],
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    series: [
      {
        name: '提水效率(L/s)',
        type: 'line',
        smooth: true,
        data: data.efficiency,
        itemStyle: { color: '#18a058' },
        areaStyle: { opacity: 0.15 },
        yAxisIndex: 0
      },
      {
        name: '气温(℃)',
        type: 'line',
        smooth: true,
        data: data.temperature,
        itemStyle: { color: '#f0a020' },
        yAxisIndex: 1
      },
      {
        name: '湿度(%)',
        type: 'line',
        smooth: true,
        data: data.humidity,
        itemStyle: { color: '#2080f0' },
        yAxisIndex: 1
      }
    ]
  }
})

const timeLeakageTrendOption = computed(() => {
  const data = trendData.value
  if (data.labels.length === 0) return {}
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['提水耗时(s)', '漏水率(%)'] },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: data.labels, axisLabel: { rotate: 30, interval: 0 } },
    yAxis: [
      { type: 'value', name: '秒', position: 'left' },
      { type: 'value', name: '%', position: 'right', max: 100 }
    ],
    dataZoom: [{ type: 'inside', start: 0, end: 100 }],
    series: [
      {
        name: '提水耗时(s)',
        type: 'bar',
        data: data.timeCost,
        itemStyle: { color: '#2080f0' },
        yAxisIndex: 0,
        barMaxWidth: 30
      },
      {
        name: '漏水率(%)',
        type: 'line',
        smooth: true,
        data: data.leakageRate,
        itemStyle: { color: '#d03050' },
        yAxisIndex: 1
      }
    ]
  }
})

const wearTrendOption = computed(() => {
  const data = trendData.value
  if (data.labels.length === 0) return {}
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['井绳磨损', '汲桶磨损'] },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: data.labels, axisLabel: { rotate: 30, interval: 0 } },
    yAxis: { type: 'value', name: '磨损等级' },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 }
    ],
    series: [
      {
        name: '井绳磨损',
        type: 'line',
        smooth: true,
        data: data.ropeWear,
        itemStyle: { color: '#f0a020' },
        areaStyle: { opacity: 0.2 }
      },
      {
        name: '汲桶磨损',
        type: 'line',
        smooth: true,
        data: data.bucketWear,
        itemStyle: { color: '#d03050' },
        areaStyle: { opacity: 0.2 }
      }
    ]
  }
})

const crossEfficiencyOption = computed(() => {
  const data = crossStats.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map(d => d.label), axisLabel: { rotate: 30, interval: 0 } },
    yAxis: { type: 'value', name: 'L/s' },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({
        value: Number(d.avgEfficiency.toFixed(3)),
        itemStyle: { color: palette[i % palette.length] }
      })),
      label: { show: true, position: 'top', formatter: '{c}' },
      barMaxWidth: 50
    }]
  }
})

const crossAbnormalOption = computed(() => {
  const data = crossStats.value
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: data.map(d => d.label), axisLabel: { rotate: 30, interval: 0 } },
    yAxis: { type: 'value', name: '%', max: 100 },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({
        value: Number(d.abnormalRate.toFixed(1)),
        itemStyle: { color: d.abnormalRate > 30 ? '#d03050' : palette[i % palette.length] }
      })),
      label: { show: true, position: 'top', formatter: '{c}%' },
      markLine: {
        data: [{ yAxis: 20, name: '警戒线20%', lineStyle: { color: '#d03050', type: 'dashed' } }]
      },
      barMaxWidth: 50
    }]
  }
})

const crossTableColumns = [
  { title: '维度', key: 'label', width: 140 },
  { title: '记录数', key: 'count', width: 80 },
  { title: '平均耗时(s)', key: 'avgTimeCost', width: 110, render: (row: any) => row.avgTimeCost.toFixed(2) },
  { title: '平均漏水率(%)', key: 'avgLeakageRate', width: 120, render: (row: any) => row.avgLeakageRate.toFixed(2) },
  { title: '平均效率(L/s)', key: 'avgEfficiency', width: 130, render: (row: any) => row.avgEfficiency.toFixed(3) },
  { title: '井绳磨损', key: 'avgRopeWear', width: 90, render: (row: any) => row.avgRopeWear.toFixed(2) },
  { title: '汲桶磨损', key: 'avgBucketWear', width: 90, render: (row: any) => row.avgBucketWear.toFixed(2) },
  { title: '异常率(%)', key: 'abnormalRate', width: 100, render: (row: any) => row.abnormalRate.toFixed(1) }
]

const crossTableData = computed(() => {
  return crossStats.value
})

const tempEfficiencyScatter = computed(() => {
  const data = filteredData.value
    .filter(r => r.trial.reviewStatus === 'approved')
    .map(({ scheme, trial }) => {
      const bucket = scheme.buckets[0]
      const eff = bucket && trial.timeCost > 0
        ? (bucket.capacity * (1 - trial.leakageRate / 100)) / trial.timeCost
        : 0
      return [trial.environmentConditions?.temperature ?? 0, Number(eff.toFixed(3))]
    })
  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `气温: ${p.value[0]}℃\n效率: ${p.value[1]} L/s` },
    grid: { left: '10%', right: '10%', bottom: '10%', containLabel: true },
    xAxis: { type: 'value', name: '气温(℃)', splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'value', name: '效率(L/s)', splitLine: { lineStyle: { type: 'dashed' } } },
    series: [{
      type: 'scatter',
      symbolSize: 12,
      data,
      itemStyle: { color: '#18a058', opacity: 0.7 },
      markLine: {
        data: [{ type: 'average', name: '平均' }]
      }
    }]
  }
})

const humidityLeakageScatter = computed(() => {
  const data = filteredData.value
    .filter(r => r.trial.reviewStatus === 'approved')
    .map(({ trial }) => [
      trial.environmentConditions?.humidity ?? 0,
      trial.leakageRate
    ])
  return {
    tooltip: { trigger: 'item', formatter: (p: any) => `湿度: ${p.value[0]}%\n漏水率: ${p.value[1]}%` },
    grid: { left: '10%', right: '10%', bottom: '10%', containLabel: true },
    xAxis: { type: 'value', name: '湿度(%)', max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
    yAxis: { type: 'value', name: '漏水率(%)', max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
    series: [{
      type: 'scatter',
      symbolSize: 12,
      data,
      itemStyle: { color: '#d03050', opacity: 0.7 },
      markLine: {
        data: [{ type: 'average', name: '平均' }]
      }
    }]
  }
})

const windTimeBoxOption = computed(() => {
  const groups: Record<string, number[]> = {}
  filteredData.value
    .filter(r => r.trial.reviewStatus === 'approved')
    .forEach(({ trial }) => {
      const key = trial.environmentConditions?.windLevel || 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(trial.timeCost)
    })
  
  const labels: string[] = []
  const boxData: number[][] = []
  
  Object.entries(groups).forEach(([key, vals]) => {
    labels.push(WIND_LEVEL_OPTIONS.find(o => o.value === key)?.label || key)
    vals.sort((a, b) => a - b)
    const q1 = vals[Math.floor(vals.length * 0.25)] || vals[0]
    const median = vals[Math.floor(vals.length * 0.5)] || vals[0]
    const q3 = vals[Math.floor(vals.length * 0.75)] || vals[vals.length - 1]
    const min = vals[0]
    const max = vals[vals.length - 1]
    boxData.push([min, q1, median, q3, max])
  })
  
  return {
    tooltip: { trigger: 'item' },
    grid: { left: '10%', right: '10%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', name: '提水耗时(s)', splitArea: { show: true } },
    series: [{
      type: 'boxplot',
      data: boxData,
      itemStyle: { color: '#2080f0', borderColor: '#1060c0' }
    }]
  }
})

const operatorCountOption = computed(() => {
  const groups: Record<string, number[]> = {}
  filteredData.value
    .filter(r => r.trial.reviewStatus === 'approved')
    .forEach(({ scheme, trial }) => {
      const count = trial.humanOperation?.operatorCount ?? 0
      const key = String(count)
      if (!groups[key]) groups[key] = []
      const bucket = scheme.buckets[0]
      const eff = bucket && trial.timeCost > 0
        ? (bucket.capacity * (1 - trial.leakageRate / 100)) / trial.timeCost
        : 0
      groups[key].push(Number(eff.toFixed(3)))
    })
  
  const labels = Object.keys(groups).sort()
  const avgData = labels.map(k => {
    const vals = groups[k]
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3))
  })
  const maxData = labels.map(k => Math.max(...groups[k]))
  const minData = labels.map(k => Math.min(...groups[k]))
  
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['最高效率', '平均效率', '最低效率'] },
    grid: { left: '10%', right: '10%', bottom: '10%', containLabel: true },
    xAxis: { type: 'category', data: labels.map(l => l + '人'), name: '操作人数' },
    yAxis: { type: 'value', name: '效率(L/s)' },
    series: [
      {
        name: '最高效率',
        type: 'line',
        data: maxData,
        itemStyle: { color: '#18a058' },
        symbol: 'triangle'
      },
      {
        name: '平均效率',
        type: 'bar',
        data: avgData,
        itemStyle: { color: '#2080f0' },
        label: { show: true, position: 'top' },
        barMaxWidth: 40
      },
      {
        name: '最低效率',
        type: 'line',
        data: minData,
        itemStyle: { color: '#d03050' },
        symbol: 'rect'
      }
    ]
  }
})

const columns = [
  {
    title: '方案',
    key: 'schemeName',
    width: 120,
    ellipsis: { tooltip: true }
  },
  {
    title: '轮次',
    key: 'roundNo',
    width: 60,
    render: (row: any) => `第${row.roundNo}轮`
  },
  {
    title: '天气',
    key: 'weather',
    width: 80,
    render: (row: any) => getWeatherLabel(row.weather)
  },
  {
    title: '气温',
    key: 'temperature',
    width: 70,
    render: (row: any) => row.temperature !== undefined ? row.temperature + '℃' : '-'
  },
  {
    title: '湿度',
    key: 'humidity',
    width: 70,
    render: (row: any) => row.humidity !== undefined ? row.humidity + '%' : '-'
  },
  {
    title: '风力',
    key: 'windLevel',
    width: 90,
    render: (row: any) => getWindLevelLabel(row.windLevel)
  },
  {
    title: '操作人数',
    key: 'operatorCount',
    width: 80,
    render: (row: any) => row.operatorCount || '-'
  },
  {
    title: '提水姿态',
    key: 'liftingPosture',
    width: 100,
    render: (row: any) => getPostureLabel(row.liftingPosture)
  },
  {
    title: '提水耗时',
    key: 'timeCost',
    width: 80,
    render: (row: any) => row.timeCost + 's'
  },
  {
    title: '漏水率',
    key: 'leakageRate',
    width: 80,
    render: (row: any) => row.leakageRate + '%'
  },
  {
    title: '效率',
    key: 'efficiency',
    width: 80,
    render: (row: any) => row.efficiency + ' L/s'
  },
  {
    title: '异常',
    key: 'abnormalType',
    width: 80,
    render: (row: any) => {
      const type = row.abnormalType
      const color = type === 'none' ? 'success' : 'error'
      const label = ABNORMAL_TYPE_LABELS[type] || '-'
      return h('n-tag', { type: color, size: 'small' }, { default: () => label })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row: any) => {
      return h(
        'n-space',
        { size: 'small' },
        {
          default: () => [
            h(
              'n-button',
              {
                size: 'small',
                text: true,
                onClick: () => viewDetail(row)
              },
              { default: () => '详情' }
            ),
            h(
              'n-button',
              {
                size: 'small',
                text: true,
                type: 'primary',
                onClick: () => openEdit(row)
              },
              { default: () => '编辑' }
            )
          ]
        }
      )
    }
  }
]

const operatorColumns = [
  { title: '姓名', key: 'name' },
  {
    title: '身份',
    key: 'role',
    render: (row: any) => OPERATOR_ROLE_OPTIONS.find(o => o.value === row.role)?.label || row.role
  },
  {
    title: '经验年限',
    key: 'yearsOfExperience',
    render: (row: any) => row.yearsOfExperience ? row.yearsOfExperience + ' 年' : '-'
  }
]

const maintenanceColumns = [
  {
    title: '类型',
    key: 'type',
    render: (row: any) => {
      const map: Record<string, string> = {
        lubrication: '润滑',
        adjustment: '调整',
        repair: '修理',
        replacement: '更换',
        cleaning: '清洁'
      }
      return map[row.type] || row.type
    }
  },
  { title: '目标构件', key: 'targetComponent' },
  { title: '描述', key: 'description', ellipsis: { tooltip: true } },
  {
    title: '时长',
    key: 'duration',
    render: (row: any) => row.duration + ' 分钟'
  }
]

function getWeatherLabel(weather?: WeatherType): string {
  if (!weather) return '-'
  return WEATHER_OPTIONS.find(o => o.value === weather)?.label || weather
}

function getWindLevelLabel(windLevel?: WindLevel): string {
  if (!windLevel) return '-'
  return WIND_LEVEL_OPTIONS.find(o => o.value === windLevel)?.label || windLevel
}

function getPostureLabel(posture?: LiftingPosture): string {
  if (!posture) return '-'
  return LIFTING_POSTURE_OPTIONS.find(o => o.value === posture)?.label || posture
}

function getReviewStatusType(status: ReviewStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'rejected': return 'error'
    default: return 'default'
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN')
}

function viewDetail(row: any) {
  currentRecord.value = row
  showDetailModal.value = true
}

function openEdit(row: any) {
  currentRecord.value = row
  
  editForm.environmentConditions = {
    weather: row.weather || 'sunny',
    temperature: row.temperature ?? 20,
    humidity: row.humidity ?? 50,
    windLevel: row.windLevel || 'calm',
    waterLevelFluctuation: row.waterLevelFluctuation ?? 0
  }
  
  editForm.humanOperation = {
    operatorCount: row.operatorCount || 1,
    operators: row.operators ? row.operators.map((o: OperatorInfo) => ({ ...o })) : [],
    liftingPosture: row.liftingPosture || 'standing_two_hand',
    midPauseCount: row.midPauseCount ?? 0,
    totalPauseDuration: row.totalPauseDuration ?? 0,
    maintenanceInterventions: row.maintenanceInterventions 
      ? row.maintenanceInterventions.map((m: MaintenanceIntervention) => ({ ...m }))
      : [],
    operationNotes: row.operationNotes || ''
  }
  
  showEditModal.value = true
}

function handleEdit() {
  showDetailModal.value = false
  openEdit(currentRecord.value)
}

function addOperator() {
  editForm.humanOperation.operators.push({
    id: Date.now().toString(36),
    name: '',
    role: 'researcher',
    yearsOfExperience: 0
  })
}

function removeOperator(index: number) {
  editForm.humanOperation.operators.splice(index, 1)
}

function addMaintenance() {
  editForm.humanOperation.maintenanceInterventions.push({
    type: 'lubrication',
    targetComponent: '',
    description: '',
    duration: 0
  })
}

function removeMaintenance(index: number) {
  editForm.humanOperation.maintenanceInterventions.splice(index, 1)
}

function saveEdit() {
  if (!currentRecord.value) return
  
  const result = store.updateTrial(currentRecord.value.schemeId, currentRecord.value.roundNo, {
    environmentConditions: { ...editForm.environmentConditions },
    humanOperation: {
      ...editForm.humanOperation,
      operators: editForm.humanOperation.operators.filter((op: OperatorInfo) => op.name.trim())
    }
  })
  
  if (result.success) {
    message.success('保存成功')
    showEditModal.value = false
  } else {
    message.error(result.error || '保存失败')
  }
}

function applyFilter() {
  message.success('筛选条件已应用')
}

function resetFilter() {
  filterCriteria.schemeIds = []
  filterCriteria.weather = []
  filterCriteria.windLevel = []
  filterCriteria.operatorRoles = []
  filterCriteria.operatorNames = []
  filterCriteria.liftingPostures = []
  filterCriteria.hasMaintenance = undefined
  filterCriteria.abnormalTypes = []
  
  filterRoundMin.value = null
  filterRoundMax.value = null
  filterTempMin.value = null
  filterTempMax.value = null
  filterHumidityMin.value = null
  filterHumidityMax.value = null
  filterWaterMin.value = null
  filterWaterMax.value = null
  filterOpCountMin.value = null
  filterOpCountMax.value = null
  
  message.info('筛选条件已重置')
}

function handleExportCsv() {
  const csv = store.exportEnvHumanDetails(appliedCriteria.value)
  if (!csv || csv.split('\n').length <= 1) {
    message.warning('没有数据可导出')
    return
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `环境与人力干预记录_${new Date().toLocaleDateString('zh-CN')}.csv`
  link.click()
  URL.revokeObjectURL(url)
  
  message.success('导出成功')
}

onMounted(() => {
  if (store.schemes.length === 0) {
    const demoSchemeId = store.createScheme('演示方案 - 环境与人力')
    store.updateWellConfig(demoSchemeId, {
      type: 'cylindrical',
      depth: 8,
      diameter: 1.2,
      waterLevel: 5
    })
    store.addComponent(demoSchemeId, {
      componentNo: 'WL-001',
      type: 'wheel',
      material: '枣木',
      diameter: 40,
      wearResistance: 7
    })
    store.addComponent(demoSchemeId, {
      componentNo: 'SH-001',
      type: 'shaft',
      material: '榆木',
      diameter: 8,
      length: 120,
      wearResistance: 6
    })
    store.addRope(demoSchemeId, {
      ropeNo: 'R-001',
      material: 'hemp',
      diameter: 1.5,
      length: 12,
      breakingStrength: 500,
      wearResistance: 5
    })
    store.addBucket(demoSchemeId, {
      bucketNo: 'B-001',
      material: 'wood',
      capacity: 10,
      weight: 2,
      wearResistance: 6
    })
    
    const weatherTypes: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'windy']
    const windLevels: WindLevel[] = ['calm', 'light', 'moderate']
    const postures: LiftingPosture[] = ['standing_two_hand', 'standing_one_hand', 'sitting', 'teamwork']
    const roles: OperatorRole[] = ['researcher', 'assistant', 'volunteer', 'expert']
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八']
    
    for (let i = 0; i < 20; i++) {
      const weather = weatherTypes[i % weatherTypes.length]
      const wind = windLevels[i % windLevels.length]
      const posture = postures[i % postures.length]
      const opCount = (i % 3) + 1
      
      const operators: OperatorInfo[] = []
      for (let j = 0; j < opCount; j++) {
        operators.push({
          id: `op-${i}-${j}`,
          name: names[(i + j) % names.length],
          role: roles[(i + j) % roles.length],
          yearsOfExperience: (i + j) % 10
        })
      }
      
      const maintenanceList: MaintenanceIntervention[] = []
      if (i % 4 === 0) {
        maintenanceList.push({
          type: i % 2 === 0 ? 'lubrication' : 'adjustment',
          targetComponent: i % 2 === 0 ? '中轴' : '支架',
          description: i % 2 === 0 ? '对中轴进行润滑油加注' : '调整支架松紧度',
          duration: 5 + i
        })
      }
      
      const timeCost = 60 + Math.random() * 40 + (wind === 'moderate' ? 10 : 0) + (weather === 'rainy' ? 15 : 0)
      const leakageRate = 5 + Math.random() * 15 + (weather === 'windy' ? 5 : 0)
      
      store.addTrial(demoSchemeId, {
        hidden: false,
        timeCost: Number(timeCost.toFixed(1)),
        leakageRate: Number(leakageRate.toFixed(1)),
        componentWear: { '1': 1 + Math.random(), '2': 0.8 + Math.random() * 0.5 },
        ropeWear: 0.5 + Math.random(),
        bucketWear: 0.3 + Math.random() * 0.5,
        notes: `第${i + 1}轮试验`,
        ropeId: store.schemes.find(s => s.id === demoSchemeId)?.ropes[0]?.id || null,
        bucketId: store.schemes.find(s => s.id === demoSchemeId)?.buckets[0]?.id || null,
        abnormalType: 'none',
        abnormalReason: '',
        reviewStatus: 'approved',
        environmentConditions: {
          weather,
          temperature: 15 + Math.random() * 20,
          humidity: 40 + Math.random() * 40,
          windLevel: wind,
          waterLevelFluctuation: Number((Math.random() * 5).toFixed(1))
        },
        humanOperation: {
          operatorCount: opCount,
          operators,
          liftingPosture: posture,
          midPauseCount: i % 3,
          totalPauseDuration: (i % 3) * 10,
          maintenanceInterventions: maintenanceList,
          operationNotes: i % 5 === 0 ? '试验过程顺利，数据稳定。' : ''
        }
      })
    }
  }
})
</script>

<style scoped>
.chart {
  width: 100%;
  height: 300px;
}
</style>
