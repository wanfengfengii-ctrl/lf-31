import { ref, computed, watch } from 'vue'
import type { RecoveryScheme, TrialTemplate } from '@/types'
import { calcAvailableSchemesList, calcTemplateListForCompare } from '@/services/statistics.service'

export function useAnalysisFilters(
  schemes: () => RecoveryScheme[],
  templates: () => TrialTemplate[] = () => []
) {
  const checkedSchemeIds = ref<string[]>([])
  const checkedTemplateIds = ref<string[]>([])
  const analysisTab = ref('scheme')

  const availableSchemesList = computed(() => calcAvailableSchemesList(schemes()))

  const templateListForCompare = computed(() =>
    calcTemplateListForCompare(templates(), schemes())
  )

  watch(
    availableSchemesList,
    (list) => {
      const enabledIds = list.filter(s => s.hasVisibleTrials).map(s => s.id)
      const cleaned = checkedSchemeIds.value.filter(id => enabledIds.includes(id))
      if (cleaned.length !== checkedSchemeIds.value.length) {
        checkedSchemeIds.value = cleaned
      }
    },
    { immediate: true, deep: true }
  )

  const selectedSchemes = computed((): RecoveryScheme[] => {
    return schemes().filter(s =>
      checkedSchemeIds.value.includes(s.id) && s.trials.some(t => !t.hidden)
    )
  })

  function toggleScheme(id: string) {
    const idx = checkedSchemeIds.value.indexOf(id)
    if (idx === -1) {
      checkedSchemeIds.value.push(id)
    } else {
      checkedSchemeIds.value.splice(idx, 1)
    }
  }

  function clearAllSchemes() {
    checkedSchemeIds.value = []
  }

  function clearAllTemplates() {
    checkedTemplateIds.value = []
  }

  return {
    analysisTab,
    checkedSchemeIds,
    checkedTemplateIds,
    availableSchemesList,
    templateListForCompare,
    selectedSchemes,
    toggleScheme,
    clearAllSchemes,
    clearAllTemplates
  }
}
