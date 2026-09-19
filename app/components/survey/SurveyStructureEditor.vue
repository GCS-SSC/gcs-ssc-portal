<script setup lang="ts">
import type {
  StructuredSurvey,
  SurveyDestination,
  SurveyPage,
  SurveyQuestion
} from '@gcs-ssc/survey'
import SurveyContainerEditor from './SurveyContainerEditor.vue'
import SurveyConditionEditor from './SurveyConditionEditor.vue'
const model = defineModel<StructuredSurvey>({ required: true })
const { s } = useSurveyLocale(),
  { locale } = useLocale()
const id = () => `g_${crypto.randomUUID().replaceAll('-', '')}`
const sources = (containerId: string, include = false): SurveyQuestion[] => {
  const ids: string[] = []
  for (const page of model.value.pages) {
    if (page.id === containerId && !include) break
    ids.push(...page.questionIds)
    for (const section of page.sections) {
      if (section.id === containerId)
        return model.value.questions.filter((question) => ids.includes(question.id))
      ids.push(...section.questionIds)
      for (const subsection of section.subsections) {
        if (subsection.id === containerId)
          return model.value.questions.filter((question) => ids.includes(question.id))
        ids.push(...subsection.questionIds)
      }
    }
    if (page.id === containerId) break
  }
  return model.value.questions.filter((question) => ids.includes(question.id))
}
const addPage = () =>
  model.value.pages.push({
    id: id(),
    title: {
      en: `Page ${model.value.pages.length + 1}`,
      fr: `Page ${model.value.pages.length + 1}`
    },
    questionIds: [],
    sections: [],
    branches: []
  })
const addSection = (page: SurveyPage) =>
  page.sections.push({
    id: id(),
    title: { en: `Section ${page.sections.length + 1}`, fr: `Section ${page.sections.length + 1}` },
    questionIds: [],
    subsections: []
  })
const targetValue = (target?: SurveyDestination) =>
  target?.kind === 'page' ? `page:${target.pageId}` : target?.kind === 'end' ? 'end' : 'next'
const destination = (value: string): SurveyDestination | undefined =>
  value === 'next'
    ? undefined
    : value === 'end'
      ? { kind: 'end' }
      : { kind: 'page', pageId: value.slice(5) }
const targets = (index: number, defaultRoute = false) => [
  ...(defaultRoute ? [{ value: 'next', label: s('nextInOrder') }] : []),
  ...model.value.pages
    .slice(index + 1)
    .map((page) => ({ value: `page:${page.id}`, label: page.title[locale.value] })),
  { value: 'end', label: s('endSurvey') }
]
const addBranch = (page: SurveyPage) =>
  page.branches.push({
    when: {
      match: 'all',
      conditions: [{ questionId: sources(page.id, true)[0]!.id, operator: 'answered' }]
    },
    destination: { kind: 'end' }
  })
const move = <T,>(items: T[], index: number, direction: number) => {
  const next = index + direction
  if (next >= 0 && next < items.length) [items[index], items[next]] = [items[next]!, items[index]!]
}
const pageRemovable = (page: SurveyPage) =>
  model.value.pages.length > 1 &&
  !page.questionIds.length &&
  !page.sections.length &&
  !model.value.pages.some((item) =>
    [item.next, ...item.branches.map((branch) => branch.destination)].some(
      (target) => target?.kind === 'page' && target.pageId === page.id
    )
  )
