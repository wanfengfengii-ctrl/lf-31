<template>
  <div v-if="template">
    <n-card style="margin-bottom: 16px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div>
            <span style="font-size: 18px; font-weight: 600">模板配置 - {{ template.name }}</span>
            <n-tag v-if="template.tag" type="info" style="margin-left: 12px">
              {{ template.tag }}
            </n-tag>
          </div>
          <n-space>
            <n-button type="default" @click="showMetaModal = true">模板设置</n-button>
            <n-button
              type="primary"
              :disabled="!isComplete"
              @click="handleUseTemplate"
            >
              使用此模板创建方案
            </n-button>
          </n-space>
        </div>
      </template>

      <n-space vertical :size="16" style="width: 100%">
        <n-alert type="info" :show-icon="true">
          模板完整条件：<b>井型配置</b> + <b>至少1个辘轳构件</b> + <b>至少1条井绳</b> + <b>至少1个汲桶</b>
        </n-alert>

        <n-space :size="16" align="start" style="flex-wrap: wrap; width: 100%">
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ template.wellConfig ? '✅' : '❌' }} 井型
            </n-tag>
            <div v-if="template.wellConfig" style="margin-top: 8px; font-size: 13px; color: #666">
              {{ wellTypeLabel }} · 深度{{ template.wellConfig.depth }}m · 直径{{ template.wellConfig.diameter }}m
            </div>
          </div>
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ template.components.length > 0 ? '✅' : '❌' }} 辘轳构件 ({{ template.components.length }})
            </n-tag>
          </div>
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ template.ropes.length > 0 ? '✅' : '❌' }} 井绳 ({{ template.ropes.length }})
            </n-tag>
          </div>
          <div style="flex: 1; min-width: 240px">
            <n-tag type="success" size="large" round :bordered="false">
              {{ template.buckets.length > 0 ? '✅' : '❌' }} 汲桶 ({{ template.buckets.length }})
            </n-tag>
          </div>
        </n-space>
      </n-space>
    </n-card>

    <n-tabs type="line" animated>
      <n-tab-pane name="well" tab="🏗️ 井型配置">
        <n-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>井型参数</span>
              <n-button
                v-if="template.wellConfig"
                size="small"
                type="default"
                @click="resetWellForm"
              >
                重置
              </n-button>
            </div>
          </template>

          <n-form
            ref="wellFormRef"
            :model="wellForm"
            :rules="wellRules"
            label-placement="left"
            label-width="120px"
            style="max-width: 640px"
          >
            <n-form-item label="井型" path="type">
              <n-select v-model:value="wellForm.type" :options="WELL_TYPE_OPTIONS" placeholder="请选择井型" />
            </n-form-item>
            <n-form-item label="井深 (米)" path="depth">
              <n-input-number v-model:value="wellForm.depth" :min="0.1" :max="1000" :step="0.1" style="width: 100%" />
            </n-form-item>
            <n-form-item label="井口直径 (米)" path="diameter">
              <n-input-number v-model:value="wellForm.diameter" :min="0.1" :max="50" :step="0.1" style="width: 100%" />
            </n-form-item>
            <n-form-item label="水位深度 (米)" path="waterLevel">
              <n-input-number v-model:value="wellForm.waterLevel" :min="0" :max="1000" :step="0.1" style="width: 100%" />
              <span style="color: #999; font-size: 12px">地面到水面的距离</span>
            </n-form-item>
            <n-form-item label="井壁材质" path="wallMaterial">
              <n-select
                v-model:value="wellForm.wallMaterial"
                clearable
                :options="[
                  { label: '石砌', value: 'stone' },
                  { label: '砖砌', value: 'brick' },
                  { label: '陶圈', value: 'ceramic' },
                  { label: '土井', value: 'earth' },
                  { label: '木构', value: 'wood' }
                ]"
                placeholder="可选"
              />
            </n-form-item>
            <n-form-item>
              <n-space>
                <n-button type="primary" @click="saveWellConfig">保存井型配置</n-button>
                <n-button v-if="template.wellConfig" type="default" @click="clearWellConfig">清除配置</n-button>
              </n-space>
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="components" tab="⚙️ 辘轳构件">
        <n-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>辘轳构件列表 (编号不能重复)</span>
              <n-button type="primary" size="small" @click="openComponentAddModal">+ 添加构件</n-button>
            </div>
          </template>

          <n-alert v-if="template.components.length === 0" type="warning" :show-icon="true" style="margin-bottom: 16px">
            尚未添加构件，请至少添加 1 个构件（轮盘、轴、支架或曲柄）
          </n-alert>

          <n-data-table
            v-else
            :columns="componentColumns"
            :data="template.components"
            :row-key="(row: any, index: number) => index"
            :pagination="false"
            size="small"
          />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="ropes" tab="🪢 井绳配置">
        <n-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>井绳列表 (编号不能重复)</span>
              <n-button type="primary" size="small" @click="openRopeAddModal">+ 添加井绳</n-button>
            </div>
          </template>

          <n-alert v-if="template.ropes.length === 0" type="warning" :show-icon="true" style="margin-bottom: 16px">
            尚未添加井绳，请至少添加 1 条井绳
          </n-alert>

          <n-data-table
            v-else
            :columns="ropeColumns"
            :data="template.ropes"
            :row-key="(row: any, index: number) => index"
            :pagination="false"
            size="small"
          />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="buckets" tab="🪣 汲桶配置">
        <n-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>汲桶列表 (编号不能重复)</span>
              <n-button type="primary" size="small" @click="openBucketAddModal">+ 添加汲桶</n-button>
            </div>
          </template>

          <n-alert v-if="template.buckets.length === 0" type="warning" :show-icon="true" style="margin-bottom: 16px">
            尚未添加汲桶，请至少添加 1 个汲桶
          </n-alert>

          <n-data-table
            v-else
            :columns="bucketColumns"
            :data="template.buckets"
            :row-key="(row: any, index: number) => index"
            :pagination="false"
            size="small"
          />
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="rules" tab="⚠️ 异常判定规则">
        <n-card>
          <template #header>
            <span>异常判定规则配置</span>
          </template>

          <n-form
            ref="rulesFormRef"
            :model="rulesForm"
            :rules="rulesRules"
            label-placement="left"
            label-width="160px"
            style="max-width: 560px"
          >
            <n-form-item label="超时阈值 (秒)" path="timeoutThreshold">
              <n-input-number v-model:value="rulesForm.timeoutThreshold" :min="1" :max="3600" style="width: 100%" />
              <span style="color: #999; font-size: 12px">提水耗时超过此值判定为超时异常</span>
            </n-form-item>
            <n-form-item label="漏水率阈值 (%)" path="highLeakageThreshold">
              <n-input-number v-model:value="rulesForm.highLeakageThreshold" :min="0" :max="100" :step="0.1" style="width: 100%" />
              <span style="color: #999; font-size: 12px">漏水率超过此值判定为漏水过高</span>
            </n-form-item>
            <n-form-item label="磨损突增阈值 (级)" path="wearSpikeThreshold">
              <n-input-number v-model:value="rulesForm.wearSpikeThreshold" :min="0.1" :max="10" :step="0.1" style="width: 100%" />
              <span style="color: #999; font-size: 12px">单轮磨损较均值增长超过此值判定为磨损突增</span>
            </n-form-item>
            <n-form-item>
              <n-button type="primary" @click="saveRules">保存规则</n-button>
            </n-form-item>
          </n-form>
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="showMetaModal" preset="card" title="模板设置" style="width: 520px">
      <n-form ref="metaFormRef" :model="metaForm" :rules="metaRules" label-placement="left" label-width="100px">
        <n-form-item label="模板名称" path="name">
          <n-input v-model:value="metaForm.name" />
        </n-form-item>
        <n-form-item label="模板描述" path="description">
          <n-input v-model:value="metaForm.description" type="textarea" :rows="3" />
        </n-form-item>
        <n-form-item label="标签" path="tag">
          <n-input v-model:value="metaForm.tag" placeholder="可选：如 标准试验、快速测试 等" />
        </n-form-item>
        <n-form-item label="试验轮次" path="totalRounds">
          <n-input-number v-model:value="metaForm.totalRounds" :min="1" :max="1000" style="width: 100%" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showMetaModal = false">取消</n-button>
          <n-button type="primary" @click="saveMeta">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showComponentModal"
      preset="card"
      :title="editingComponentIndex !== null ? '编辑构件' : '添加构件'"
      style="width: 560px"
    >
      <n-form
        ref="componentFormRef"
        :model="componentForm"
        :rules="componentFormRules"
        label-placement="left"
        label-width="120px"
      >
        <n-form-item label="构件编号" path="componentNo">
          <n-input v-model:value="componentForm.componentNo" placeholder="如 WHL-001" />
          <span style="color: #999; font-size: 12px">同一模板内不能重复</span>
        </n-form-item>
        <n-form-item label="构件类型" path="type">
          <n-select v-model:value="componentForm.type" :options="COMPONENT_TYPE_OPTIONS" />
        </n-form-item>
        <n-form-item label="材质" path="material">
          <n-select
            v-model:value="componentForm.material"
            :options="[
              { label: '硬木（枣木/榆木）', value: 'hardwood' },
              { label: '软木（松木/杨木）', value: 'softwood' },
              { label: '青铜', value: 'bronze' },
              { label: '熟铁', value: 'iron' },
              { label: '石材', value: 'stone' },
              { label: '竹', value: 'bamboo' }
            ]"
            filterable
          />
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="直径 (cm)" path="diameter" :show-label="true">
            <n-input-number v-model:value="componentForm.diameter" :min="0" :max="500" style="width: 100%" />
          </n-form-item>
          <n-form-item label="长度 (cm)" path="length" :show-label="true">
            <n-input-number v-model:value="componentForm.length" :min="0" :max="1000" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="重量 (kg)" path="weight" :show-label="true">
            <n-input-number v-model:value="componentForm.weight" :min="0" :max="500" :step="0.1" style="width: 100%" />
          </n-form-item>
          <n-form-item label="耐磨性 (1-10)" path="wearResistance" :show-label="true">
            <n-input-number v-model:value="componentForm.wearResistance" :min="1" :max="10" style="width: 100%" />
          </n-form-item>
        </n-grid>
        <n-form-item label="备注" path="notes">
          <n-input v-model:value="componentForm.notes" type="textarea" placeholder="可选" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showComponentModal = false">取消</n-button>
          <n-button type="primary" @click="saveComponent">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showRopeModal"
      preset="card"
      :title="editingRopeIndex !== null ? '编辑井绳' : '添加井绳'"
      style="width: 560px"
    >
      <n-form
        ref="ropeFormRef"
        :model="ropeForm"
        :rules="ropeFormRules"
        label-placement="left"
        label-width="120px"
      >
        <n-form-item label="井绳编号" path="ropeNo">
          <n-input v-model:value="ropeForm.ropeNo" placeholder="如 ROP-001" />
          <span style="color: #999; font-size: 12px">同一模板内不能重复</span>
        </n-form-item>
        <n-form-item label="材质" path="material">
          <n-select v-model:value="ropeForm.material" :options="ROPE_MATERIAL_OPTIONS" />
        </n-form-item>
        <n-grid :cols="2" :x-gap="12">
          <n-form-item label="直径 (mm)" path="diameter" :show-label="true">
            <n-input-number v-model:value="ropeForm.diameter" :min="0.1" :max="100" :step="0.1" style="width: 100%" />
          </n-form-item>
          <n-form