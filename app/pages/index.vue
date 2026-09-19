<script setup lang="ts">
const { t } = useLocale()
const { user } = usePortalSession()
useHead(() => ({ title: t('portal') }))
</script>
<template>
  <div class="landing">
    <section class="landing-intro">
      <p class="eyebrow">{{ t('serviceLabel') }}</p>
      <h1>{{ t('portal') }}</h1>
      <p class="lead">{{ t('intro') }}</p>
      <div class="start-actions">
        <ThemeLink class="primary-link" :to="user ? '/organizations' : '/register'"
          >{{ user ? t('organizations') : t('getStarted') }}
          <span aria-hidden="true">→</span></ThemeLink
        >
        <p v-if="!user">
          {{ t('returning') }}
          <ThemeLink to="/login">{{ t('signIn') }}</ThemeLink>
        </p>
      </div>
    </section>
    <section class="landing-process" aria-labelledby="getting-started">
      <h2 id="getting-started">{{ t('howTitle') }}</h2>
      <p class="section-intro">{{ t('howIntro') }}</p>
      <ol class="steps">
        <li>
          <span class="step-number" aria-hidden="true">01</span>
          <h3>{{ t('stepOne') }}</h3>
          <p>{{ t('stepOneText') }}</p>
        </li>
        <li>
          <span class="step-number" aria-hidden="true">02</span>
          <h3>{{ t('stepTwo') }}</h3>
          <p>{{ t('stepTwoText') }}</p>
        </li>
        <li>
          <span class="step-number" aria-hidden="true">03</span>
          <h3>{{ t('stepThree') }}</h3>
          <p>{{ t('stepThreeText') }}</p>
        </li>
      </ol>
    </section>
    <aside class="help-strip">
      <h2>{{ t('helpTitle') }}</h2>
      <p>{{ t('helpText') }}</p>
    </aside>
  </div>
</template>