</script>
<template>
  <section class="content-section">
    <h2>{{ s('structure') }}</h2>
    <p>{{ s('structureHint') }}</p>
    <details
      v-for="(page, pageIndex) in model.pages"
      :key="page.id"
      data-survey-page
      class="content-section"
    >
      <summary>{{ s('page') }} {{ pageIndex + 1 }}: {{ page.title[locale] }}</summary>
      <SurveyContainerEditor :model-value="page" />
      <div class="form-actions">
        <ThemeButton
          variant="link"
          :disabled="pageIndex === 0"
          @click="move(model.pages, pageIndex, -1)"
          >{{ s('up') }}</ThemeButton
        >
        <ThemeButton
          variant="link"
          :disabled="pageIndex === model.pages.length - 1"
          @click="move(model.pages, pageIndex, 1)"
          >{{ s('down') }}</ThemeButton
        >
        <ThemeButton
          variant="link"
          :disabled="!pageRemovable(page)"
          @click="model.pages.splice(pageIndex, 1)"
          >{{ s('removePage') }}</ThemeButton
        >
      </div>
      <details
        v-for="(section, sectionIndex) in page.sections"
        :key="section.id"
        class="content-section"
      >
        <summary>{{ s('section') }}: {{ section.title[locale] }}</summary>
        <SurveyContainerEditor :model-value="section" :sources="sources(section.id)" />
        <div class="form-actions">
          <ThemeButton
            variant="link"
            :disabled="sectionIndex === 0"
            @click="move(page.sections, sectionIndex, -1)"
            >{{ s('up') }}</ThemeButton
          >
          <ThemeButton
            variant="link"
            :disabled="sectionIndex === page.sections.length - 1"
            @click="move(page.sections, sectionIndex, 1)"
            >{{ s('down') }}</ThemeButton
          >
          <ThemeButton
            variant="link"
            :disabled="Boolean(section.questionIds.length || section.subsections.length)"
            @click="page.sections.splice(sectionIndex, 1)"
            >{{ s('removeSection') }}</ThemeButton
          >
        </div>
        <details
          v-for="(subsection, subIndex) in section.subsections"
          :key="subsection.id"
          class="content-section"
        >
          <summary>{{ s('subsection') }}: {{ subsection.title[locale] }}</summary>
          <SurveyContainerEditor :model-value="subsection" :sources="sources(subsection.id)" />
          <div class="form-actions">
            <ThemeButton
              variant="link"
              :disabled="subIndex === 0"
              @click="move(section.subsections, subIndex, -1)"
              >{{ s('up') }}</ThemeButton
            >
            <ThemeButton
              variant="link"
              :disabled="subIndex === section.subsections.length - 1"
              @click="move(section.subsections, subIndex, 1)"
              >{{ s('down') }}</ThemeButton
            >
            <ThemeButton
              variant="link"
              :disabled="Boolean(subsection.questionIds.length)"
              @click="section.subsections.splice(subIndex, 1)"
              >{{ s('removeSubsection') }}</ThemeButton
            >
          </div>
        </details>
        <ThemeButton
          variant="secondary"
          :disabled="section.subsections.length >= 20"
          @click="
            section.subsections.push({
              id: id(),
              title: {
                en: `Subsection ${section.subsections.length + 1}`,
                fr: `Sous-section ${section.subsections.length + 1}`
              },
              questionIds: []
            })
          "
          >{{ s('addSubsection') }}</ThemeButton
        >
      </details>
      <ThemeButton
        variant="secondary"
        :disabled="page.sections.length >= 20"
        @click="addSection(page)"
        >{{ s('addSection') }}</ThemeButton
      >
      <h3>{{ s('branching') }}</h3>
      <p>{{ s('branchHint') }}</p>
      <ol>
        <li
          v-for="(branch, branchIndex) in page.branches"
          :key="branchIndex"
          class="content-section"
        >
          <SurveyConditionEditor
            :model-value="branch.when"
            :sources="sources(page.id, true)"
            :prefix="`${page.id}-branch-${branchIndex}`"
            required-condition
            @update:model-value="
              (value) => {
                if (value) branch.when = value
              }
            "
          />
          <ThemeSelect
            :id="`${page.id}-target-${branchIndex}`"
            :model-value="targetValue(branch.destination)"
            :label="s('goTo')"
            :options="targets(pageIndex)"
            required
            @update:model-value="
              (value) => {
                const target = destination(value)
                if (target) branch.destination = target
              }
            "
          />
          <div class="form-actions">
            <ThemeButton
              variant="link"
              :disabled="branchIndex === 0"
              @click="move(page.branches, branchIndex, -1)"
              >{{ s('up') }}</ThemeButton
            >
            <ThemeButton
              variant="link"
              :disabled="branchIndex === page.branches.length - 1"
              @click="move(page.branches, branchIndex, 1)"
              >{{ s('down') }}</ThemeButton
            >
            <ThemeButton variant="link" @click="page.branches.splice(branchIndex, 1)">{{
              s('removeBranch')
            }}</ThemeButton>
          </div>
        </li>
      </ol>
      <ThemeButton
        variant="secondary"
        :disabled="!sources(page.id, true).length || page.branches.length >= 20"
        @click="addBranch(page)"
        >{{ s('addBranch') }}</ThemeButton
      >
      <ThemeSelect
        :id="`${page.id}-default`"
        :model-value="targetValue(page.next)"
        :label="s('otherwise')"
        :options="targets(pageIndex, true)"
        required
        @update:model-value="(value) => (page.next = destination(value))"
      />
    </details>
    <ThemeButton variant="secondary" :disabled="model.pages.length >= 20" @click="addPage">{{
      s('addPage')
    }}</ThemeButton>
  </section>
</template>
