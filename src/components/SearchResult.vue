<template>
  <span>
    <template v-if="typeof result === 'string'">{{ result }}</template>
    <template v-else>
      <template v-for="({ text, highlight }, index) in result">
        <span v-if="highlight" :key="index" class="primary--text">{{
          text
        }}</span>
        <template v-else>{{ text }}</template>
      </template>
    </template>
  </span>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component

export default class SearchResult extends Vue {
  @Prop([String, Array]) private readonly result!: string | { text: string; highlight: boolean }[]
}
</script>