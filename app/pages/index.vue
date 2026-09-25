<script setup lang="ts">
const { t } = useLocale()
const { user } = usePortalSession()
useHead(() => ({ title: t('portal') }))
</script>
<template>
  <div class="landing">
    <section class="landing-intro">
      <PortalHeading tag="h1">{{ t('portal') }}</PortalHeading>
      <PortalText>{{ t('intro') }}</PortalText>
      <div class="start-actions">
        <PortalLink variant="button" :to="user ? '/organizations' : '/register'"
          >{{ user ? t('organizations') : t('getStarted') }}
          <span aria-hidden="true">→</span></PortalLink
        >
        <PortalText v-if="!user">
          {{ t('returning') }}
          <PortalLink to="/login">{{ t('signIn') }}</PortalLink>
        </PortalText>
      </div>
    </section>
    <section class="landing-process" :aria-label="t('howTitle')">
      <PortalHeading id="getting-started" tag="h2">{{ t('howTitle') }}</PortalHeading>
      <PortalText text-role="secondary">{{ t('howIntro') }}</PortalText>
      <PortalGrid
        tag="ol"
        columns="1fr"
        columns-desktop="repeat(3, minmax(0, 1fr))"
        gap="300"
        class="steps"
      >
        <li>
          <PortalHeading tag="h3" margin-top="0">{{ t('stepOne') }}</PortalHeading>
          <PortalText>{{ t('stepOneText') }}</PortalText>
        </li>
        <li>
          <PortalHeading tag="h3" margin-top="0">{{ t('stepTwo') }}</PortalHeading>
          <PortalText>{{ t('stepTwoText') }}</PortalText>
        </li>
        <li>
          <PortalHeading tag="h3" margin-top="0">{{ t('stepThree') }}</PortalHeading>
          <PortalText>{{ t('stepThreeText') }}</PortalText>
        </li>
      </PortalGrid>
    </section>
    <aside class="help-strip">
      <PortalHeading tag="h2">{{ t('helpTitle') }}</PortalHeading>
      <PortalText>{{ t('helpText') }}</PortalText>
    </aside>
  </div>
</template>
